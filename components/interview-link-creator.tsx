'use client'

import { useState } from 'react'

export default function InterviewLinkCreator() {
  const [candidateName, setCandidateName] = useState('')
  const [candidateEmail, setCandidateEmail] = useState('')
  const [role, setRole] = useState('')
  const [link, setLink] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function createLink(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(''); setLink('')
    const response = await fetch('/api/admin/interviews/create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ candidateName, candidateEmail, role }) })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) setError(data.error || 'Could not create interview link.')
    else { setLink(data.url); setCandidateName(''); setCandidateEmail(''); setRole('') }
    setBusy(false)
  }

  return <section className="rounded-[28px] border border-[#ded8ca] bg-white p-6"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#f47700]">New interview</p><h2 className="mt-2 text-2xl font-semibold text-[#101b30]">Create an interview link</h2><p className="mt-2 text-[#455c7d]">Capture the applicant&apos;s name and email before sending a private interview link.</p><form onSubmit={createLink} className="mt-6 grid gap-4 md:grid-cols-3"><label className="grid gap-2 text-sm font-semibold text-[#101b30]">Full name<input required value={candidateName} onChange={event => setCandidateName(event.target.value)} className="h-11 rounded-xl border border-[#ded8ca] px-3 font-normal" /></label><label className="grid gap-2 text-sm font-semibold text-[#101b30]">Email address<input required type="email" value={candidateEmail} onChange={event => setCandidateEmail(event.target.value)} className="h-11 rounded-xl border border-[#ded8ca] px-3 font-normal" /></label><label className="grid gap-2 text-sm font-semibold text-[#101b30]">Role<input required value={role} onChange={event => setRole(event.target.value)} className="h-11 rounded-xl border border-[#ded8ca] px-3 font-normal" /></label><button disabled={busy} className="rounded-xl bg-[#f47700] px-5 py-3 font-semibold text-white disabled:opacity-50 md:col-span-3">{busy ? 'Creating…' : 'Create interview link'}</button></form>{error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}{link && <div className="mt-5 rounded-xl bg-[#edf7ef] p-4"><p className="text-sm font-semibold text-[#173f35]">Interview link created</p><input readOnly value={link} onFocus={event => event.currentTarget.select()} className="mt-2 w-full rounded-lg border border-[#bdd7c3] bg-white px-3 py-2 text-sm" /></div>}</section>
}
