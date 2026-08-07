'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AssessmentAccessPage() {
  const router = useRouter()
  const [code, setCode] = useState('')
  return <main className="flex min-h-screen items-center justify-center bg-background px-5"><div className="w-full max-w-lg rounded-3xl border border-border bg-card p-8 shadow-sm"><p className="text-sm font-semibold uppercase tracking-widest text-primary">CARE International</p><h1 className="mt-4 text-3xl font-semibold">Enter your assessment code</h1><p className="mt-3 leading-7 text-muted-foreground">Use the access code from the assessment link shared by the hiring team.</p><form onSubmit={event => { event.preventDefault(); if (code.trim()) router.push(`/assessment/${code.trim().toUpperCase()}`) }} className="mt-7 flex flex-col gap-3"><label htmlFor="access-code" className="text-sm font-semibold">Access code</label><input id="access-code" required value={code} onChange={event => setCode(event.target.value)} placeholder="CARE-XXXXXX" className="h-12 rounded-xl border border-input bg-background px-4 font-mono uppercase" /><button className="rounded-full bg-primary px-5 py-3 font-semibold text-primary-foreground">Continue</button></form></div></main>
}
