'use client'

import { useMemo, useState } from 'react'
import { Check, Clock3, FileCheck2, LoaderCircle, Send } from 'lucide-react'
import { OFFER_DOCUMENT_CHECKLIST, type OfferDocumentStatus } from '@/lib/offer-document-checklist'

type ResponseStatus = 'awaiting_response' | 'signed_received' | 'declined' | 'withdrawn'
type Candidate = { id: string; name: string; email: string; role: string | null; reference: string | null; deadline: string | null; responseStatus: ResponseStatus; reminderCount: number }
type DocumentRow = { submission_id: string; document_key: string; document_label: string; status: OfferDocumentStatus; reminder_count: number; last_reminder_at: string | null }

export default function OfferDocumentTracker({ candidates, documents }: { candidates: Candidate[]; documents: DocumentRow[] }) {
  const [rows, setRows] = useState(documents)
  const [saving, setSaving] = useState<string | null>(null)
  const [reminding, setReminding] = useState<string | null>(null)
  const [responseStatuses, setResponseStatuses] = useState<Record<string, ResponseStatus>>(() => Object.fromEntries(candidates.map((candidate) => [candidate.id, candidate.responseStatus])))
  const [message, setMessage] = useState('')
  const [messageIsError, setMessageIsError] = useState(false)
  const documentsByCandidate = useMemo(() => {
    const map = new Map<string, DocumentRow[]>()
    for (const row of rows) map.set(row.submission_id, [...(map.get(row.submission_id) ?? []), row])
    return map
  }, [rows])

  async function updateStatus(candidateId: string, documentKey: string, status: OfferDocumentStatus) {
    const id = `${candidateId}:${documentKey}`
    const previous = rows.find((row) => row.submission_id === candidateId && row.document_key === documentKey)
    if (!previous) return
    setSaving(id)
    setMessage('')
    setMessageIsError(false)
    try {
      const response = await fetch(`/api/admin/candidates/${candidateId}/offer-documents`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentKey, status }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Could not update the checklist.')
      setRows((current) => current.map((row) => row.submission_id === candidateId && row.document_key === documentKey ? { ...row, status } : row))
      if (documentKey === 'signed_offer_letter' && result.responseStatus) {
        setResponseStatuses((current) => ({ ...current, [candidateId]: result.responseStatus as ResponseStatus }))
      }
      setMessage(`Updated ${previous.document_label} for ${candidates.find((candidate) => candidate.id === candidateId)?.name ?? 'candidate'}.`)
      setMessageIsError(false)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not update the checklist. Please try again.')
      setMessageIsError(true)
    } finally {
      setSaving(null)
    }
  }

  async function updateResponseStatus(candidateId: string, status: ResponseStatus) {
    const previous = responseStatuses[candidateId]
    setSaving(`${candidateId}:response`)
    setMessage('')
    try {
      const response = await fetch(`/api/admin/candidates/${candidateId}/offer-response`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Could not update offer status.')
      setResponseStatuses((current) => ({ ...current, [candidateId]: status }))
      if (status === 'signed_received' || status === 'awaiting_response') {
        const signedStatus: OfferDocumentStatus = status === 'signed_received' ? 'received' : 'pending'
        setRows((current) => current.map((row) => row.submission_id === candidateId && row.document_key === 'signed_offer_letter' ? { ...row, status: signedStatus } : row))
      }
      setMessage(`Offer response status updated for ${candidates.find((candidate) => candidate.id === candidateId)?.name ?? 'candidate'}.`)
      setMessageIsError(false)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not update offer status.')
      setMessageIsError(true)
      setResponseStatuses((current) => ({ ...current, [candidateId]: previous }))
    } finally {
      setSaving(null)
    }
  }

  async function sendReminder(candidateId: string) {
    setReminding(candidateId)
    setMessage('')
    try {
      const response = await fetch(`/api/admin/candidates/${candidateId}/offer-documents/remind`, { method: 'POST' })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Could not send reminder.')
      const now = result.lastReminderAt as string
      const count = result.reminderCount as number
      setRows((current) => current.map((row) => row.submission_id === candidateId ? { ...row, last_reminder_at: now, reminder_count: count } : row))
      setMessage(`Offer document reminder sent to ${candidates.find((candidate) => candidate.id === candidateId)?.email ?? 'candidate'}.`)
      setMessageIsError(false)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not send reminder.')
      setMessageIsError(true)
    } finally {
      setReminding(null)
    }
  }

  if (!candidates.length) return <section className="mt-8 rounded-3xl border border-[#ded8ca] bg-white p-6"><p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#f47700]">After the offer</p><h2 className="mt-2 text-2xl font-semibold text-[#101b30]">Signed offer & pre-deployment documents</h2><p className="mt-2 text-sm leading-6 text-[#455c7d]">This checklist is for candidates who completed and passed assessment and received an offer. It tracks post-offer/pre-deployment requirements only, not initial application documents.</p><div className="mt-5 rounded-2xl bg-[#faf8f2] p-5 text-sm text-[#455c7d]">No sent offers are waiting for post-offer document tracking yet.</div></section>

  return <section className="mt-8 rounded-3xl border border-[#ded8ca] bg-white p-6">
    <div className="flex flex-col justify-between gap-3 border-b border-[#eee9df] pb-5 sm:flex-row sm:items-end">
      <div><p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#f47700]">After the offer</p><h2 className="mt-2 text-2xl font-semibold text-[#101b30]">Signed offer & pre-deployment documents</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-[#455c7d]">For candidates who completed and passed assessment and received an offer. Update each item after HR receives it by email. These are post-offer requirements, not initial application documents or applicant-upload portal files.</p></div>
      <div className="flex shrink-0 items-center gap-2 rounded-full bg-[#f5f7f5] px-3 py-2 text-xs font-semibold text-[#455c7d]"><FileCheck2 className="size-4 text-[#f47700]" />{candidates.length} candidate{candidates.length === 1 ? '' : 's'} in follow-up</div>
    </div>
    <div className="mt-5 flex flex-col gap-4">
      {candidates.map((candidate) => {
        const candidateRows = documentsByCandidate.get(candidate.id) ?? []
        const completeCount = candidateRows.filter((row) => row.status !== 'pending').length
        const pendingCount = candidateRows.filter((row) => row.status === 'pending').length
        const latestReminder = candidateRows.reduce<string | null>((latest, row) => !row.last_reminder_at || (latest && latest > row.last_reminder_at) ? latest : row.last_reminder_at, null)
        const requiredCount = candidateRows.filter((row) => OFFER_DOCUMENT_CHECKLIST.find((item) => item.key === row.document_key)?.optional === false).length
        const requiredDone = candidateRows.filter((row) => row.status === 'received' && OFFER_DOCUMENT_CHECKLIST.find((item) => item.key === row.document_key)?.optional === false).length
        return <article key={candidate.id} className="overflow-hidden rounded-2xl border border-[#e9e3d8]">
          <header className="flex flex-col gap-4 bg-[#faf8f2] px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0"><p className="truncate font-semibold text-[#101b30]">{candidate.name}</p><p className="mt-0.5 truncate text-sm text-[#455c7d]">{candidate.email}{candidate.role ? ` · ${candidate.role}` : ''}</p><div className="mt-2 flex flex-wrap items-center gap-2 text-xs"><span className="rounded-full bg-white px-3 py-1.5 font-semibold text-[#455c7d]">{candidate.reference ?? 'Offer sent'}</span>{candidate.deadline && <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-[#455c7d]"><Clock3 className="size-3.5" />Documents due {candidate.deadline}</span>}<span className="rounded-full bg-[#e8f2ec] px-3 py-1.5 font-semibold text-[#1d6844]">{requiredDone}/{requiredCount} required received · {completeCount}/{candidateRows.length} updated</span>{latestReminder && <span className="rounded-full bg-white px-3 py-1.5 text-[#455c7d]">Last reminder {new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium' }).format(new Date(latestReminder))}{candidate.reminderCount > 0 ? ` · ${candidate.reminderCount} sent` : ''}</span>}</div></div>
            <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-end">
              <div><label htmlFor={`offer-response-${candidate.id}`} className="mb-1 block text-xs font-semibold text-[#455c7d]">Offer response status</label><select id={`offer-response-${candidate.id}`} value={responseStatuses[candidate.id]} disabled={saving === `${candidate.id}:response`} onChange={(event) => updateResponseStatus(candidate.id, event.target.value as ResponseStatus)} className="h-10 min-w-48 rounded-xl border border-[#ded8ca] bg-white px-3 text-sm font-semibold text-[#25344b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f47700] disabled:opacity-60"><option value="awaiting_response">Awaiting response</option><option value="signed_received">Signed offer returned</option><option value="declined">Declined</option><option value="withdrawn">Withdrawn</option></select></div>
              <button type="button" onClick={() => sendReminder(candidate.id)} disabled={!pendingCount || reminding === candidate.id || responseStatuses[candidate.id] === 'declined' || responseStatuses[candidate.id] === 'withdrawn'} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#f47700] px-4 text-sm font-semibold text-white transition hover:bg-[#d96900] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f47700] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-[#d9d3c8] disabled:text-[#6f6a60]" aria-label={`Send offer document reminder to ${candidate.name} for ${pendingCount} outstanding item${pendingCount === 1 ? '' : 's'}`}>{reminding === candidate.id ? <LoaderCircle className="size-4 animate-spin" /> : <Send className="size-4" />}{reminding === candidate.id ? 'Sending…' : pendingCount ? `Send reminder (${pendingCount})` : 'All items received'}</button>
            </div>
          </header>
          <div className="grid gap-2 p-4 sm:grid-cols-2 xl:grid-cols-3">
            {candidateRows.map((row) => {
              const optional = OFFER_DOCUMENT_CHECKLIST.find((item) => item.key === row.document_key)?.optional ?? false
              const controlId = `status-${candidate.id}-${row.document_key}`
              const isSaving = saving === `${candidate.id}:${row.document_key}`
              return <div key={row.document_key} className="flex min-w-0 items-center gap-3 rounded-xl border border-[#eee9df] bg-white p-3">
                <span className={`flex size-8 shrink-0 items-center justify-center rounded-full ${row.status === 'received' ? 'bg-[#e8f2ec] text-[#1d6844]' : row.status === 'not_applicable' ? 'bg-[#f2f0eb] text-[#6e6a60]' : 'bg-[#fff4e8] text-[#a65b12]'}`}>{row.status === 'received' ? <Check className="size-4" /> : <Clock3 className="size-4" />}</span>
                <div className="min-w-0 flex-1"><label htmlFor={controlId} className="block text-xs font-semibold leading-5 text-[#25344b]">{row.document_label}</label><select id={controlId} value={row.status} disabled={isSaving} onChange={(event) => updateStatus(candidate.id, row.document_key, event.target.value as OfferDocumentStatus)} className="mt-1 h-8 w-full rounded-lg border border-[#ded8ca] bg-white px-2 text-xs font-medium text-[#455c7d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f47700] disabled:opacity-60"><option value="pending">Not received</option><option value="received">Received</option>{optional && <option value="not_applicable">Not applicable</option>}</select></div>
              </div>
            })}
          </div>
        </article>
      })}
    </div>
    <p role="status" aria-live="polite" className={`mt-4 min-h-5 text-sm font-medium ${messageIsError ? 'text-[#a12c22]' : 'text-[#28704d]'}`}>{message}</p>
  </section>
}
