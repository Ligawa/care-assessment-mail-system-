import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { interviewInvitationEmail } from '@/lib/interview-invitation-email'

const schema = z.object({ role: z.string().trim().min(2).max(160), emails: z.array(z.string().email()).min(1).max(250) })

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 })
  const parsed = schema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: 'Select a role and enter valid applicant email addresses.' }, { status: 400 })
  const deadline = new Date(); deadline.setDate(deadline.getDate() + 1)
  const deadlineAt = deadline.toISOString().slice(0, 10)
  const deadlineLabel = deadline.toLocaleDateString('en-GB')
  const origin = 'https://assessment.care-intrenational.org'
  const rows = parsed.data.emails.map(email => ({ access_code: `INT-${crypto.randomUUID().slice(0, 10).toUpperCase()}`, candidate_name: null, candidate_email: email.toLowerCase(), role: parsed.data.role, status: 'invited', decision_status: 'pending', transcript: [], assessment: null, completed_at: null, deadline_at: deadlineAt }))
  const { data: created, error } = await supabase.from('interview_sessions').insert(rows).select('access_code,candidate_email')
  if (error || !created) return NextResponse.json({ error: error?.message || 'Could not create interview invitations.' }, { status: 500 })
  let sent = 0
  if (process.env.RESEND_API_KEY) {
    const resend = new Resend(process.env.RESEND_API_KEY)
    for (const invite of created) { const result = await resend.emails.send({ from: 'CARE International <careers@care-intrenational.org>', to: [invite.candidate_email], subject: `Invitation to AI-powered interview - ${parsed.data.role}`, html: interviewInvitationEmail({ role: parsed.data.role, deadline: deadlineLabel, url: `${origin}/interview/${invite.access_code}` }) }); if (!result.error) sent++ }
  }
  return NextResponse.json({ created: created.length, sent, deadline: deadlineLabel })
}
