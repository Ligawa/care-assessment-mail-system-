'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import TestEmailButton from '@/components/test-email-button'

type Candidate = { id: string; name: string; email: string; role: string; status: string }
type Counts = { requested: number; partial: number; received: number; interviewed: number }

export default function InterviewInvitePanel({ candidates, counts }: { candidates: Candidate[]; counts: Counts }) {
  const router = useRouter()
  const [selected, setSelected] = useState<string[]>(candidates.map(candidate => candidate.id))
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState('')
  const [failed, setFailed] = useState<string[]>([])

  function toggle(id: string) { setSelected(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id]) }

  async function send() {
    setSending(true); setMessage(''); setFailed([])
    try {
      const response = await fetch('/api/admin/documents/interview-invites', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ portalIds: selected }) })
      const data = await response.json()
      if (!response.ok) { setMessage(data.error || 'Could not send interview invitations.'); return }
      setFailed(data.failedEmails || [])
      setMessage(`${data.sent} interview invitation${data.sent === 1 ? '' : 's'} sent${data.deadline ? `, due ${data.deadline}` : ''}.${data.failedEmails?.length ? ` ${data.failedEmails.length} failed and are listed below to retry.` : ''}`)
      router.refresh()
    } catch { setMessage('Network error. Please try again.') } finally { setSending(false) }
  }

  const stats = [['Invites sent', counts.requested], ['Partially submitted', counts.partial], ['Documents received', counts.received], ['Interview invited', counts.interviewed]] as const

  return <section className="mt-8 rounded-3xl border border-[#ded8ca] bg-white p-6">
    <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">{stats.map(([label, value]) => <div key={label} className="rounded-2xl bg-[#f7f8f6] p-4"><dt className="text-xs font-bold uppercase tracking-wide text-[#455c7d]">{label}</dt><dd className="mt-1 text-3xl font-semibold text-[#101b30]">{value}</dd></div>)}</dl>
    <div className="mt-6 flex flex-col justify-between gap-4 md:flex-row md:items-start">
      <div><h2 className="text-xl font-semibold text-[#101b30]">Invite to AI-powered interview</h2><p className="mt-1 max-w-2xl text-sm text-[#455c7d]">Applicants who have submitted documents, fully or partially, and have not yet been invited. Each receives a detailed email with their own interview link, due the next day.</p></div>
      <button type="button" onClick={send} disabled={sending || !selected.length} className="shrink-0 rounded-xl bg-[#f47700] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">{sending ? 'Sending invitations…' : `Send interview invites (${selected.length})`}</button>
    </div>
    <div className="mt-4"><TestEmailButton type="interview" role={candidates[0]?.role || 'Accounts Payable Clerk'} /></div>
    {candidates.length > 0 ? <>
      <div className="mt-4 flex gap-4 text-sm font-semibold text-[#f47700]"><button type="button" onClick={() => setSelected(candidates.map(candidate => candidate.id))}>Select all</button><button type="button" onClick={() => setSelected([])}>Clear</button></div>
      <ul className="mt-3 grid max-h-72 gap-2 overflow-y-auto">{candidates.map(candidate => <li key={candidate.id}><label className="flex cursor-pointer items-center gap-3 rounded-xl bg-[#f7f8f6] px-4 py-3 text-sm"><input type="checkbox" checked={selected.includes(candidate.id)} onChange={() => toggle(candidate.id)} className="size-4 accent-[#f47700]" /><span className="min-w-0 flex-1"><span className="block truncate font-semibold text-[#101b30]">{candidate.name}</span><span className="block truncate text-[#455c7d]">{candidate.email} · {candidate.role}</span></span><span className="rounded-full bg-[#e8f3ed] px-3 py-1 text-xs font-semibold text-[#28704d]">{candidate.status.replaceAll('_', ' ')}</span></label></li>)}</ul>
    </> : <p className="mt-4 rounded-xl bg-[#f7f8f6] p-4 text-sm text-[#455c7d]">No applicants are waiting for an interview invitation.</p>}
    {message && <p role="status" className="mt-4 text-sm font-semibold text-[#28704d]">{message}</p>}
    {failed.length > 0 && <label className="mt-3 block text-sm font-semibold text-[#9a3412]">Failed emails (retry by selecting them above and sending again)<textarea readOnly value={failed.join('\n')} rows={Math.min(failed.length, 6)} className="mt-2 w-full rounded-xl border border-[#ded8ca] p-3 font-mono text-xs text-[#101b30]" /></label>}
  </section>
}
