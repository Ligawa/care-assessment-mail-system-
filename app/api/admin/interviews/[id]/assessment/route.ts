import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email?.toLowerCase().endsWith('@care-intrenational.org')) return NextResponse.json({ error: 'Staff access required.' }, { status: 403 })
  if (!process.env.RESEND_API_KEY) return NextResponse.json({ error: 'Email service is not configured.' }, { status: 500 })
  const { id } = await params
  const parsed = z.object({ assessmentId: z.string().uuid() }).safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: 'Choose an assessment.' }, { status: 400 })
  const [{ data: interview }, { data: assessment }] = await Promise.all([
    supabase.from('interview_sessions').select('candidate_name,candidate_email,role').eq('id', id).maybeSingle(),
    supabase.from('assessment_roles').select('title,access_code').eq('id', parsed.data.assessmentId).maybeSingle(),
  ])
  if (!interview?.candidate_email) return NextResponse.json({ error: 'This interview has no applicant email.' }, { status: 400 })
  if (!assessment) return NextResponse.json({ error: 'Assessment not found.' }, { status: 404 })
  const origin = new URL(request.url).origin
  const link = `${origin}/assessment/${assessment.access_code}`
  const resend = new Resend(process.env.RESEND_API_KEY)
  const result = await resend.emails.send({ from: 'CARE International <careers@care-intrenational.org>', to: [interview.candidate_email], subject: `Skills assessment for ${interview.role}`, text: `Hello ${interview.candidate_name || 'there'},\n\nPlease complete the ${assessment.title} skills assessment for the ${interview.role} position:\n${link}\n\nCARE International Recruitment Team` })
  if (result.error) return NextResponse.json({ error: result.error.message }, { status: 502 })
  return NextResponse.json({ ok: true })
}
