import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createHash, randomBytes } from 'node:crypto'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { BETWEEN_EMAILS_DELAY_MS, sendWithRetry, wait } from '@/lib/email-delivery'
import { documentReminderEmail, formatDeadline, resolveReminderDeadline } from '@/lib/reminder-emails'
import { deleteDocumentPortal } from '@/lib/delete-document-portal'

export const maxDuration = 300

const schema = z.object({ portalIds: z.array(z.string().uuid()).min(1).max(300) })
const DEFAULT_ROLE = 'Accounts Payable Clerk'

export async function POST(request: Request) {
  const session = await createClient()
  const { data: { user } } = await session.auth.getUser()
  if (!user?.email?.toLowerCase().endsWith('@care-intrenational.org')) return NextResponse.json({ error: 'Admin sign-in required.' }, { status: 401 })
  const parsed = schema.safeParse(await request.json().catch(() => ({})))
  if (!parsed.success) return NextResponse.json({ error: 'Select at least one applicant.' }, { status: 400 })
  if (!process.env.RESEND_API_KEY) return NextResponse.json({ error: 'Email service is not configured.' }, { status: 500 })

  const supabase = createAdminClient()
  const { data: portals, error } = await supabase.from('applicant_document_portals').select('id,applicant_email,role,status,deadline_at,reminder_count').in('id', parsed.data.portalIds).neq('status', 'documents_received')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const resend = new Resend(process.env.RESEND_API_KEY)
  const failedEmails: string[] = []
  const cleanupFailed: string[] = []
  let sent = 0
  let deleted = 0
  const list = portals || []
  for (let index = 0; index < list.length; index += 1) {
    const portal = list[index]
    const email = portal.applicant_email.toLowerCase()

    if ((portal.reminder_count || 0) >= 2) {
      try {
        await deleteDocumentPortal(supabase, portal.id)
        deleted += 1
      } catch {
        cleanupFailed.push(email)
      }
      continue
    }

    const token = randomBytes(32).toString('hex')
    const deadline = resolveReminderDeadline(portal.deadline_at)
    try {
      const result = await sendWithRetry(() => resend.emails.send({ from: 'CARE International <careers@care-intrenational.org>', to: [email], subject: `Reminder: submit your supporting documents - ${portal.role || DEFAULT_ROLE}`, html: documentReminderEmail({ role: portal.role || DEFAULT_ROLE, portalUrl: `https://assessment.care-intrenational.org/documents/${token}`, deadline: formatDeadline(deadline.isoDate) }) }))
      if (result.error) throw new Error(result.error.message)
      const now = new Date().toISOString()
      const { error: updateError } = await supabase.from('applicant_document_portals').update({ access_token_hash: createHash('sha256').update(token).digest('hex'), last_reminder_at: now, updated_at: now, reminder_count: (portal.reminder_count || 0) + 1, ...(deadline.extended ? { deadline_at: deadline.isoDate } : {}) }).eq('id', portal.id)
      if (updateError) throw new Error(updateError.message)
      sent += 1
      if ((portal.reminder_count || 0) + 1 >= 2) {
        try {
          await deleteDocumentPortal(supabase, portal.id)
          deleted += 1
        } catch {
          cleanupFailed.push(email)
        }
      }
    } catch {
      failedEmails.push(email)
    }
    if (index < list.length - 1) await wait(BETWEEN_EMAILS_DELAY_MS)
  }
  return NextResponse.json({ sent, deleted, cleanupFailed, failedEmails, skipped: parsed.data.portalIds.length - list.length })
}
