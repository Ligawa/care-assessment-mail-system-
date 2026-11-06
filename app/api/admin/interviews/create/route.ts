import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { interviewInvitationEmail } from '@/lib/interview-invitation-email'
import { BETWEEN_EMAILS_DELAY_MS, sendWithRetry, wait } from '@/lib/email-delivery'

const schema = z.object({ role: z.string().trim().min(2).max(160), emails: z.array(z.string().email()).min(1).max(300) })

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
  const failures: string[] = []
  if (process.env.RESEND_API_KEY) {
    const resend = new Resend(process.env.RESEND_API_KEY)
    for (let index = 0; index < created.length; index += 1) { const invite = created[index]; try { const result = await sendWithRetry(() => resend.emails.send({ from: 'CARE International <careers@care-intrenational.org>', to: [invite.candidate_email], subject: `Invitation to AI-powered interview - ${parsed.data.role}`, html: interviewInvitationEmail({ role: parsed.data.role, deadline: deadlineLabel, url: `${origin}/interview/${invite.access_code}` }) })); if (!result.error) sent++; else failures.push(invite.candidate_email) } catch { failures.push(invite.candidate_email) } if (index < created.length - 1) await wait(BETWEEN_EMAILS_DELAY_MS) }
  } else failures.push(...created.map(invite => invite.candidate_email))
  return NextResponse.json({ created: created.length, sent, failedEmails: failures, deadline: deadlineLabel })
}
