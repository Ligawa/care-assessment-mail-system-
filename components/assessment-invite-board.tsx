'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import TestEmailButton from '@/components/test-email-button'

export type PassedInterview = { id: string; name: string; email: string; role: string; completedAt: string | null }
export type PublishedAssessment = { id: string; title: string }
export type InviteRow = { id: string; name: string; email: string; role: string; assessmentId: string; assessmentTitle: string; status: string; invitedAt: string; deadlineAt: string; completedAt: string | null; submissionId: string | null; score: { percentage: number; correct: number; total: number } | null }

type Tab = 'pending' | 'invited' | 'completed'
const CHUNK = 20

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }) + ' UTC' : '-'
}

function guessAssessment(role: string, assessments: PublishedAssessment[]) {
  const needle = role.toLowerCase().replace(/s$/, '')
  return assessments.find(item => item.title.toLowerCase().includes(needle) || needle.includes(item.title.toLowerCase().replace(/s$/, '')))?.id ?? ''
}

export default function AssessmentInviteBoard({ passed, invites, assessments, generatedAt }: { passed: PassedInterview[]; invites: InviteRow[]; assessments: PublishedAssessment[]; generatedAt: number }) {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('pending')
  const [roleFilter, setRoleFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [assessmentId, setAssessmentId] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState('')
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null)
  const [failedEmails, setFailedEmails] = useState('')

  const invitedKeys = useMemo(() => new Set(invites.map(invite => `${invite.email}|${invite.role.toLowerCase()}`)), [invites])
  const pending = useMemo(() => passed.filter(item => !invitedKeys.has(`${item.email}|${item.role.toLowerCase()}`)), [passed, invitedKeys])
  const invitedOnly = invites.filter(invite => invite.status === 'invited')
  const completed = invites.filter(invite => invite.status === 'completed')
  const roles = useMemo(() => [...new Set([...passed.map(item => item.role), ...invites.map(invite => invite.role)])].sort(), [passed, invites])

  const matches = (name: string, email: string, role: string) => (roleFilter === 'all' || role === roleFilter) && `${name} ${email}`.toLowerCase().includes(search.toLowerCase())
  const pendingList = pending.filter(item => matches(item.name, item.email, item.role))
  const invitedList = invitedOnly.filter(item => matches(item.name, item.email, item.role))
  const completedList = completed.filter(item => matches(item.name, item.email, item.role))

  function changeRole(role: string) {
    setRoleFilter(role)
    setSelected(new Set())
    if (role !== 'all') setAssessmentId(guessAssessment(role, assessments) || assessmentId)
  }
  function toggle(id: string) { setSelected(current => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next }) }
  const allVisibleSelected = pendingList.length > 0 && pendingList.every(item => selected.has(item.id))
  function toggleAll() { setSelected(allVisibleSelected ? new Set() : new Set(pendingList.map(item => item.id))) }

  async function send() {
    const ids = pendingList.filter(item => selected.has(item.id)).map(item => item.id)
    if (!assessmentId || !ids.length) return
    setBusy(true); setResult(null); setFailedEmails('')
    let sent = 0
    const failed: string[] = []
    const skipped: string[] = []
    let deadline = ''
    let fatal = ''
    for (let start = 0; start < ids.length && !fatal; start += CHUNK) {
      const chunk = ids.slice(start, start + CHUNK)
      setProgress(`Sending ${Math.min(start + chunk.length, ids.length)} of ${ids.length}...`)
      try {
        const response = await fetch('/api/admin/assessments/invite', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ assessmentId, interviewIds: chunk }) })
        const data = await response.json().catch(() => ({}))
        if (!response.ok) { fatal = data.error || 'The invitations could not be sent.'; failed.push(...pendingList.filter(item => chunk.includes(item.id)).map(item => item.email)); continue }
        sent += data.sent; failed.push(...data.failedEmails); skipped.push(...data.skippedDuplicates); deadline = data.deadline
      } catch {
        fatal = 'Network error. The remaining invitations were not sent.'
        failed.push(...pendingList.filter(item => chunk.includes(item.id)).map(item => item.email))
      }
    }
    if (fatal) { const remaining = ids.slice(ids.length - Math.max(0, ids.length - (sent + failed.length + skipped.length))); failed.push(...pendingList.filter(item => remaining.includes(item.id) && !failed.includes(item.email)).map(item => item.email)) }
    setBusy(false); setProgress('')
    setFailedEmails([...new Set(failed)].join('\n'))
    setSelected(new Set(pendingList.filter(item => failed.includes(item.email)).map(item => item.id)))
    const parts = [`${sent} invitation${sent === 1 ? '' : 's'} sent${deadline ? `, due ${deadline}` : ''}.`]
    if (skipped.length) parts.push(`${skipped.length} skipped because they were already invited for this role.`)
    if (failed.length) parts.push(`${failed.length} failed and ${failed.length === 1 ? 'is' : 'are'} left selected below for retry.`)
    if (fatal) parts.push(fatal)
    setResult({ ok: !failed.length && !fatal, text: parts.join(' ') })
    router.refresh()
  }

  const selectedRole = roleFilter !== 'all' ? roleFilter : pendingList.find(item => selected.has(item.id))?.role || assessments.find(item => item.id === assessmentId)?.title || 'Role'
  const stats: { key: Tab | 'passed'; label: string; value: number; hint: string }[] = [
    { key: 'passed', label: 'Passed interview', value: passed.length, hint: 'Forwarded to assessments' },
    { key: 'pending', label: 'Pending invite', value: pending.length, hint: 'Not yet invited' },
    { key: 'invited', label: 'Invited', value: invitedOnly.length, hint: 'Awaiting completion' },
    { key: 'completed', label: 'Completed', value: completed.length, hint: 'Eligible for offer letter' },
  ]
  const tabs: { key: Tab; label: string; count: number }[] = [{ key: 'pending', label: 'Pending invite', count: pending.length }, { key: 'invited', label: 'Invited', count: invitedOnly.length }, { key: 'completed', label: 'Completed', count: completed.length }]

  return (
    <div className="mt-10 space-y-8">
      <section aria-label="Assessment statistics" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(stat => (
          <button key={stat.key} type="button" onClick={() => stat.key !== 'passed' && setTab(stat.key)} className={`rounded-2xl border bg-white p-5 text-left ${stat.key === tab ? 'border-[#f47700]' : 'border-[#ded8ca]'}`}>
            <p className="text-sm font-semibold text-[#455c7d]">{stat.label}</p>
            <p className="mt-2 text-4xl font-semibold text-[#101b30]">{stat.value}</p>
            <p className="mt-1 text-sm text-[#7890ad]">{stat.hint}</p>
          </button>
        ))}
      </section>

      <section aria-label="Test assessment email" className="rounded-2xl border border-[#ded8ca] bg-white p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-[#101b30]">Test the assessment invite</h2>
        <p className="mt-1 text-sm text-[#455c7d]">Choose an assessment and send yourself the exact email applicants will receive, with its real title, duration and question count, before inviting anyone.</p>
        <div className="mt-4 space-y-4">
          <div>
            <label htmlFor="test-assessment-select" className="text-sm font-semibold text-[#101b30]">Assessment to preview</label>
            <select id="test-assessment-select" value={assessmentId} onChange={event => setAssessmentId(event.target.value)} className="mt-1 h-11 w-full rounded-xl border border-[#ded8ca] bg-white px-3 text-sm"><option value="">Choose a published assessment</option>{assessments.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select>
          </div>
          <TestEmailButton type="assessment" role={selectedRole} assessmentId={assessmentId} />
        </div>
      </section>

      <section className="rounded-2xl border border-[#ded8ca] bg-white p-5 sm:p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div role="tablist" aria-label="Invite status" className="flex flex-wrap gap-2">
            {tabs.map(item => <button key={item.key} role="tab" aria-selected={tab === item.key} type="button" onClick={() => setTab(item.key)} className={`rounded-full px-4 py-2 text-sm font-semibold ${tab === item.key ? 'bg-[#f47700] text-white' : 'bg-[#f7f8f6] text-[#455c7d]'}`}>{item.label} ({item.count})</button>)}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="sr-only" htmlFor="invite-search">Search applicants</label>
            <input id="invite-search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search name or email" className="h-10 rounded-xl border border-[#ded8ca] px-3 text-sm" />
            <label className="sr-only" htmlFor="invite-role">Filter by role</label>
            <select id="invite-role" value={roleFilter} onChange={event => changeRole(event.target.value)} className="h-10 rounded-xl border border-[#ded8ca] bg-white px-3 text-sm"><option value="all">All roles</option>{roles.map(role => <option key={role} value={role}>{role}</option>)}</select>
          </div>
        </div>

        {tab === 'pending' && (
          <div className="mt-6 space-y-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1">
                <label htmlFor="assessment-select" className="text-sm font-semibold text-[#101b30]">Skills assessment to send</label>
                <select id="assessment-select" value={assessmentId} onChange={event => setAssessmentId(event.target.value)} className="mt-1 h-11 w-full rounded-xl border border-[#ded8ca] bg-white px-3 text-sm"><option value="">Choose a published assessment</option>{assessments.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select>
              </div>
              <button type="button" onClick={send} disabled={busy || !assessmentId || selected.size === 0} className="h-11 rounded-xl bg-[#f47700] px-5 text-sm font-semibold text-white disabled:opacity-50">{busy ? progress || 'Sending...' : `Send invite${selected.size === 1 ? '' : 's'} (${selected.size})`}</button>
            </div>
            {result && <p role="status" className={`text-sm font-semibold ${result.ok ? 'text-[#28704d]' : 'text-[#9a3412]'}`}>{result.text}</p>}
            {failedEmails && <div><label htmlFor="failed-emails" className="text-sm font-semibold text-[#101b30]">Failed addresses (still selected, press Send to retry)</label><textarea id="failed-emails" readOnly value={failedEmails} rows={Math.min(6, failedEmails.split('\n').length)} className="mt-1 w-full rounded-xl border border-[#ded8ca] bg-[#f7f8f6] p-3 text-sm" /></div>}
            {pendingList.length === 0 ? <p className="text-sm text-[#455c7d]">No applicants are waiting for an assessment invite. Mark interviews as passed to forward applicants here.</p> : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead className="text-[#455c7d]"><tr><th className="py-2 pr-3"><input type="checkbox" aria-label="Select all visible applicants" checked={allVisibleSelected} onChange={toggleAll} /></th><th className="py-2 pr-3">Applicant</th><th className="py-2 pr-3">Role</th><th className="py-2">Interview passed</th></tr></thead>
                  <tbody>{pendingList.map(item => <tr key={item.id} className="border-t border-[#ded8ca]"><td className="py-3 pr-3"><input type="checkbox" aria-label={`Select ${item.name}`} checked={selected.has(item.id)} onChange={() => toggle(item.id)} /></td><td className="py-3 pr-3"><p className="font-semibold text-[#101b30]">{item.name}</p><p className="text-[#455c7d]">{item.email}</p></td><td className="py-3 pr-3">{item.role}</td><td className="py-3">{formatDate(item.completedAt)}</td></tr>)}</tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {tab === 'invited' && <InviteTable rows={invitedList} generatedAt={generatedAt} empty="No pending assessment invites." />}
        {tab === 'completed' && <InviteTable rows={completedList} generatedAt={generatedAt} completed empty="No applicants have completed the assessment yet." />}
      </section>
    </div>
  )
}

function InviteTable({ rows, completed, empty, generatedAt }: { rows: InviteRow[]; completed?: boolean; empty: string; generatedAt: number }) {
  if (!rows.length) return <p className="mt-6 text-sm text-[#455c7d]">{empty}</p>
  return (
    <div className="mt-6 overflow-x-auto">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="text-[#455c7d]"><tr><th className="py-2 pr-3">Applicant</th><th className="py-2 pr-3">Role</th><th className="py-2 pr-3">Assessment</th><th className="py-2 pr-3">Invited</th><th className="py-2 pr-3">{completed ? 'Completed' : 'Deadline'}</th>{completed && <><th className="py-2 pr-3">Score</th><th className="py-2">Review</th></>}</tr></thead>
        <tbody>{rows.map(row => {
          const expired = !completed && new Date(row.deadlineAt).getTime() < generatedAt
          return <tr key={row.id} className="border-t border-[#ded8ca]"><td className="py-3 pr-3"><p className="font-semibold text-[#101b30]">{row.name}</p><p className="text-[#455c7d]">{row.email}</p></td><td className="py-3 pr-3">{row.role}</td><td className="py-3 pr-3">{completed ? <Link href={`/admin/assessments/${row.assessmentId}/responses`} className="font-medium text-primary underline-offset-2 hover:underline">{row.assessmentTitle}</Link> : row.assessmentTitle}</td><td className="py-3 pr-3">{formatDate(row.invitedAt)}</td><td className="py-3 pr-3">{completed ? formatDate(row.completedAt) : <span className={expired ? 'font-semibold text-[#9a3412]' : ''}>{formatDate(row.deadlineAt)}{expired ? ' (expired)' : ''}</span>}</td>{completed && <><td className="py-3 pr-3">{row.score ? <span className="font-semibold text-[#101b30]">{row.score.percentage}% <span className="font-normal text-[#455c7d]">({row.score.correct}/{row.score.total})</span></span> : '-'}</td><td className="py-3">{row.submissionId ? <Link href={`/admin/candidates/${row.submissionId}`} className="inline-flex h-9 items-center rounded-lg bg-[#f47700] px-3 text-sm font-semibold text-white">View answers and offer</Link> : <span className="text-[#7890ad]">Unavailable</span>}</td></>}</tr>
        })}</tbody>
      </table>
    </div>
  )
}
