'use client'

import { useMemo, useState } from 'react'
import DocumentStatusActions from '@/components/document-status-actions'

export type PortalDocument = { id: string; document_type: string; original_filename: string; status: string; pathname: string }
export type PortalRow = {
  id: string
  applicant_name: string
  applicant_email: string
  role: string | null
  application_reference: string | null
  status: string
  deadline_at: string | null
  submitted_at: string | null
  last_reminder_at: string | null
  updated_at: string | null
  interviewInvited: boolean
  documents: PortalDocument[]
}

type Filter = 'all' | 'submitted' | 'pending'

const isSubmitted = (portal: PortalRow) => portal.status === 'documents_received' || portal.status === 'partially_received'
const groupDate = (portal: PortalRow) => (isSubmitted(portal) ? portal.submitted_at ?? portal.updated_at : portal.updated_at) ?? ''

function dayKey(value: string) {
  return value ? value.slice(0, 10) : 'unknown'
}

function dayLabel(key: string) {
  if (key === 'unknown') return 'Date unknown'
  return new Date(`${key}T00:00:00Z`).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
}

export default function DocumentSubmissionsList({ portals }: { portals: PortalRow[] }) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')

  const counts = useMemo(() => ({ all: portals.length, submitted: portals.filter(isSubmitted).length, pending: portals.filter(portal => !isSubmitted(portal)).length }), [portals])

  const groups = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const visible = portals.filter(portal => {
      if (filter === 'submitted' && !isSubmitted(portal)) return false
      if (filter === 'pending' && isSubmitted(portal)) return false
      if (!needle) return true
      const haystack = [portal.applicant_name, portal.applicant_email, portal.role, portal.application_reference, ...portal.documents.flatMap(document => [document.document_type, document.original_filename])].join(' ').toLowerCase()
      return haystack.includes(needle)
    })
    const byDay = new Map<string, PortalRow[]>()
    for (const portal of visible) {
      const key = dayKey(groupDate(portal))
      byDay.set(key, [...(byDay.get(key) ?? []), portal])
    }
    const entries = [...byDay.entries()].sort(([a], [b]) => b.localeCompare(a))
    return { total: visible.length, entries }
  }, [portals, query, filter])

  const tabs: { key: Filter; label: string }[] = [{ key: 'all', label: 'All' }, { key: 'submitted', label: 'Submitted' }, { key: 'pending', label: 'Pending' }]

  return (
    <section aria-label="Applicant documents" className="mt-8">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div role="tablist" aria-label="Document status" className="flex flex-wrap gap-2">
          {tabs.map(tab => <button key={tab.key} role="tab" aria-selected={filter === tab.key} type="button" onClick={() => setFilter(tab.key)} className={`rounded-full px-4 py-2 text-sm font-semibold ${filter === tab.key ? 'bg-[#f47700] text-white' : 'bg-white text-[#455c7d] border border-[#ded8ca]'}`}>{tab.label} ({counts[tab.key]})</button>)}
        </div>
        <div className="w-full lg:max-w-sm">
          <label htmlFor="document-search" className="sr-only">Search applicants and documents</label>
          <input id="document-search" type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search name, email, role, reference or file" className="h-11 w-full rounded-xl border border-[#ded8ca] bg-white px-3 text-sm" />
        </div>
      </div>
      <p role="status" className="mt-3 text-sm font-semibold text-[#455c7d]">{groups.total} applicant{groups.total === 1 ? '' : 's'} shown{query ? ` for "${query.trim()}"` : ''}. Grouped by {filter === 'pending' ? 'request' : 'submission'} date, newest first.</p>

      {groups.entries.length === 0 ? (
        <p className="mt-4 rounded-3xl bg-white p-8 text-[#455c7d]">{portals.length ? 'No applicants match your search.' : 'No document portals created yet.'}</p>
      ) : (
        <div className="mt-4 space-y-8">
          {groups.entries.map(([key, rows]) => (
            <div key={key}>
              <h2 className="flex items-center gap-3 text-sm font-bold uppercase tracking-[0.12em] text-[#173f35]">
                <span>{dayLabel(key)}</span>
                <span className="rounded-full bg-[#fff1e0] px-2.5 py-0.5 text-xs font-semibold normal-case tracking-normal text-[#c25e00]">{rows.length} applicant{rows.length === 1 ? '' : 's'}</span>
                <span aria-hidden="true" className="h-px flex-1 bg-[#ded8ca]" />
              </h2>
              <div className="mt-3 grid gap-4">
                {rows.map(portal => (
                  <article key={portal.id} className="rounded-3xl border border-[#ded8ca] bg-white p-6">
                    <div className="flex flex-col justify-between gap-4 md:flex-row">
                      <div>
                        <h3 className="text-xl font-semibold text-[#101b30]">{portal.applicant_name}</h3>
                        <p className="mt-1 text-sm text-[#455c7d]">{portal.applicant_email} · {portal.role || 'Role not specified'} · {portal.application_reference || 'No reference'}</p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <div className="flex flex-wrap justify-end gap-2">
                          <span className="h-fit rounded-full bg-[#e8f3ed] px-3 py-1 text-sm font-semibold text-[#28704d]">{portal.status.replaceAll('_', ' ')}</span>
                          {portal.interviewInvited && <span className="h-fit rounded-full bg-[#fff1e0] px-3 py-1 text-sm font-semibold text-[#c25e00]">Interview invited</span>}
                        </div>
                        <span className="text-xs text-[#455c7d]">Due {portal.deadline_at ? new Date(`${portal.deadline_at}T00:00:00`).toLocaleDateString('en-GB') : 'next day'} · {portal.submitted_at ? `Submitted ${new Date(portal.submitted_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })} UTC` : portal.last_reminder_at ? `Reminder ${new Date(portal.last_reminder_at).toLocaleDateString('en-GB')}` : 'Request sent'}</span>
                      </div>
                    </div>
                    {portal.documents.length > 0 && (
                      <ul className="mt-5 grid gap-2">
                        {portal.documents.map(document => (
                          <li key={document.id} className="flex flex-wrap justify-between gap-2 rounded-xl bg-[#f7f8f6] px-4 py-3 text-sm">
                            <span>{document.document_type} · {document.original_filename}</span>
                            <span className="flex items-center gap-3">
                              <span className="font-semibold text-[#455c7d]">{document.status}</span>
                              <a href={`/api/document-portal/file?pathname=${encodeURIComponent(document.pathname)}`} className="font-semibold text-[#f47700] underline">Download</a>
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                    <DocumentStatusActions id={portal.id} status={portal.status} />
                  </article>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
