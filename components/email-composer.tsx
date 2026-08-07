'use client'

import { useMemo, useRef, useState } from 'react'
import { Code2, Eye, Italic, Link2, List, ListOrdered, Mail, Send, Strikethrough, Underline } from 'lucide-react'

type Campaign = { id: string; subject: string; recipient_count: number; sent_count: number; failed_count: number; status: string; created_at: string }

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function EmailComposer({ campaigns }: { campaigns: Campaign[] }) {
  const editorRef = useRef<HTMLDivElement>(null)
  const [recipients, setRecipients] = useState('')
  const [subject, setSubject] = useState('')
  const [textBody, setTextBody] = useState('')
  const [htmlBody, setHtmlBody] = useState('<p>Write your email here...</p>')
  const [sourceMode, setSourceMode] = useState(false)
  const [preview, setPreview] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  const parsedRecipients = useMemo(() => recipients.split(/[\s,;]+/).map(value => value.trim().toLowerCase()).filter(Boolean), [recipients])
  const uniqueRecipients = [...new Set(parsedRecipients)]
  const invalidRecipients = uniqueRecipients.filter(email => !emailPattern.test(email))

  function command(name: string, value?: string) { editorRef.current?.focus(); document.execCommand(name, false, value); setHtmlBody(editorRef.current?.innerHTML || '') }
  function insertLink() { const url = window.prompt('Enter the URL'); if (url) command('createLink', url) }
  function syncEditor() { setHtmlBody(editorRef.current?.innerHTML || '') }
  function toggleSource() { if (!sourceMode) syncEditor(); setSourceMode(value => !value) }

  async function sendEmail(event: React.FormEvent) {
    event.preventDefault(); setMessage('')
    if (!uniqueRecipients.length || uniqueRecipients.length > 100 || invalidRecipients.length || !subject.trim() || (!htmlBody.trim() && !textBody.trim())) { setMessage('Add a subject, valid recipients (up to 100), and email content.'); return }
    setBusy(true)
    try {
      const response = await fetch('/api/admin/email/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ recipients: uniqueRecipients, subject: subject.trim(), html: htmlBody, text: textBody.trim() || undefined }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Unable to send email.')
      setMessage(`Sent ${data.sentCount} of ${data.recipientCount} emails${data.failedCount ? `; ${data.failedCount} failed.` : '.'}`)
      setRecipients(''); setSubject(''); setTextBody(''); setHtmlBody('<p>Write your email here...</p>'); if (editorRef.current) editorRef.current.innerHTML = '<p>Write your email here...</p>'
      window.setTimeout(() => window.location.reload(), 1200)
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to send email.') } finally { setBusy(false) }
  }

  return <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
    <form onSubmit={sendEmail} className="rounded-3xl border border-border bg-card p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-widest text-primary">Direct delivery</p><h2 className="mt-2 text-2xl font-semibold">Compose email</h2><p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">Each recipient receives an independent email. Paste HTML directly or use the formatting toolbar.</p></div><Mail className="size-6 text-primary" /></div>
      <div className="mt-6 flex flex-col gap-4"><label className="grid gap-2 text-sm font-semibold">Recipients <span className="font-normal text-muted-foreground">{uniqueRecipients.length}/100</span><textarea value={recipients} onChange={event => setRecipients(event.target.value)} placeholder="name@example.com, another@example.com" className="min-h-24 rounded-xl border border-input bg-background p-3 font-normal outline-none focus:ring-2 focus:ring-primary/30" /></label>
        {invalidRecipients.length > 0 && <p className="text-sm text-destructive">Invalid address: {invalidRecipients[0]}</p>}
        <label className="grid gap-2 text-sm font-semibold">Subject<input required value={subject} onChange={event => setSubject(event.target.value)} placeholder="Email subject" className="h-11 rounded-xl border border-input bg-background px-3 font-normal outline-none focus:ring-2 focus:ring-primary/30" /></label>
        <div className="grid gap-2 text-sm font-semibold"><div className="flex flex-wrap items-center justify-between gap-2"><span>Message</span><div className="flex flex-wrap gap-1"><button type="button" onClick={() => command('bold')} className="rounded-lg border border-border p-2 font-bold" aria-label="Bold">B</button><button type="button" onClick={() => command('italic')} className="rounded-lg border border-border p-2" aria-label="Italic"><Italic className="size-4" /></button><button type="button" onClick={() => command('underline')} className="rounded-lg border border-border p-2" aria-label="Underline"><Underline className="size-4" /></button><button type="button" onClick={() => command('strikeThrough')} className="rounded-lg border border-border p-2" aria-label="Strikethrough"><Strikethrough className="size-4" /></button><button type="button" onClick={() => command('insertUnorderedList')} className="rounded-lg border border-border p-2" aria-label="Bullet list"><List className="size-4" /></button><button type="button" onClick={() => command('insertOrderedList')} className="rounded-lg border border-border p-2" aria-label="Numbered list"><ListOrdered className="size-4" /></button><button type="button" onClick={insertLink} className="rounded-lg border border-border p-2" aria-label="Insert link"><Link2 className="size-4" /></button><select onChange={event => command('fontName', event.target.value)} defaultValue="Arial" className="rounded-lg border border-border bg-background px-2 text-xs font-normal" aria-label="Font family"><option>Arial</option><option>Georgia</option><option>Verdana</option><option>Tahoma</option></select><button type="button" onClick={toggleSource} className={`rounded-lg border p-2 ${sourceMode ? 'border-primary bg-primary/10 text-primary' : 'border-border'}`} aria-label="Toggle HTML source"><Code2 className="size-4" /></button><button type="button" onClick={() => setPreview(value => !value)} className="rounded-lg border border-border p-2" aria-label="Preview"><Eye className="size-4" /></button></div></div>
          {sourceMode ? <textarea value={htmlBody} onChange={event => setHtmlBody(event.target.value)} className="min-h-72 rounded-xl border border-input bg-background p-3 font-mono text-sm font-normal" aria-label="HTML source" /> : preview ? <div className="min-h-72 rounded-xl border border-input bg-muted p-4 font-normal" dangerouslySetInnerHTML={{ __html: htmlBody }} /> : <div ref={editorRef} contentEditable suppressContentEditableWarning onInput={syncEditor} className="min-h-72 rounded-xl border border-input bg-background p-4 font-normal outline-none focus:ring-2 focus:ring-primary/30" dangerouslySetInnerHTML={{ __html: htmlBody }} />}
        </div>
        <label className="grid gap-2 text-sm font-semibold">Plain-text fallback <span className="font-normal text-muted-foreground">Optional</span><textarea value={textBody} onChange={event => setTextBody(event.target.value)} placeholder="Optional version for recipients who prefer plain text" className="min-h-24 rounded-xl border border-input bg-background p-3 font-normal" /></label>
        {message && <p className="rounded-xl border border-primary/20 bg-primary/10 px-4 py-3 text-sm">{message}</p>}
        <button disabled={busy} className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"><Send className="size-4" />{busy ? 'Sending independently…' : `Send to ${uniqueRecipients.length || 0} recipients`}</button>
      </div>
    </form>
    <aside className="rounded-3xl border border-border bg-card p-6"><div className="flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-widest text-primary">Audit trail</p><h2 className="mt-2 text-xl font-semibold">Recent campaigns</h2></div><span className="rounded-full bg-muted px-3 py-1 text-xs">{campaigns.length}</span></div><div className="mt-5 flex flex-col gap-3">{campaigns.map(campaign => <div key={campaign.id} className="rounded-2xl border border-border p-4"><p className="font-semibold">{campaign.subject}</p><p className="mt-1 text-xs text-muted-foreground">{new Date(campaign.created_at).toLocaleString()}</p><div className="mt-3 flex gap-2 text-xs"><span className="rounded-full bg-muted px-2 py-1">{campaign.recipient_count} recipients</span><span className="rounded-full bg-primary/10 px-2 py-1 text-primary">{campaign.sent_count} sent</span>{campaign.failed_count > 0 && <span className="rounded-full bg-destructive/10 px-2 py-1 text-destructive">{campaign.failed_count} failed</span>}</div></div>)}{campaigns.length === 0 && <p className="rounded-2xl border border-dashed border-border p-5 text-sm text-muted-foreground">Sent campaigns will appear here.</p>}</div></aside>
  </div>
}
