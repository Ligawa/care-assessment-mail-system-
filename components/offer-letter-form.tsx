'use client'

import { useState } from 'react'
import { Download, FileText, LoaderCircle, Send } from 'lucide-react'

type OfferFormState = { applicantName: string; jobTitle: string; startDate: string; workArrangement: string; department: string; contractType: string; contractDuration: string; basicSalary: string; documentDeadline: string; acceptanceDeadline: string }

export default function OfferLetterForm({ candidateId, applicantName, jobTitle, disabled = false }: { candidateId: string; applicantName: string; jobTitle: string; disabled?: boolean }) {
  const [form, setForm] = useState<OfferFormState>({ applicantName, jobTitle, startDate: '', workArrangement: 'Remote', department: 'Finance', contractType: 'Fixed-Term', contractDuration: '2 years, renewable', basicSalary: '4500', documentDeadline: '', acceptanceDeadline: '' })
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)
  const [previewing, setPreviewing] = useState(false)

  const payload = () => JSON.stringify({ submissionId: candidateId, ...form, basicSalary: Number(form.basicSalary) })

  async function issueOffer(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setStatus('')
    try {
      const response = await fetch('/api/admin/candidates/offer', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload() })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Offer could not be sent.')
      setStatus(data.message)
    } catch (error) { setStatus(error instanceof Error ? error.message : 'Offer could not be sent.') } finally { setBusy(false) }
  }

  async function downloadDraft() {
    const formElement = document.getElementById('offer-form') as HTMLFormElement | null
    if (formElement && !formElement.reportValidity()) return
    setPreviewing(true); setStatus('')
    try {
      const response = await fetch('/api/admin/candidates/offer/preview', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload() })
      if (!response.ok) { const data = await response.json(); throw new Error(data.error || 'Draft could not be generated.') }
      const url = URL.createObjectURL(await response.blob())
      const link = document.createElement('a')
      link.href = url
      link.download = `offer-draft-${form.applicantName.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.pdf`
      link.click()
      URL.revokeObjectURL(url)
      setStatus('Draft downloaded. Nothing was sent to the candidate.')
    } catch (error) { setStatus(error instanceof Error ? error.message : 'Draft could not be generated.') } finally { setPreviewing(false) }
  }

  const inputClass = 'h-10 rounded-xl border border-border bg-background px-3 font-normal outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-60'
  const field = (key: keyof OfferFormState, label: string, type = 'text') => <label className="grid gap-1.5 text-sm font-semibold"><span>{label}</span><input required disabled={disabled || busy} type={type} value={form[key]} onChange={event => setForm(previous => ({ ...previous, [key]: event.target.value }))} className={inputClass} /></label>

  return <section className="mt-6 rounded-3xl border border-primary/20 bg-primary/5 p-5">
    <div className="flex items-start gap-3"><div className="rounded-xl bg-primary/10 p-2 text-primary"><FileText className="size-5" /></div><div><h2 className="font-semibold">Issue conditional offer</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">Complete the offer terms. The system generates a detailed offer letter PDF, emails it to the candidate, and keeps a copy you can download from the Offers page. Use the draft download to review the letter before sending.</p></div></div>
    <form id="offer-form" onSubmit={issueOffer} className="mt-5 grid gap-4 sm:grid-cols-2">
      {field('applicantName', 'Applicant full name')}
      <label className="grid gap-1.5 text-sm font-semibold"><span>Job title</span><input required disabled={disabled || busy} type="text" value={form.jobTitle} readOnly aria-readonly="true" className="h-10 rounded-xl border border-border bg-muted px-3 font-normal outline-none" /></label>
      <label className="grid gap-1.5 text-sm font-semibold"><span>Basic salary (USD per month)</span><div className="flex h-10 items-center overflow-hidden rounded-xl border border-border bg-background focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20"><span className="border-r border-border bg-muted px-3 text-sm font-medium text-muted-foreground">USD</span><input required disabled={disabled || busy} type="number" min="1" step="any" inputMode="decimal" value={form.basicSalary} onChange={event => setForm(previous => ({ ...previous, basicSalary: event.target.value }))} className="h-full min-w-0 flex-1 bg-transparent px-3 font-normal outline-none disabled:opacity-60" /><span className="px-3 text-sm font-medium text-muted-foreground">/ month</span></div></label>
      {field('contractDuration', 'Contract duration')}
      {field('startDate', 'Proposed start date', 'date')}
      {field('workArrangement', 'Work arrangement')}
      {field('department', 'Department / programme')}
      {field('contractType', 'Contract type')}
      {field('documentDeadline', 'Document submission deadline', 'date')}
      {field('acceptanceDeadline', 'Acceptance deadline', 'date')}
      <div className="rounded-xl border border-border bg-muted/50 px-3 py-2 text-sm sm:col-span-2"><span className="font-semibold">HR reference</span><p className="mt-1 font-mono text-xs text-muted-foreground">Automatically generated when the offer is issued.</p></div>
      <button type="button" onClick={downloadDraft} disabled={disabled || busy || previewing} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-primary/30 bg-background px-4 text-sm font-semibold text-primary transition hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-50">{previewing ? <LoaderCircle className="size-4 animate-spin" /> : <Download className="size-4" />}{previewing ? 'Preparing draft…' : 'Download draft PDF'}</button>
      <button type="submit" disabled={disabled || busy} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/20 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50">{busy ? <LoaderCircle className="size-4 animate-spin" /> : <Send className="size-4" />}{busy ? 'Generating and sending…' : 'Issue offer and notify candidate'}</button>
    </form>
    {status && <p role="status" className="mt-4 rounded-xl bg-background px-3 py-2 text-sm text-muted-foreground">{status}</p>}
  </section>
}
