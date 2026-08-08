'use client'

import { useState } from 'react'
import { LoaderCircle, ArrowRight } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function AssessmentAccessPage() {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  return <main className="flex min-h-screen items-center justify-center bg-background px-5"><div className="w-full max-w-lg rounded-3xl border border-border bg-card p-8 shadow-sm"><p className="text-sm font-semibold uppercase tracking-widest text-primary">CARE International</p><h1 className="mt-4 text-3xl font-semibold">Enter your assessment code</h1><p className="mt-3 leading-7 text-muted-foreground">Use the access code from the assessment link shared by the hiring team.</p><form onSubmit={event => { event.preventDefault(); if (!code.trim() || busy) return; setBusy(true); router.push(`/assessment/${code.trim().toUpperCase()}`) }} className="mt-7 flex flex-col gap-3"><label htmlFor="access-code" className="text-sm font-semibold">Access code</label><input id="access-code" required value={code} onChange={event => setCode(event.target.value)} placeholder="CARE-XXXXXX" className="h-12 rounded-xl border border-input bg-background px-4 font-mono uppercase outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20" /><button type="submit" disabled={busy || !code.trim()} aria-busy={busy} className="inline-flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:-translate-y-0.5 hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60">{busy ? <><LoaderCircle className="size-5 animate-spin" />Opening assessment…</> : <>{'Continue'}<ArrowRight className="size-5" /></>}</button></form></div></main>
}
