import { Resend } from 'resend'
import { createHash, randomBytes } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { documentReminderEmail, formatDeadline, resolveReminderDeadline } from '@/lib/reminder-emails'
import { deleteDocumentPortal } from '@/lib/delete-document-portal'

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await createClient()
  const { data: { user } } = await session.auth.getUser()
  if (!user?.email?.toLowerCase().endsWith('@care-intrenational.org')) return NextResponse.json({ error: 'Admin sign-in required.' }, { status: 401 })
  const { id } = await params
  const supabase = createAdminClient()
  const { data: portal } = await supabase.from('applicant_document_portals').select('id,applicant_name,applicant_email,role,status,deadline_at,reminder_count').eq('id', id).maybeSingle()
  if (!portal) return NextResponse.json({ error: 'Applicant portal not found.' }, { status: 404 })
  if ((portal.reminder_count || 0) >= 2) {
    try {
      const deletedFiles = await deleteDocumentPortal(supabase, id)
      return NextResponse.json({ ok: true, deleted: true, deletedFiles })
    } catch {
      return NextResponse.json({ error: 'The second reminder was already sent, but applicant cleanup could not finish. Retry cleanup by sending a reminder again.' }, { status: 500 })
    }
  }
  if (!process.env.RESEND_API_KEY) return NextResponse.json({ error: 'Email service is not configured.' }, { status: 500 })
  const token = randomBytes(32).toString('hex')
  const portalUrl = `https://assessment.care-intrenational.org/documents/${token}`
  await supabase.from('applicant_document_portals').update({ access_token_hash: createHash('sha256').update(token).digest('hex') }).eq('id', id)
  const deadline = resolveReminderDeadline(portal.deadline_at)
  const result = await new Resend(process.env.RESEND_API_KEY).emails.send({ from: 'CARE International <careers@care-intrenational.org>', to: [portal.applicant_email], subject: `Reminder: submit your supporting documents - ${portal.role || 'Accounts Payable Clerk'}`, html: documentReminderEmail({ role: portal.role || 'Accounts Payable Clerk', portalUrl, deadline: formatDeadline(deadline.isoDate) }) })
  if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 })
  const nextReminderCount = (portal.reminder_count || 0) + 1
  const now = new Date().toISOString()
  const { error: updateError } = await supabase.from('applicant_document_portals').update({ last_reminder_at: now, updated_at: now, reminder_count: nextReminderCount, ...(deadline.extended ? { deadline_at: deadline.isoDate } : {}) }).eq('id', id)
  if (updateError) return NextResponse.json({ error: 'The reminder was sent, but its status could not be saved. Contact support before retrying.' }, { status: 500 })
  if (nextReminderCount >= 2) {
    try {
      const deletedFiles = await deleteDocumentPortal(supabase, id)
      return NextResponse.json({ ok: true, deleted: true, deletedFiles })
    } catch {
      return NextResponse.json({ error: 'The second reminder was sent, but applicant cleanup could not finish. Retry cleanup by sending a reminder again.' }, { status: 500 })
    }
  }
  return NextResponse.json({ ok: true, deleted: false })
}
