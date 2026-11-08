'use client'

import { useState } from 'react'

type Props = { type: 'document' | 'interview'; role: string }

export default function TestEmailButton({ type, role }: Props) {
  const [to, setTo] = useState('')
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null)

  async function sendTest() {
    setBusy(true); setStatus(null)
    try {
      const response = await fetch('/api/admin/email/test', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type, role, to }) })
      const data = await response.json().catch(() => ({}))
      setStatus(response.ok
        ? { ok: true, text: `Test email sent to ${data.sentTo}. The button inside it is a sample link and will not open a real portal.` }
        : { ok: false, text: data.error || 'The test email could not be sent.' })
    } catch { setStatus({ ok: false, text: 'Network error. Please try again.' }) } finally { setBusy(false) }
  }

  return <div className="rounded-xl border border-dashed border-[#ded8ca] bg-[#f7f8f6] p-4">
    <p className="text-sm font-semibold text-[#101b30]">Preview before sending</p>
    <p className="mt-1 text-sm text-[#455c7d]">Send yourself the exact email applicants will receive. Leave the address empty to use your admin email.</p>
    <div className="mt-3 flex flex-col gap-3 sm:flex-row">
      <label className="sr-only" htmlFor={`test-email-${type}`}>Test email address</label>
      <input id={`test-email-${type}`} type="email" value={to} onChange={event => setTo(event.target.value)} placeholder="Your email (optional)" className="h-11 flex-1 rounded-xl border border-[#ded8ca] bg-white px-3 text-sm" />
      <button type="button" onClick={sendTest} disabled={busy || role.trim().length < 2} className="h-11 shrink-0 rounded-xl border border-[#f47700] bg-white px-4 text-sm font-semibold text-[#f47700] disabled:opacity-50">{busy ? 'Sending test…' : 'Send test email'}</button>
    </div>
    {status && <p role="status" className={`mt-3 text-sm font-semibold ${status.ok ? 'text-[#28704d]' : 'text-[#9a3412]'}`}>{status.text}</p>}
  </div>
}
