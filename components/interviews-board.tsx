'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'

export type InterviewListItem = {
  id: string
  name: string
  email: string | null
  role: string | null
  status: string
  decision: string | null
  createdAt: string | null
  startedAt: string | null
  completedAt: string | null
  deadlineAt: string | null
  reminders: number
  recommendation: string | null
  summary: string | null
}

type Filter = 'all' | 'pending' | 'in_progress' | 'completed' | 'awaiting_decision' | 'passed' | 'failed' | 'overdue'
type Sort = 'newest_invite' | 'oldest_invite' | 'recent_activity' | 'name'

const filterLabels: Record<Filter, string> = {
  all: 'All invited',
  pending: 'Pending',
  in_progress: 'Started, not finished',
  completed: 'Completed',
  awaiting_decision: 'Awaiting decision',
  passed: 'Passed',
  failed: 'Not passed',
  overdue: 'Overdue'
}

function deadlineTime(value: string | null) {
  if (!value) return null
  return new Date(value.includes('T') ? value : `${value}T23:59:59`).getTime()
}

export default function InterviewsBoard({ interviews, generatedAt }: { interviews: InterviewListItem[]; generatedAt: number }) {
  const [filter, setFilter] = useState<Filter>('all')
  const [sort, setSort] = useState<Sort>('newest_invite')
  const [query, setQuery] = useState('')

  const flags = useMemo(() => {
    const map = new Map<string, { completed: boolean; started: boolean; pending: boolean; overdue: boolean; awaiting: boolean; passed: boolean; failed: boolean }>()
    for (const item of interviews) {
      const completed = item.status === 'completed'
      const due = deadlineTime(item.deadlineAt)
      map.set(item.id, {
        completed,
        started: !completed && !!item.startedAt,
        pending: !completed && !item.startedAt,
        overdue: !completed && due !== null && due < generatedAt,
        awaiting: completed && (!item.decision || item.decision === 'pending'),
        passed: completed && item.decision === 'passed',
        failed: completed && (item.decision === 'failed' || item.decision === 'not_passed')
      })
    }
    return map
  }, [interviews, generatedAt])

  const counts = useMemo(() => {
    const all = [...flags.values()]
    return {
      all: interviews.length,
      pending: all.filter(f => f.pending).length,
      in_progress: all.filter(f => f.started).length,
      completed: all.filter(f => f.completed).length,
      awaiting_decision: all.filter(f => f.awaiting).length,
      passed: all.filter(f => f.passed).length,
      failed: all.filter(f => f.failed).length,
      overdue: all.filter(f => f.overdue).length
    } satisfies Record<Filter, number>
  }, [flags, interviews.length])

  const attempted = counts.completed + counts.in_progress
  const attemptRate = counts.all ? Math.round((attempted / counts.all) * 100) : 0

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const time = (value: string | null) => (value ? new Date(value).getTime() : 0)
    return interviews
      .filter(item => {
        const f = flags.get(item.id)!
        const matchesFilter =
          filter === 'all' ||
          (filter === 'pending' && f.pending) ||
          (filter === 'in_progress' && f.started) ||
          (filter === 'completed' && f.completed) ||
          (filter === 'awaiting_decision' && f.awaiting) ||
          (filter === 'passed' && f.passed) ||
          (filter === 'failed' && f.failed) ||
          (filter === 'overdue' && f.overdue)
        const matchesSearch = !needle || [item.name, item.email, item.role].some(value => value?.toLowerCase().includes(needle))
        return matchesFilter && matchesSearch
      })
      .sort((a, b) => {
        if (sort === 'name') return a.name.localeCompare(b.name)
        if (sort === 'oldest_invite') return time(a.createdAt) - time(b.createdAt)
        if (sort === 'recent_activity') return Math.max(time(b.completedAt), time(b.startedAt), time(b.createdAt)) - Math.max(time(a.completedAt), time(a.startedAt), time(a.createdAt))
        return time(b.createdAt) - time(a.createdAt)
      })
  }, [filter, flags, interviews, query, sort])

  const cards: { key: Filter; label: string; hint: string; tone: string }[] = [
    { key: 'all', label: 'Total invited', hint: 'Interview links issued', tone: 'text-[#101b30]' },
    { key: 'pending', label: 'Pending', hint: 'Link not opened yet', tone: 'text-[#c25e00]' },
    { key: 'in_progress', label: 'Started', hint: 'Opened, not finished', tone: 'text-[#455c7d]' },
    { key: 'completed', label: 'Completed', hint: `${attemptRate}% have attempted`, tone: 'text-[#28704d]' },
    { key: 'awaiting_decision', label: 'Awaiting decision', hint: 'Completed, needs HR review', tone: 'text-[#455c7d]' },
    { key: 'overdue', label: 'Overdue', hint: 'Past deadline, not completed', tone: 'text-[#b42318]' }
  ]

  return (
    <>
      <section aria-label="Interview statistics" className="mt-10 grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        {cards.map(card => (
          <button
            key={card.key}
            type="button"
            onClick={() => setFilter(card.key)}
            aria-pressed={filter === card.key}
            className={`rounded-2xl border bg-white p-4 text-left transition hover:border-[#f47700] ${filter === card.key ? 'border-[#f47700] ring-2 ring-[#f47700]/20' : 'border-[#ded8ca]'}`}
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-[#455c7d]">{card.label}</p>
            <p className={`mt-2 text-3xl font-semibold ${card.tone}`}>{counts[card.key]}</p>
            <p className="mt-1 text-xs text-[#455c7d]">{card.hint}</p>
          </button>
        ))}
      </section>

      <section className="mt-6 rounded-[28px] border border-[#ded8ca] bg-white p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative flex-1 lg:max-w-md">
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#455c7d]" />
            <input
              type="search"
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="Search name, email or role"
              aria-label="Search interviews"
              className="h-11 w-full rounded-xl border border-[#ded8ca] bg-[#faf8f2] pl-9 pr-3 text-sm text-[#101b30] outline-none focus:border-[#f47700]"
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-[#455c7d]">
              Show
              <select value={filter} onChange={event => setFilter(event.target.value as Filter)} className="h-11 rounded-xl border border-[#ded8ca] bg-white px-3 text-sm text-[#101b30]">
                {(Object.keys(filterLabels) as Filter[]).map(key => <option key={key} value={key}>{filterLabels[key]} ({counts[key]})</option>)}
                </select>
            </label>
            <label className="flex items-center gap-2 text-sm text-[#455c7d]">
              Sort
              <select value={sort} onChange={event => setSort(event.target.value as Sort)} className="h-11 rounded-xl border border-[#ded8ca] bg-white px-3 text-sm text-[#101b30]">
                <option value="newest_invite">Newest invited</option>
                <option value="oldest_invite">Oldest invited</option>
                <option value="recent_activity">Recent activity</option>
                <option value="name">Name A to Z</option>
              </select>
            </label>
          </div>
        </div>

        <p className="mt-4 text-sm font-semibold text-[#455c7d]" aria-live="polite">Showing {visible.length} of {interviews.length} interviews</p>

        <div className="mt-4 grid gap-3">
          {visible.map(item => {
            const f = flags.get(item.id)!
            const stage = f.completed ? 'Completed' : f.started ? 'Started' : 'Pending'
            const stageStyle = f.completed ? 'bg-[#eaf4ed] text-[#28704d]' : f.started ? 'bg-[#e9eff7] text-[#2c4a76]' : 'bg-[#fff1e0] text-[#c25e00]'
            return (
              <Link key={item.id} href={`/admin/interviews/${item.id}`} className="rounded-2xl border border-[#ded8ca] p-5 transition hover:border-[#f47700]">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-semibold text-[#101b30]">{item.name}</h2>
                    <p className="mt-1 text-sm text-[#455c7d]">
                      {item.email || 'No email captured'}{item.role ? ` · ${item.role}` : ''}
                    </p>
                    <p className="mt-1 text-xs text-[#455c7d]">
                      {item.createdAt ? `Invited ${new Date(item.createdAt).toLocaleDateString('en-GB')}` : 'Invite date unknown'}
                      {item.deadlineAt ? ` · Due ${new Date(item.deadlineAt.includes('T') ? item.deadlineAt : `${item.deadlineAt}T00:00:00`).toLocaleDateString('en-GB')}` : ''}
                      {f.started && item.startedAt ? ` · Started ${new Date(item.startedAt).toLocaleString('en-GB')}` : ''}
                      {item.completedAt ? ` · Completed ${new Date(item.completedAt).toLocaleString('en-GB')}` : ''}
                      {item.reminders > 0 ? ` · ${item.reminders} reminder${item.reminders === 1 ? '' : 's'} sent` : ''}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {f.overdue && <span className="rounded-full bg-[#fdecea] px-3 py-1 text-xs font-semibold text-[#b42318]">Overdue</span>}
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${stageStyle}`}>{stage}</span>
                    {f.completed && <span className="rounded-full bg-[#f4eee4] px-3 py-1 text-xs font-semibold capitalize text-[#455c7d]">{(item.decision || 'pending').replace('_', ' ')}</span>}
                    {f.completed && item.recommendation && <span className="rounded-full bg-[#eaf4ed] px-3 py-1 text-xs font-semibold text-[#36835d]">{item.recommendation}</span>}
                  </div>
                </div>
                <p className="mt-4 line-clamp-2 text-sm text-[#455c7d]">
                  {f.completed ? item.summary || 'Open this interview to review the transcript and score.' : f.started ? 'Applicant has opened the interview but has not finished yet.' : 'Applicant has not opened the interview link yet. Send a reminder from the Documents page.'}
                </p>
              </Link>
            )
          })}
          {visible.length === 0 && <div className="rounded-2xl border border-dashed border-[#ded8ca] p-10 text-center text-[#455c7d]">No interviews match this view.</div>}
        </div>
      </section>
    </>
  )
}
