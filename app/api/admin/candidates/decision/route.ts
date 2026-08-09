import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const schema = z.object({ submissionId: z.string().uuid(), decision: z.enum(['passed', 'not_passed']) })
const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email?.toLowerCase().endsWith('@care-intrenational.org')) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  const parsed = schema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: 'Invalid candidate decision.' }, { status: 400 })

  const { data: candidate, error: candidateError } = await supabase.from('assessment_submissions').select('id,full_name,email,decision_status').eq('id', parsed.data.submissionId).single()
  if (candidateError || !candidate) return NextResponse.json({ error: 'Candidate not found.' }, { status: 404 })

  await supabase.from('assessment_submissions').update({ decision_status: parsed.data.decision, decision_at: new Date().toISOString(), notification_status: 'sending', notification_error: null }).eq('id', candidate.id)
  const passed = parsed.data.decision === 'passed'
  const subject = passed ? 'CARE International assessment update' : 'CARE International assessment outcome'
  const text = passed ? `Dear ${candidate.full_name},\n\nThank you for completing your assessment. We are pleased to let you know that you have passed this stage of the process. Our team will be in touch with next steps.\n\nKind regards,\nCARE International` : `Dear ${candidate.full_name},\n\nThank you for completing your assessment and for your interest in CARE International. After careful review, we will not be progressing your application at this stage. We appreciate the time you invested and wish you well.\n\nKind regards,\nCARE International`
  const html = `<p>Dear ${candidate.full_name},</p><p>${passed ? 'Thank you for completing your assessment. We are pleased to let you know that you have passed this stage of the process. Our team will be in touch with next steps.' : 'Thank you for completing your assessment and for your interest in CARE International. After careful review, we will not be progressing your application at this stage. We appreciate the time you invested and wish you well.'}</p><p>Kind regards,<br />CARE International</p>`

  try {
    const { error: sendError } = await resend.emails.send({ from: 'CARE International <careers@care-intrenational.org>', to: [candidate.email.trim()], subject, html, text })
    if (sendError) throw new Error(sendError.message)
    await supabase.from('assessment_submissions').update({ notification_status: 'sent', notification_error: null, notified_at: new Date().toISOString() }).eq('id', candidate.id)
    return NextResponse.json({ message: `Decision email sent to ${candidate.email}.` })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to send decision email.'
    await supabase.from('assessment_submissions').update({ notification_status: 'failed', notification_error: message }).eq('id', candidate.id)
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
