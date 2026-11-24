'use client'

import { useState } from 'react'
import { CALL_RETENTION_DAYS } from '@/lib/call-agent-guardrails'
import { ArrowDownLeft, ArrowUpRight, Check, ChevronDown, Clock3, Headphones, LoaderCircle, MessageSquareText, Phone, RefreshCw, ShieldCheck } from 'lucide-react'

type CallRecord = {
  id: string
  conversation_id: string | null
  interview_session_id: string | null
  direction: 'inbound' | 'outbound'
  status: string
  candidate_name: string | null
  candidate_email: string | null
  phone_number: string | null
  role: string | null
  transcript: { role?: string; message?: string | null; time_in_call_secs?: number }[]
  summary: string | null
  outcome: string | null
  duration_seconds: number | null
  started_at: string | null
  ended_at: string | null
  created_at: string
  error_message: string | null
}

type Candidate = { id: string; candidate_name: string | null; candidate_email: string | null; role: string; status: string; created_at: string }

export default function CallCenter({ initialCalls, candidates, initialGuardrailsApplied, providerConfigured, providerError: initialProviderError, retentionDays: initialRetentionDays, recordingEnabled: initialRecordingEnabled }: { initialCalls: CallRecord[]; candidates: Candidate[]; initialGuardrailsApplied: boolean; providerConfigured: boolean; providerError: string; retentionDays: number | null; recordingEnabled: boolean }) {
  const [calls, setCalls] = useState(initialCalls)
  const [guardrailsApplied, setGuardrailsApplied] = useState(initialGuardrailsApplied)
  const [providerReady, setProviderReady] = useState(providerConfigured)
  const [retentionDays, setRetentionDays] = useState(initialRetentionDays)
  const [recordingEnabled, setRecordingEnabled] = useState(initialRecordingEnabled)
  const [selectedCandidateId, setSelectedCandidateId] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [consentConfirmed, setConsentConfirmed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [syncBusy, setSyncBusy] = useState(false)
  const [guardrailBusy, setGuardrailBusy] = useState(false)
  const [activeTranscript, setActiveTranscript] = useState<string | null>(null)
  const [providerError, setProviderError] = useState(initialProviderError)
  const [notice, setNotice] = useState<{ message: string; error: boolean } | null>(null)

  const selectedCandidate = candidates.find(candidate => candidate.id === selectedCandidateId)
  const completedCalls = calls.filter(call => call.status === 'done').length
  const inboundCalls = calls.filter(call => call.direction === 'inbound').length
  const formatDate = (value: string | null) => value ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—'
  const formatDuration = (seconds: number | null) => seconds === null ? '—' : `${Math.floor(seconds / 60)}m ${seconds % 60}s`

  async function syncCalls() {
    setSyncBusy(true)
    try {
      const response = await fetch('/api/admin/calls', { cache: 'no-store' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Unable to refresh call history.')
      setCalls(data.calls ?? [])
      setProviderError(data.providerError || '')
      setNotice({ message: 'Call history refreshed.', error: false })
    } catch (error) {
      setNotice({ message: error instanceof Error ? error.message : 'Unable to refresh call history.', error: true })
    } finally { setSyncBusy(false) }
  }

  async function applyGuardrails() {
    setGuardrailBusy(true)
    try {
      const response = await fetch('/api/admin/calls/agent', { method: 'POST' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Unable to configure the agent.')
      setGuardrailsApplied(true)
      setProviderReady(true)
      setProviderError('')
      setRecordingEnabled(data.recordingEnabled === true)
      setRetentionDays(typeof data.retentionDays === 'number' ? data.retentionDays : null)
      setNotice({ message: data.message || 'Agent guardrails applied.', error: false })
    } catch (error) {
      setNotice({ message: error instanceof Error ? error.message : 'Unable to configure the agent.', error: true })
    } finally { setGuardrailBusy(false) }
  }

  async function startCall(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedCandidate && !phoneNumber.trim()) return
    if (!consentConfirmed) {
      setNotice({ message: 'Confirm candidate consent before placing the call.', error: true })
      return
    }
    setBusy(true)
    try {
      const response = await fetch('/api/admin/calls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: phoneNumber.trim(),
          consentConfirmed,
          candidateName: selectedCandidate?.candidate_name || '',
          candidateEmail: selectedCandidate?.candidate_email || '',
          role: selectedCandidate?.role || '',
          interviewSessionId: selectedCandidate?.id || '',
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Unable to start call.')
      setCalls(current => [data.call, ...current.filter(call => call.id !== data.call.id)])
      setPhoneNumber('')
      setSelectedCandidateId('')
      setConsentConfirmed(false)
      setNotice({ message: 'Outbound call started. The agent will disclose the recording and request verbal consent before interview questions.', error: false })
    } catch (error) {
      setNotice({ message: error instanceof Error ? error.message : 'Unable to start call.', error: true })
    } finally { setBusy(false) }
  }

  async function loadTranscript(call: CallRecord) {
    if (activeTranscript === call.id) {
      setActiveTranscript(null)
      return
    }
    if (!call.conversation_id) {
      setNotice({ message: 'This call is still syncing with ElevenLabs. Refresh call history in a moment.', error: true })
      return
    }
    setActiveTranscript(call.id)
    try {
      const response = await fetch(`/api/admin/calls/${encodeURIComponent(call.conversation_id)}`, { cache: 'no-store' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Unable to load transcript.')
      setCalls(current => current.map(item => item.id === call.id ? data.call : item))
    } catch (error) {
      setNotice({ message: error instanceof Error ? error.message : 'Unable to load transcript.', error: true })
      setActiveTranscript(null)
    }
  }

  return <main className="min-h-screen bg-background">
    <header className="border-b border-border bg-card">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-5 lg:px-8">
        <div className="flex items-center gap-3"><div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Headphones aria-hidden="true" /></div><div><a href="/admin" className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">CARE International · Admin</a><h1 className="mt-1 text-2xl font-semibold tracking-tight">Call centre</h1></div></div>
        <div className="flex flex-wrap items-center gap-3"><span className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold ${guardrailsApplied ? 'border-primary/20 bg-primary/5 text-primary' : 'border-amber-300 bg-amber-50 text-amber-900'}`}><span className={`size-2 rounded-full ${guardrailsApplied ? 'bg-primary' : 'bg-amber-500'}`} />{guardrailsApplied ? 'Agent guardrails active' : 'Agent setup required'}</span><button type="button" onClick={syncCalls} disabled={syncBusy} className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-semibold hover:bg-muted disabled:opacity-60"><RefreshCw aria-hidden="true" className={`size-4 ${syncBusy ? 'animate-spin' : ''}`} />Sync call history</button></div>
      </div>
    </header>

    <div className="mx-auto max-w-7xl px-5 py-7 lg:px-8">
      {notice && <div role={notice.error ? 'alert' : 'status'} className={`mb-6 rounded-2xl border px-4 py-3 text-sm ${notice.error ? 'border-destructive/30 bg-destructive/5 text-destructive' : 'border-primary/20 bg-primary/5 text-foreground'}`}>{notice.message}</div>}
      {providerError && <div role="alert" className="mb-6 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">{providerError}</div>}
      {providerReady && !recordingEnabled && <div role="alert" className="mb-6 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950"><strong>Call recording is off:</strong> Apply the agent guardrails below to enable recording and the 90-day retention policy for inbound and outbound calls.</div>}
      {recordingEnabled && retentionDays !== CALL_RETENTION_DAYS && <div role="alert" className="mb-6 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950"><strong>Call-data retention:</strong> The approved 90-day retention policy has not been confirmed in ElevenLabs yet. Apply the agent guardrails below before placing calls.</div>}
      {recordingEnabled && retentionDays === 90 && <div role="note" className="mb-6 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm leading-6 text-foreground"><strong>Call-data retention:</strong> Recordings and transcripts are configured for automatic deletion after 90 days. Call-log records are also deleted daily after 90 days.</div>}

      <section aria-label="Call activity overview" className="grid gap-4 sm:grid-cols-3">
        <Metric label="Calls on record" value={calls.length} icon={<Phone aria-hidden="true" />} />
        <Metric label="Completed" value={completedCalls} icon={<Check aria-hidden="true" />} />
        <Metric label="Inbound" value={inboundCalls} icon={<ArrowDownLeft aria-hidden="true" />} />
      </section>

      <div className="mt-6 grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_370px]">
        <section className="overflow-hidden rounded-3xl border border-border bg-card">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-5 sm:px-6"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Inbound & outbound</p><h2 className="mt-1 text-xl font-semibold">Recent calls</h2></div><span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">{calls.length} records</span></div>
          <div className="divide-y divide-border">
            {calls.map(call => <article key={call.id} className="px-5 py-5 sm:px-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2"><span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-semibold capitalize text-foreground">{call.direction === 'inbound' ? <ArrowDownLeft aria-hidden="true" className="size-3.5" /> : <ArrowUpRight aria-hidden="true" className="size-3.5" />}{call.direction}</span><Status status={call.status} /></div>
                  <h3 className="mt-3 truncate text-base font-semibold">{call.candidate_name || call.phone_number || (call.direction === 'inbound' ? 'Incoming caller' : 'Candidate call')}</h3>
                  <p className="mt-1 truncate text-sm text-muted-foreground">{[call.role, call.candidate_email, call.phone_number].filter(Boolean).join(' · ') || 'Candidate details are not available'}</p>
                </div>
                <div className="shrink-0 text-right"><p className="text-sm font-medium">{formatDate(call.started_at || call.created_at)}</p><p className="mt-1 inline-flex items-center justify-end gap-1 text-xs text-muted-foreground"><Clock3 aria-hidden="true" className="size-3.5" />{formatDuration(call.duration_seconds)}</p></div>
              </div>
              {call.summary && <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">{call.summary}</p>}
              {call.error_message && <p className="mt-3 text-sm text-destructive">{call.error_message}</p>}
              {call.conversation_id && <button type="button" aria-expanded={activeTranscript === call.id} onClick={() => loadTranscript(call)} className="mt-4 inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold hover:bg-muted"><MessageSquareText aria-hidden="true" className="size-4" />{activeTranscript === call.id ? 'Hide transcript' : 'View transcript'}<ChevronDown aria-hidden="true" className={`size-4 transition-transform ${activeTranscript === call.id ? 'rotate-180' : ''}`} /></button>}
              {activeTranscript === call.id && <div className="mt-4 flex flex-col gap-3 rounded-2xl bg-muted/60 p-4" aria-label="Call transcript">{call.transcript.length ? call.transcript.map((turn, index) => <div key={`${call.id}-${index}`} className="grid grid-cols-[72px_1fr] gap-3 text-sm leading-6"><span className="font-semibold capitalize text-primary">{turn.role === 'user' ? 'Candidate' : 'Agent'}</span><p className="whitespace-pre-wrap text-foreground">{turn.message || '—'}</p></div>) : <p className="text-sm text-muted-foreground">Transcript is not available yet.</p>}</div>}
            </article>)}
            {calls.length === 0 && <div className="px-6 py-14 text-center"><div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground"><Phone aria-hidden="true" /></div><h3 className="mt-4 font-semibold">No calls synced yet</h3><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">Use “Sync call history” to import inbound calls, or place an outbound call from this page.</p></div>}
          </div>
        </section>

        <aside className="flex flex-col gap-5">
          <form onSubmit={startCall} className="rounded-3xl border border-border bg-card p-5 sm:p-6">
            <div className="flex items-center gap-3"><div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><Phone aria-hidden="true" className="size-5" /></div><div><p className="text-xs font-semibold uppercase tracking-[0.15em] text-primary">Outbound</p><h2 className="font-semibold">Start a call</h2></div></div>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">The AI assistant opens by identifying itself, disclosing recording/transcription, and requesting verbal consent before any interview questions.</p>
            <label className="mt-5 flex flex-col gap-2 text-sm font-semibold" htmlFor="candidate">Interview record <span className="font-normal text-muted-foreground">Optional</span>
              <select id="candidate" value={selectedCandidateId} onChange={event => { setSelectedCandidateId(event.target.value); const candidate = candidates.find(item => item.id === event.target.value); if (candidate) setPhoneNumber('') }} className="h-11 rounded-xl border border-input bg-background px-3 font-normal"><option value="">Manual call</option>{candidates.map(candidate => <option key={candidate.id} value={candidate.id}>{candidate.candidate_name || candidate.candidate_email || 'Candidate'} · {candidate.role}</option>)}</select>
            </label>
            {selectedCandidate && <div className="mt-3 rounded-xl bg-muted/70 px-3 py-2.5 text-xs leading-5 text-muted-foreground">{selectedCandidate.candidate_name || 'Candidate'}{selectedCandidate.candidate_email ? ` · ${selectedCandidate.candidate_email}` : ''}<br />{selectedCandidate.role}</div>}
            <label className="mt-4 flex flex-col gap-2 text-sm font-semibold" htmlFor="phone">Phone number <span className="font-normal text-muted-foreground">International format, starting with + and country code</span>
              <input id="phone" type="tel" required value={phoneNumber} onChange={event => setPhoneNumber(event.target.value)} placeholder="+15551234567" autoComplete="tel" pattern="\+[1-9][0-9]{7,14}" title="Enter a valid international number starting with +" className="h-11 rounded-xl border border-input bg-background px-3 font-normal" />
            </label>
            <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-2xl border border-border p-3 text-xs leading-5 text-muted-foreground"><input type="checkbox" checked={consentConfirmed} onChange={event => setConsentConfirmed(event.target.checked)} className="mt-0.5 size-4 shrink-0 accent-primary" /><span>I confirm the candidate has agreed to an AI-led, recorded call, with recordings and transcripts retained for up to 90 days for recruitment review.</span></label>
            <button type="submit" disabled={busy || !consentConfirmed || !guardrailsApplied || !providerReady} className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50">{busy ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : <Phone aria-hidden="true" className="size-4" />}{busy ? 'Connecting…' : 'Place outbound call'}</button>
            {!providerReady && <p className="mt-3 text-xs text-destructive">ElevenLabs is unavailable. Check the error above, then retry agent setup.</p>}
            {!guardrailsApplied && providerReady && <p className="mt-3 text-xs text-amber-800">Apply agent guardrails below before placing calls.</p>}
          </form>

          <section className="rounded-3xl border border-border bg-card p-5 sm:p-6">
            <div className="flex items-start gap-3"><div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><ShieldCheck aria-hidden="true" className="size-5" /></div><div><p className="text-xs font-semibold uppercase tracking-[0.15em] text-primary">Agent controls</p><h2 className="mt-1 font-semibold">Interview safeguards</h2></div></div>
            <ul className="mt-4 flex flex-col gap-3 text-sm leading-5 text-muted-foreground"><li>Disclose AI and recording; ask verbal consent before questions.</li><li>Offer to verify CARE vacancy codes, application references, and offer references.</li><li>Offer repeat, pause, skip, human follow-up, and stop commands.</li><li>No protected-characteristic questions, candidate ranking, or hiring decisions.</li><li>Keep final screening and employment decisions with a human reviewer.</li></ul>
            <button type="button" onClick={applyGuardrails} disabled={guardrailBusy} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold hover:bg-muted disabled:opacity-50">{guardrailBusy ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : <ShieldCheck aria-hidden="true" className="size-4" />}{guardrailsApplied ? 'Reapply agent guardrails' : 'Apply agent guardrails'}</button>
          </section>
        </aside>
      </div>
    </div>
  </main>
}

function Metric({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return <article className="flex items-center justify-between rounded-2xl border border-border bg-card p-5"><div><p className="text-sm text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p></div><div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">{icon}</div></article>
}

function Status({ status }: { status: string }) {
  const color = status === 'done' ? 'border-primary/20 bg-primary/5 text-primary' : status === 'failed' ? 'border-destructive/20 bg-destructive/5 text-destructive' : 'border-border bg-background text-muted-foreground'
  return <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${color}`}>{status.replace('-', ' ')}</span>
}
