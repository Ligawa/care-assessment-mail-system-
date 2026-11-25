import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { appendContactPhoneHtml, appendContactPhoneText } from '@/lib/email-contact'

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!)
const dateFormat = new Intl.DateTimeFormat('en-GB', { dateStyle: 'long', timeZone: 'UTC' })

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email?.toLowerCase().endsWith('@care-intrenational.org')) {
    return NextResponse.json({ error: 'Your admin session is not authorized to send offer reminders.' }, { status: 401 })
  }
  if (!process.env.RESEND_API_KEY) return NextResponse.json({ error: 'Email delivery is not configured.' }, { status: 503 })

  const { id } = await params
  const admin = createAdminClient()
  const { data: candidate, error: candidateError } = await admin
    .from('assessment_submissions')
    .select('id,full_name,email,offer_job_title,offer_hr_reference,offer_document_deadline,offer_status,offer_response_status')
    .eq('id', id)
    .eq('offer_status', 'sent')
    .maybeSingle()
  if (candidateError) return NextResponse.json({ error: 'Could not verify the offer.' }, { status: 500 })
  if (!candidate) return NextResponse.json({ error: 'Candidate offer not found.' }, { status: 404 })
  if (candidate.offer_response_status === 'declined' || candidate.offer_response_status === 'withdrawn') {
    return NextResponse.json({ error: 'Reminders are disabled for declined or withdrawn offers.' }, { status: 409 })
  }

  const { data: checklist, error: checklistError } = await admin
    .from('offer_document_submissions')
    .select('document_label,status,reminder_count')
    .eq('submission_id', id)
  if (checklistError) return NextResponse.json({ error: 'Could not load the offer document checklist.' }, { status: 500 })
  const pending = (checklist ?? []).filter((item) => item.status === 'pending')
  if (!pending.length) return NextResponse.json({ error: 'There are no outstanding offer documents to remind the candidate about.' }, { status: 409 })

  const reference = candidate.offer_hr_reference || 'your conditional offer'
  const role = candidate.offer_job_title || 'the offered position'
  const greeting = escapeHtml(candidate.full_name)
  const safeReference = escapeHtml(reference)
  const safeRole = escapeHtml(role)
  const pendingHtml = pending.map((item) => `<li>${escapeHtml(item.document_label)}</li>`).join('')
  const pendingText = pending.map((item) => `- ${item.document_label}`).join('\n')
  const deadline = candidate.offer_document_deadline
    ? `Please send them by ${dateFormat.format(new Date(`${candidate.offer_document_deadline}T00:00:00Z`))}.`
    : 'Please reply as soon as you can.'
  const text = appendContactPhoneText(`Dear ${candidate.full_name},\n\nThis is a reminder regarding your conditional offer for ${role} (${reference}). We have not yet confirmed receipt of the following items:\n\n${pendingText}\n\n${deadline} Please reply to the original offer email with the signed offer letter and document copies/translations.\n\nKind regards,\nCARE International`)
  const html = appendContactPhoneHtml(`<div style="font-family:Arial,Helvetica,sans-serif;color:#25344b;line-height:1.6"><p>Dear ${greeting},</p><p>This is a reminder regarding your conditional offer for <strong>${safeRole}</strong> (${safeReference}). We have not yet confirmed receipt of the following items:</p><ul>${pendingHtml}</ul><p>${escapeHtml(deadline)} Please reply to the original offer email with the signed offer letter and document copies or translations.</p><p>Kind regards,<br>CARE International</p></div>`)

  const result = await new Resend(process.env.RESEND_API_KEY).emails.send({
    from: 'CARE International <hr@care-intrnational.org>',
    to: [candidate.email],
    subject: `Reminder: outstanding offer documents | ${reference}`,
    text,
    html,
  })
  if (result.error) return NextResponse.json({ error: 'Email could not be sent. Please try again.' }, { status: 502 })

  const now = new Date().toISOString()
  const reminderCount = Math.max(0, ...(checklist ?? []).map((item) => item.reminder_count ?? 0)) + 1
  const { error: trackingError } = await admin
    .from('offer_document_submissions')
    .update({ reminder_count: reminderCount, last_reminder_at: now })
    .eq('submission_id', id)
  if (trackingError) return NextResponse.json({ error: 'Reminder was sent, but its history could not be saved.' }, { status: 500 })

  return NextResponse.json({ lastReminderAt: now, reminderCount })
}
