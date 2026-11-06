'use client'

import { useState } from 'react'

export default function SendAssessmentForm({ interviewId, email, assessments }: { interviewId: string; email: string | null; assessments: { id: string; title: string; access_code: string }[] }) {
  const [assessmentId, setAssessmentId] = useState(assessments[0]?.id || '')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  async function send() {
    setSending(true); setMessage('')
    const response = await fetch(`/api/admin/interviews/${interviewId}/assessment`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ assessmentId }) })
    const data = await response.json().catch(() => ({}))
    setMessage(response.ok ? 'Assessment link sent.' : data.error || 'Could not send assessment.')
    setSending(false)
  }
  if (!email) return <p className="text-sm text-[#455c7d]">No applicant email was captured for this interview.</p>
  return <div className="grid gap-3"><p className="text-sm text-[#455c7d]">Send a skills assessment to {email}.</p><select value={assessmentId} onChange={event => setAssessmentId(event.target.value)} className="h-11 rounded-xl border border-[#ded8ca] bg-white px-3">{assessments.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select><button type="button" onClick={send} disabled={sending || !assessmentId} className="rounded-xl bg-[#f47700] px-4 py-2 font-semibold text-white disabled:opacity-50">{sending ? 'Sending…' : 'Send assessment link'}</button>{message && <p className="text-sm font-semibold text-[#36835d]">{message}</p>}</div>
}
