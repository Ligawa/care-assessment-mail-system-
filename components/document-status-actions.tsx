'use client'

import { useState } from 'react'

export default function DocumentStatusActions({ id, status }: { id: string; status: string }) {
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  async function remind() { setSending(true); const response = await fetch(`/api/admin/documents/${id}/remind`, { method: 'POST' }); const data = await response.json(); setMessage(response.ok ? data.deleted ? 'Second reminder sent; applicant record and uploaded files permanently deleted.' : 'Reminder sent.' : data.error || 'Reminder failed.'); setSending(false) }
  return <div className="mt-5 flex flex-wrap items-center gap-3"><span className="text-sm text-[#455c7d]">{status === 'documents_received' ? 'Next step: review submitted documents.' : 'Next step: wait for applicant submission.'}</span>{status !== 'documents_received' && <button type="button" onClick={remind} disabled={sending} className="rounded-xl border border-[#f47700] px-3 py-2 text-sm font-semibold text-[#f47700] disabled:opacity-50">{sending ? 'Sending…' : 'Send reminder'}</button>}{message && <span className="text-sm font-semibold text-[#28704d]">{message}</span>}</div>
}
