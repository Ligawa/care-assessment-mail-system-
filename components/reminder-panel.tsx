'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Item = { id: string; name: string; email: string; role: string; detail: string; lastReminder: string | null; reminders: number }

function ReminderList({ title, description, items, endpoint, idKey, emptyText }: { title: string; description: string; items: Item[]; endpoint: string; idKey: 'portalIds' | 'sessionIds'; emptyText: string }) {
  const router = useRouter()
  const [selected, setSelected] = useState<string[]>(items.map(item => item.id))
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState('')
  const [failed, setFailed] = useState<string[]>([])

  function toggle(id: string) { setSelected(current => current.includes(id) ? current.filter(value => value !== id) : [...current, id]) }

  async function send() {
    setSending(true); setMessage(''); setFailed([])
    try {
      const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ [idKey]: selected }) })
      const data = await response.json()
      if (!response.ok) { setMessage(data.error || 'Could not send reminders.'); return }
      setFailed(data.failedEmails || [])
      setMessage(`${data.sent} reminder${data.sent === 1 ? '' : 's'} sent.${data.deleted ? ` ${data.deleted} applicant record${data.deleted === 1 ? '' : 's'} and uploaded file${data.deleted === 1 ? '' : 's'} permanently deleted after the second reminder.` : ''}${data.cleanupFailed?.length ? ` Cleanup failed for ${data.cleanupFailed.length} applicant${data.cleanupFailed.length === 1 ? '' : 's'}; select and retry.` : ''}${data.failedEmails?.length ? ` ${data.failedEmails.length} reminder${data.failedEmails.length === 1 ? '' : 's'} failed and are listed below to retry.` : ''}`)
      router.refresh()
    } catch { setMessage('Network error. Please try again.') } finally { setSending(false) }
  }

  return <div className="rounded-2xl bg-[#f7f8f6] p-5">
    <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
      <div><h3 className="text-lg font-semibold text-[#101b30]">{title}</h3><p className="mt-1 max-w-xl text-sm text-[#455c7d]">{description}</p></div>
      <button type="button" onClick={send} disabled={sending || !selected.length} className="shrink-0 rounded-xl border border-[#f47700] bg-white px-4 py-2.5 text-sm font-semibold text-[#f47700] disabled:opacity-50">{sending ? 'Sending reminders…' : `Send reminders (${selected.length})`}</button>
    </div>
    {items.length > 0 ? <>
      <div className="mt-3 flex gap-4 text-sm font-semibold text-[#f47700]"><button type="button" onClick={() => setSelected(items.map(item => item.id))}>Select all</button><button type="button" onClick={() => setSelected([])}>Clear</button></div>
      <ul className="mt-3 grid max-h-64 gap-2 overflow-y-auto">{items.map(item => <li key={item.id}><label className="flex cursor-pointer items-center gap-3 rounded-xl bg-white px-4 py-3 text-sm"><input type="checkbox" checked={selected.includes(item.id)} onChange={() => toggle(item.id)} className="size-4 accent-[#f47700]" /><span className="min-w-0 flex-1"><span className="block truncate font-semibold text-[#101b30]">{item.name}</span><span className="block truncate text-[#455c7d]">{item.email} · {item.role}</span></span><span className="shrink-0 text-right text-xs text-[#455c7d]"><span className="block font-semibold text-[#101b30]">{item.detail}</span>{item.lastReminder ? `Last reminded ${item.lastReminder} (${item.reminders}x)` : 'Not reminded yet'}</span></label></li>)}</ul>
    </> : <p className="mt-3 rounded-xl bg-white p-4 text-sm text-[#455c7d]">{emptyText}</p>}
    {message && <p role="status" className="mt-3 text-sm font-semibold text-[#28704d]">{message}</p>}
    {failed.length > 0 && <label className="mt-3 block text-sm font-semibold text-[#9a3412]">Failed emails (select them above and send again)<textarea readOnly value={failed.join('\n')} rows={Math.min(failed.length, 6)} className="mt-2 w-full rounded-xl border border-[#ded8ca] bg-white p-3 font-mono text-xs text-[#101b30]" /></label>}
  </div>
}

export default function ReminderPanel({ documents, interviews }: { documents: Item[]; interviews: Item[] }) {
  return <section className="mt-6 rounded-3xl border border-[#ded8ca] bg-white p-6">
    <h2 className="text-xl font-semibold text-[#101b30]">Send reminders</h2>
    <p className="mt-1 text-sm text-[#455c7d]">Nudge applicants who have not finished. Emails are sent at spaced intervals; any that fail stay in the retry box. Overdue deadlines are extended to the next day.</p>
    <div className="mt-5 grid gap-4 lg:grid-cols-2">
      <ReminderList title="Document reminders" description="Applicants who have not submitted, or have only partially submitted, their documents." items={documents} endpoint="/api/admin/documents/remind" idKey="portalIds" emptyText="Every applicant has submitted their documents." />
      <ReminderList title="Interview reminders" description="Candidates who were invited to the AI-powered interview but have not completed it." items={interviews} endpoint="/api/admin/interviews/remind" idKey="sessionIds" emptyText="No interviews are awaiting completion." />
    </div>
  </section>
}
