'use client'

import { useState } from 'react'
import { LoaderCircle } from 'lucide-react'

type Candidate = { id: string; email: string; full_name: string; decision_status: string | null; notification_status: string | null; notification_error: string | null }

export default function CandidateDecisionActions({ candidate }: { candidate: Candidate }) {
  const [state, setState] = useState(candidate)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  async function decide(decision: 'passed' | 'not_passed') {
    setBusy(true); setMessage('')
    try { const response = await fetch('/api/admin/candidates/decision', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ submissionId: state.id, decision }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Notification failed.'); setState({ ...state, decision_status: decision, notification_status: 'sent', notification_error: null }); setMessage('Decision email sent to the candidate.') } catch (error) { const text = error instanceof Error ? error.message : 'Notification failed.'; setState({ ...state, decision_status: decision, notification_status: 'failed', notification_error: text }); setMessage(text) } finally { setBusy(false) }
  }
  return <div className="rounded-3xl border border-border bg-card p-6"><h2 className="text-xl font-semibold">Decision</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Choose the final outcome manually. A fixed notification will be sent to the candidate.</p><div className="mt-5 flex flex-col gap-3"><button type="button" disabled={busy} onClick={() => decide('passed')} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/20 disabled:cursor-wait disabled:opacity-60">{busy && <LoaderCircle className="size-4 animate-spin" />}Mark as passed and notify</button><button type="button" disabled={busy} onClick={() => decide('not_passed')} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-4 text-sm font-semibold text-destructive hover:bg-destructive/10 disabled:cursor-wait disabled:opacity-60">{busy && <LoaderCircle className="size-4 animate-spin" />}Mark as not passed and notify</button></div>{state.notification_status && <p className={`mt-4 rounded-xl border px-3 py-2 text-sm ${state.notification_status === 'sent' ? 'border-primary/20 bg-primary/10 text-primary' : state.notification_status === 'failed' ? 'border-destructive/30 bg-destructive/10 text-destructive' : 'border-border bg-muted'}`}>{message || `Notification ${state.notification_status}.`}</p>}</div>
}
