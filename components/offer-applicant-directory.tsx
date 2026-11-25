'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { Download, FileText, Search } from 'lucide-react'

type ApplicantStatus = 'ready' | 'sent' | 'failed' | 'generating'
type FilterStatus = 'all' | 'ready' | 'issued' | 'attention'

type Applicant = {
  id: string
  fullName: string
  email: string
  jobTitle: string | null
  reference: string | null
  salary: string
  sentAt: string
  acceptanceDeadline: string
  status: ApplicantStatus
}

const filters: { key: FilterStatus; label: string }[] = [
  { key: 'all', label: 'All applicants' },
  { key: 'ready', label: 'To be issued' },
  { key: 'issued', label: 'Already issued' },
  { key: 'attention', label: 'Needs attention' },
]

const statusLabel: Record<ApplicantStatus, string> = {
  ready: 'Ready to issue',
  sent: 'Issued',
  failed: 'Failed',
  generating: 'Generating',
}

function matchesFilter(applicant: Applicant, filter: FilterStatus) {
  if (filter === 'all') return true
  if (filter === 'ready') return applicant.status === 'ready' || applicant.status === 'failed'
  if (filter === 'issued') return applicant.status === 'sent'
  return applicant.status === 'failed' || applicant.status === 'generating'
}

export default function OfferApplicantDirectory({ applicants }: { applicants: Applicant[] }) {
  const [filter, setFilter] = useState<FilterStatus>('all')
  const [search, setSearch] = useState('')

  const counts = useMemo(() => ({
    all: applicants.length,
    ready: applicants.filter(applicant => applicant.status === 'ready' || applicant.status === 'failed').length,
    issued: applicants.filter(applicant => applicant.status === 'sent').length,
    attention: applicants.filter(applicant => applicant.status === 'failed' || applicant.status === 'generating').length,
  }), [applicants])

  const visibleApplicants = useMemo(() => {
    const query = search.trim().toLowerCase()
    return applicants.filter(applicant => {
      if (!matchesFilter(applicant, filter)) return false
      if (!query) return true
      return [applicant.fullName, applicant.email, applicant.jobTitle, applicant.reference]
        .some(value => value?.toLowerCase().includes(query))
    })
  }, [applicants, filter, search])

  return (
    <section className="mt-8 overflow-hidden rounded-3xl border border-[#ded8ca] bg-white">
      <div className="flex flex-col gap-4 border-b border-[#ded8ca] p-5">
        <div>
          <h2 className="text-xl font-semibold text-[#101b30]">Offer applicants</h2>
          <p className="mt-1 text-sm text-[#455c7d]">Browse passed applicants, find those awaiting an offer, and revisit issued letters.</p>
        </div>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filter offer applicants">
            {filters.map(item => {
              const active = filter === item.key
              return (
                <button
                  key={item.key}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setFilter(item.key)}
                  className={`rounded-full border px-3 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f47700] focus-visible:ring-offset-2 ${active ? 'border-[#101b30] bg-[#101b30] text-white' : 'border-[#ded8ca] bg-white text-[#455c7d] hover:border-[#f47700] hover:text-[#101b30]'}`}
                >
                  {item.label} <span className="ml-1 tabular-nums opacity-75">{counts[item.key]}</span>
                </button>
              )
            })}
          </div>
          <label className="flex h-10 w-full items-center gap-2 rounded-xl border border-[#ded8ca] px-3 text-[#455c7d] focus-within:border-[#f47700] focus-within:ring-2 focus-within:ring-[#f47700]/20 lg:max-w-xs">
            <Search className="size-4 shrink-0" aria-hidden="true" />
            <span className="sr-only">Search applicants by name, email, role, or reference</span>
            <input
              type="search"
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Search applicants"
              className="min-w-0 flex-1 bg-transparent text-sm text-[#101b30] outline-none placeholder:text-[#455c7d]"
            />
          </label>
        </div>
      </div>

      {applicants.length === 0 ? (
        <div className="flex flex-col items-center gap-3 p-12 text-center text-[#455c7d]">
          <FileText className="size-8 text-[#f47700]" aria-hidden="true" />
          <p>No passed applicants with completed assessments are waiting for an offer or have an issued offer yet.</p>
        </div>
      ) : visibleApplicants.length === 0 ? (
        <p className="p-8 text-center text-sm text-[#455c7d]">No applicants match this filter. Try another status or search term.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="border-b border-[#ded8ca] text-[#455c7d]">
              <tr>
                <th className="px-5 py-4 font-semibold">Applicant</th>
                <th className="px-5 py-4 font-semibold">Role</th>
                <th className="px-5 py-4 font-semibold">Reference</th>
                <th className="px-5 py-4 font-semibold">Salary (USD/month)</th>
                <th className="px-5 py-4 font-semibold">Sent</th>
                <th className="px-5 py-4 font-semibold">Accept by</th>
                <th className="px-5 py-4 font-semibold">Status</th>
                <th className="px-5 py-4 text-right font-semibold"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {visibleApplicants.map(applicant => (
                <tr key={applicant.id} className="border-b border-[#ded8ca] last:border-0">
                  <td className="px-5 py-4">
                    <Link href={`/admin/candidates/${applicant.id}`} className="font-semibold text-[#101b30] hover:text-[#f47700]">{applicant.fullName}</Link>
                    <p className="text-xs text-[#455c7d]">{applicant.email}</p>
                  </td>
                  <td className="px-5 py-4 text-[#101b30]">{applicant.jobTitle ?? '—'}</td>
                  <td className="px-5 py-4 font-mono text-xs text-[#455c7d]">{applicant.reference ?? '—'}</td>
                  <td className="px-5 py-4 text-[#101b30]">{applicant.salary}</td>
                  <td className="px-5 py-4 text-[#455c7d]">{applicant.sentAt}</td>
                  <td className="px-5 py-4 text-[#455c7d]">{applicant.acceptanceDeadline}</td>
                  <td className="px-5 py-4">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${applicant.status === 'sent' ? 'bg-emerald-100 text-emerald-800' : applicant.status === 'ready' ? 'bg-[#fff0dc] text-[#9a4a00]' : 'bg-amber-100 text-amber-800'}`}>
                      {statusLabel[applicant.status]}
                    </span>
                    {applicant.status === 'failed' && <p className="mt-1 text-xs text-[#455c7d]">Previous attempt failed</p>}
                  </td>
                  <td className="px-5 py-4 text-right">
                    {applicant.status === 'sent' && <a href={`/api/admin/candidates/${applicant.id}/offer-pdf`} className="inline-flex items-center gap-2 rounded-xl border border-[#ded8ca] px-3 py-2 font-semibold text-[#101b30] transition hover:border-[#f47700] hover:text-[#f47700]"><Download className="size-4" aria-hidden="true" />PDF</a>}
                    {(applicant.status === 'ready' || applicant.status === 'failed') && <Link href={`/admin/candidates/${applicant.id}#offer-form`} className="inline-flex items-center gap-2 rounded-xl bg-[#f47700] px-3 py-2 font-semibold text-white transition hover:opacity-90"><FileText className="size-4" aria-hidden="true" />{applicant.status === 'failed' ? 'Retry offer' : 'Issue offer'}</Link>}
                    {applicant.status === 'generating' && <span className="text-xs text-[#455c7d]">Offer in progress</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="border-t border-[#ded8ca] px-5 py-3 text-xs text-[#455c7d]" aria-live="polite">
        Showing {visibleApplicants.length} of {applicants.length} applicants
      </p>
    </section>
  )
}
