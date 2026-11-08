'use client'

import Link from 'next/link'
import { useState } from 'react'
import TestEmailButton from '@/components/test-email-button'

const reference = () => `APC-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`

export default function DocumentPortalManager() {
  const [emails, setEmails] = useState('')
  const [role, setRole] = useState('Accounts Payable Clerk')
  const [message, setMessage] = useState('')
  const [link, setLink] = useState('')
  const [sending, setSending] = useState(false)

  async function sendInvites(event: React.FormEvent) {
    event.preventDefault()
    const recipients = [...new Set(emails.split(/[\s,;]+/).map(email => email.trim().toLowerCase()).filter(Boolean))]
    if (!recipients.length) return setMessage('Enter at least one applicant email address.')
    setSending(true); setMessage(`Sending ${recipients.length} document invitation${recipients.length === 1 ? '' : 's'}…`); setLink('')
    const results: { email: string; ok: boolean; data: { emailSent?: boolean; duplicate?: boolean } }[] = []
    for (const applicantEmail of recipients) { let result = { ok: false, data: {} as { emailSent?: boolean } }; for (let attempt = 0; attempt < 3 && !result.ok; attempt += 1) { try { const response = await fetch('/api/document-portal', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ applicantName: 'Applicant', applicantEmail, role, applicationReference: reference() }) }); result = { ok: response.ok, data: await response.json() }; } catch { result = { ok: false, data: {} } } if (!result.ok && attempt < 2) await new Promise(resolve => setTimeout(resolve, 750 * (attempt + 1))) } results.push({ email: applicantEmail, ...result }); if (applicantEmail !== recipients[recipients.length - 1]) await new Promise(resolve => setTimeout(resolve, 350)) }
    const sent = results.filter(result => result.ok && result.data.emailSent).length
    const skipped = results.filter(result => result.ok && result.data.duplicate).length
    const failed = results.filter(result => !result.ok).map(result => result.email)
    setMessage(`${sent} of ${recipients.length} invitation${recipients.length === 1 ? '' : 's'} sent.${skipped ? ` ${skipped} duplicate request${skipped === 1 ? '' : 's'} skipped.` : ''}${failed.length ? ` ${failed.length} failed and remain in the textbox for retry.` : ''}`)
    setEmails(failed.join('\n')); setSending(false)
  }

  return <section className="rounded-3xl border border-[#ded8ca] bg-white p-6"><p className="text-sm font-bold uppercase tracking-[0.18em] text-[#f47700]">Document requests</p><h2 className="mt-2 text-2xl font-semibold text-[#101b30]">Invite applicants to upload documents</h2><p className="mt-2 text-sm leading-6 text-[#455c7d]">Send individually or in bulk. Each email receives its own secure portal and automatically generated application reference. Applicant names are not required for bulk invitations.</p><div className="mt-4 flex flex-wrap gap-3"><Link href="/admin/interviews" className="inline-flex rounded-xl border border-[#f47700] px-4 py-2 text-sm font-semibold text-[#f47700]">Invite applicant to AI interview</Link><Link href="/admin/templates" className="inline-flex rounded-xl border border-[#ded8ca] px-4 py-2 text-sm font-semibold text-[#173f35]">View email templates</Link></div><form onSubmit={sendInvites} className="mt-5 grid gap-4"><label className="grid gap-2 text-sm font-semibold text-[#173f35]">Applicant email addresses <span className="font-normal text-[#455c7d]">Separate multiple addresses with commas, spaces, or new lines.</span><textarea required rows={5} value={emails} onChange={event => setEmails(event.target.value)} placeholder="applicant.one@example.com\napplicant.two@example.com" className="rounded-xl border border-[#ded8ca] px-3 py-3 font-normal" /></label><label className="grid gap-2 text-sm font-semibold text-[#173f35]">Position<input value={role} onChange={event => setRole(event.target.value)} className="h-11 rounded-xl border border-[#ded8ca] px-3 font-normal" /></label><TestEmailButton type="document" role={role} /><button type="submit" disabled={sending} className="h-11 rounded-xl bg-[#f47700] px-4 font-semibold text-white disabled:opacity-50">{sending ? 'Sending invitations…' : 'Generate portals & send invitations'}</button></form>{message && <p className="mt-4 text-sm font-semibold text-[#36835d]" role="status">{message}</p>}{link && <p className="mt-4 break-all rounded-xl bg-[#f7f8f6] p-4 text-sm text-[#455c7d]">{link}</p>}</section>
}
