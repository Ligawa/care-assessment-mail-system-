'use client'

import { useState } from 'react'

export default function InterviewLinkCreator({ positions }: { positions: { id: string; title: string; status: string }[] }) {
  const [role, setRole] = useState('')
  const [emails, setEmails] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  async function createInvitations(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage('')
    const recipients = [...new Set(emails.split(/[\s,;]+/).map(email => email.trim().toLowerCase()).filter(Boolean))]
    const response = await fetch('/api/admin/interviews/create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role, emails: recipients }) })
    const data = await response.json().catch(() => ({}))
    setMessage(response.ok ? `${data.sent} of ${data.created} interview invitation${data.created === 1 ? '' : 's'} sent. Interviews are due by ${data.deadline}.` : data.error || 'Could not send interview invitations.')
    if (response.ok) setEmails(''); setBusy(false)
  }
  return <section className="rounded-[28px] border border-[#ded8ca] bg-white p-6"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#f47700]">AI interview invitations</p><h2 className="mt-2 text-2xl font-semibold text-[#101b30]">Invite several applicants</h2><p className="mt-2 text-[#455c7d]">Applicants must share the same position. Each applicant gets an individual interview link and the exact next-day deadline.</p><form onSubmit={createInvitations} className="mt-6 grid gap-4"><label className="grid gap-2 text-sm font-semibold text-[#101b30]">Position<select required value={role} onChange={event => setRole(event.target.value)} className="h-11 rounded-xl border border-[#ded8ca] bg-white px-3 font-normal"><option value="">Select one position</option>{positions.filter(position => position.status !== 'archived').map(position => <option key={position.id} value={position.title}>{position.title}</option>)}</select></label><label className="grid gap-2 text-sm font-semibold text-[#101b30]">Applicant email addresses <span className="font-normal text-[#455c7d]">Separate addresses with commas, spaces, or new lines.</span><textarea required rows={5} value={emails} onChange={event => setEmails(event.target.value)} placeholder="applicant.one@example.com\napplicant.two@example.com" className="rounded-xl border border-[#ded8ca] px-3 py-3 font-normal" /></label><button disabled={busy} className="rounded-xl bg-[#f47700] px-5 py-3 font-semibold text-white disabled:opacity-50">{busy ? 'Sending invitations…' : 'Create links & send invitations'}</button></form>{message && <p className="mt-4 rounded-xl bg-[#edf7ef] p-3 text-sm font-semibold text-[#28704d]" role="status">{message}</p>}</section>
}
