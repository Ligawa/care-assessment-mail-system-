import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { BETWEEN_EMAILS_DELAY_MS, sendWithRetry, wait } from '@/lib/email-delivery'
import { formatDeadline, interviewReminderEmail, resolveReminderDeadline } from '@/lib/reminder-emails'

export const maxDuration = 300

const schema = z.object({ sessionIds: z.array(z.string().uuid()).min(1).max(300) })

export async function POST(request: Request) {
  const session = await createClient()
  const { data: { user } } = await session.auth.getUser()
  if (!user?.email?.toLowerCase().endsWith('@care-intrenational.org')) return NextResponse.json({ error: 'Admin sign-in required.' }, { status: 401 })
  const parsed = schema.safeParse(await request.json().catch(() => ({})))
  if (!parsed.success) return NextResponse.json({ error: 'Select at least one candidate.' }, { status: 400 })
  if (!process.env.RESEND_API_KEY) return NextResponse.json({ error: 'Email service is not configured.' }, { status: 500 })

  const supabase = createAdminClient()
  const { data: sessions, error } = await supabase.from('interview_sessions').select('id,access_code,candidate_email,role,deadline_at,reminder_count').in('id', parsed.data.sessionIds).is('completed_at', null)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const resend = new Resend(process.env.RESEND_API_KEY)
  const failedEmails: string[] = []
  let sent = 0
  const list = (sessions || []).filter(item => item.candidate_email)
  for (let index = 0; index < list.length; index += 1) {
    const item = list[index]
    const email = item.candidate_email.toLowerCase()
    const deadline = resolveReminderDeadline(item.deadline_at)
    const role = item.role || 'Accounts Payable Clerk'
    try {
      const result = await sendWithRetry(() => resend.emails.send({ from: 'CARE International <careers@care-intrenational.org>', to: [email], subject: `Reminder: complete your AI-powered interview - ${role}`, html: interviewReminderEmail({ role, url: `https://assessment.care-intrenational.org/interview/${item.access_code}`, deadline: formatDeadline(deadline.isoDate) }) }))
      if (result.error) throw new Error(result.error.message)
      const { error: updateError } = await supabase.from('interview_sessions').update({ last_reminder_at: new Date().toISOString(), reminder_count: (item.reminder_count || 0) + 1, ...(deadline.extended ? { deadline_at: deadline.isoDate } : {}) }).eq('id', item.id)
      if (updateError) throw new Error(updateError.message)
      sent += 1
    } catch {
      failedEmails.push(email)
    }
    if (index < list.length - 1) await wait(BETWEEN_EMAILS_DELAY_MS)
  }
  return NextResponse.json({ sent, failedEmails, skipped: parsed.data.sessionIds.length - list.length })
}
