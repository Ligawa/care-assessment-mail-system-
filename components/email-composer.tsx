'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import sanitizeHtml from 'sanitize-html'
import { Code2, Eye, Italic, Link2, List, ListOrdered, Mail, Send, Strikethrough, Underline, X } from 'lucide-react'

type Campaign = { id: string; subject: string; html_body: string; text_body: string | null; recipients: string[]; recipient_count: number; sent_count: number; failed_count: number; status: string; error_details: { email: string; error: string }[] | null; created_at: string }
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function EmailComposer({ campaigns }: { campaigns: Campaign[] }) {
  const editorRef = useRef<HTMLDivElement>(null)
  const selectionRef = useRef<Range | null>(null)
  const [recipients, setRecipients] = useState('')
  const [subject, setSubject] = useState('')
  const [textBody, setTextBody] = useState('')
  const [htmlBody, setHtmlBody] = useState('<p>Write your email here...</p>')
  const [sourceMode, setSourceMode] = useState(false)
  const [preview, setPreview] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [messageKind, setMessageKind] = useState<'success' | 'error'>('success')
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null)

  const parsedRecipients = useMemo(() => recipients.split(/[\s,;]+/).map(value => value.trim().toLowerCase()).filter(Boolean), [recipients])
  const uniqueRecipients = [...new Set(parsedRecipients)]
  const invalidRecipients = uniqueRecipients.filter(email => !emailPattern.test(email))

  useEffect(() => {
    if (!editorRef.current || sourceMode || preview) return
    if (editorRef.current.innerHTML !== htmlBody) editorRef.current.innerHTML = htmlBody
  }, [htmlBody, preview, sourceMode])

  function saveSelection() {
    const selection = window.getSelection()
    if (!selection || !selection.rangeCount || !editorRef.current?.contains(selection.anchorNode)) return
    selectionRef.current = selection.getRangeAt(0).cloneRange()
  }
  function restoreSelection() {
    const selection = window.getSelection()
    if (!selection || !selectionRef.current) return
    selection.removeAllRanges()
    selection.addRange(selectionRef.current)
  }
  function command(name: string, value?: string) {
    if (sourceMode || preview || !editorRef.current) return
    editorRef.current.focus()
    restoreSelection()
    document.execCommand(name, false, value)
    setHtmlBody(editorRef.current.innerHTML)
  }
  function insertLink() { const url = window.prompt('Enter the URL'); if (url) command('createLink', url) }
  function syncEditor() { if (editorRef.current) setHtmlBody(editorRef.current.innerHTML) }
  function toggleSource() { syncEditor(); setPreview(false); setSourceMode(value => !value) }
  function togglePreview() { syncEditor(); setSourceMode(false); setPreview(value => !value) }

  function loadFailedDraft(campaign: Campaign) {
    const failures = (campaign.error_details || []).map(item => item.email.trim().toLowerCase())
    setSelectedCampaign(campaign)
    setRecipients(failures.join(', '))
    setSubject(campaign.subject.trim())
    setHtmlBody(campaign.html_body.trim())
    setTextBody((campaign.text_body || '').trim())
    setSourceMode(false); setPreview(false); setMessage(`Loaded ${failures.length} failed recipient${failures.length === 1 ? '' : 's'} for editing.`)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  function openCampaign(campaign: Campaign) { setSelectedCampaign(campaign) }

  async function sendEmail(event: React.FormEvent) {
    event.preventDefault(); setMessage(''); setMessageKind('success')
    if (!uniqueRecipients.length || uniqueRecipients.length > 100 || invalidRecipients.length || !subject.trim() || (!htmlBody.trim() && !textBody.trim())) { setMessageKind('error'); setMessage('Add a subject, valid recipients (up to 100), and email content.'); return }
    setBusy(true)
    try {
      const response = await fetch('/api/admin/email/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ recipients: uniqueRecipients, subject: subject.trim(), html: htmlBody, text: textBody.trim() || undefined }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Unable to send email.')
      setMessageKind(data.failedCount ? 'error' : 'success'); setMessage(`Sent ${data.sentCount} of ${data.recipientCount} emails${data.failedCount ? `; ${data.failedCount} failed.` : '.'}`)
      setRecipients(''); setSubject(''); setTextBody(''); setHtmlBody('<p>Write your email here...</p>'); if (editorRef.current) editorRef.current.innerHTML = '<p>Write your email here...</p>'
      window.setTimeout(() => window.location.reload(), 1200)
    } catch (error) { setMessageKind('error'); setMessage(error instanceof Error ? error.message : 'Unable to send email.') } finally { setBusy(false) }
  }

  return <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
    <form onSubmit={sendEmail} className="rounded-3xl border border-border bg-card p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-widest text-primary">Direct delivery</p><h2 className="mt-2 text-2xl font-semibold">Compose email</h2><p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">Each recipient receives an independent email. Paste HTML directly or use the formatting toolbar.</p></div><Mail className="size-6 text-primary" /></div>
      <div className="mt-6 flex flex-col gap-4"><label className="grid gap-2 text-sm font-semibold">Recipients <span className="font-normal text-muted-foreground">{uniqueRecipients.length}/100</span><textarea dir="ltr" value={recipients} onChange={event => setRecipients(event.target.value)} placeholder="name@example.com, another@example.com" className="min-h-24 rounded-xl border border-input bg-background p-3 text-left font-normal outline-none focus:ring-2 focus:ring-primary/30" style={{ direction: 'ltr', unicodeBidi: 'plaintext' }} /></label>
        {invalidRecipients.length > 0 && <p className="text-sm text-destructive">Invalid address: {invalidRecipients[0]}</p>}
        <label className="grid gap-2 text-sm font-semibold">Subject<input dir="ltr" required value={subject} onChange={event => setSubject(event.target.value)} placeholder="Email subject" className="h-11 rounded-xl border border-input bg-background px-3 text-left font-normal outline-none focus:ring-2 focus:ring-primary/30" style={{ direction: 'ltr', unicodeBidi: 'plaintext' }} /></label>
        <div className="grid gap-2 text-sm font-semibold"><div className="flex flex-wrap items-center justify-between gap-2"><span>Message</span><div className="flex flex-wrap gap-1"><button type="button" onMouseDown={event => { event.preventDefault(); command('bold') }} className="rounded-lg border border-border p-2 font-bold" aria-label="Bold">B</button><button type="button" onMouseDown={event => { event.preventDefault(); command('italic') }} className="rounded-lg border border-border p-2" aria-label="Italic"><Italic className="size-4" /></button><button type="button" onMouseDown={event => { event.preventDefault(); command('underline') }} className="rounded-lg border border-border p-2" aria-label="Underline"><Underline className="size-4" /></button><button type="button" onMouseDown={event => { event.preventDefault(); command('strikeThrough') }} className="rounded-lg border border-border p-2" aria-label="Strikethrough"><Strikethrough className="size-4" /></button><button type="button" onMouseDown={event => { event.preventDefault(); command('insertUnorderedList') }} className="rounded-lg border border-border p-2" aria-label="Bullet list"><List className="size-4" /></button><button type="button" onMouseDown={event => { event.preventDefault(); command('insertOrderedList') }} className="rounded-lg border border-border p-2" aria-label="Numbered list"><ListOrdered className="size-4" /></button><button type="button" onMouseDown={event => { event.preventDefault(); insertLink() }} className="rounded-lg border border-border p-2" aria-label="Insert link"><Link2 className="size-4" /></button><select onChange={event => command('fontName', event.target.value)} defaultValue="Arial" className="rounded-lg border border-border bg-background px-2 text-xs font-normal" aria-label="Font family"><option>Arial</option><option>Georgia</option><option>Verdana</option><option>Tahoma</option></select><button type="button" onClick={toggleSource} className={`rounded-lg border p-2 ${sourceMode ? 'border-primary bg-primary/10 text-primary' : 'border-border'}`} aria-label="Toggle HTML source"><Code2 className="size-4" /></button><button type="button" onClick={togglePreview} className="rounded-lg border border-border p-2" aria-label="Preview"><Eye className="size-4" /></button></div></div>
          {sourceMode ? <textarea dir="ltr" value={htmlBody} onChange={event => setHtmlBody(event.target.value)} className="min-h-72 rounded-xl border border-input bg-background p-3 text-left font-mono text-sm font-normal" style={{ direction: 'ltr', unicodeBidi: 'plaintext' }} aria-label="HTML source" /> : preview ? <div className="min-h-72 rounded-xl border border-input bg-muted p-4 text-left font-normal" dir="ltr" dangerouslySetInnerHTML={{ __html: sanitizeHtml(htmlBody) }} /> : <div ref={editorRef} dir="ltr" contentEditable suppressContentEditableWarning onInput={syncEditor} onMouseUp={saveSelection} onKeyUp={saveSelection} className="min-h-72 rounded-xl border border-input bg-background p-4 text-left font-normal outline-none focus:ring-2 focus:ring-primary/30" style={{ direction: 'ltr', unicodeBidi: 'plaintext' }} />}
        </div>
        <label className="grid gap-2 text-sm font-semibold">Plain-text fallback <span className="font-normal text-muted-foreground">Optional</span><textarea dir="ltr" value={textBody} onChange={event => setTextBody(event.target.value)} placeholder="Optional version for recipients who prefer plain text" className="min-h-24 rounded-xl border border-input bg-background p-3 text-left font-normal" style={{ direction: 'ltr', unicodeBidi: 'plaintext' }} /></label>
        {message && <div role="status" aria-live="polite" className={`rounded-xl border px-4 py-3 text-sm font-medium ${messageKind === 'error' ? 'border-destructive/30 bg-destructive/10 text-destructive' : 'border-primary/20 bg-primary/10'}`}>{message}</div>}
        <button type="submit" disabled={busy} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/20 transition hover:opacity-90 disabled:cursor-wait disabled:opacity-60"><Send className="size-4" />{busy ? 'Sending independently…' : `Send to ${uniqueRecipients.length || 0} recipients`}</button>
      </div>
    </form>
    <aside className="rounded-3xl border border-border bg-card p-6"><div className="flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-widest text-primary">Audit trail</p><h2 className="mt-2 text-xl font-semibold">Recent campaigns</h2></div><span className="rounded-full bg-muted px-3 py-1 text-xs">{campaigns.length}</span></div><div className="mt-5 flex flex-col gap-3">{campaigns.map(campaign => <button type="button" key={campaign.id} onClick={() => openCampaign(campaign)} className="w-full rounded-2xl border border-border p-4 text-left transition hover:border-primary/50 hover:bg-muted/40"><p className="font-semibold">{campaign.subject}</p><p className="mt-1 text-xs text-muted-foreground">{new Date(campaign.created_at).toLocaleString()}</p><div className="mt-3 flex flex-wrap gap-2 text-xs"><span className={`rounded-full px-2 py-1 font-semibold capitalize ${campaign.status === 'failed' || campaign.failed_count > 0 ? 'bg-destructive/10 text-destructive' : campaign.status === 'sent' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>{campaign.status}</span><span className="rounded-full bg-muted px-2 py-1">{campaign.recipient_count} recipients</span><span className="rounded-full bg-primary/10 px-2 py-1 font-semibold text-primary">{campaign.sent_count} sent</span>{campaign.failed_count > 0 && <span className="rounded-full bg-destructive/10 px-2 py-1 font-semibold text-destructive">{campaign.failed_count} failed</span>}</div></button>)}{campaigns.length === 0 && <p className="rounded-2xl border border-dashed border-border p-5 text-sm text-muted-foreground">Sent campaigns will appear here.</p>}</div>{selectedCampaign && <div className="mt-6 border-t border-border pt-5"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-widest text-primary">Campaign details</p><h3 className="mt-1 font-semibold">{selectedCampaign.subject}</h3></div><button type="button" onClick={() => setSelectedCampaign(null)} className="rounded-lg p-1 hover:bg-muted" aria-label="Close campaign details"><X className="size-4" /></button></div><p className="mt-2 text-xs text-muted-foreground">{new Date(selectedCampaign.created_at).toLocaleString()}</p><div className="mt-3 flex flex-wrap gap-2 text-xs"><span className="rounded-full bg-muted px-2 py-1">{selectedCampaign.status}</span><span className="rounded-full bg-primary/10 px-2 py-1 text-primary">{selectedCampaign.sent_count} sent</span><span className="rounded-full bg-destructive/10 px-2 py-1 text-destructive">{selectedCampaign.failed_count} failed</span></div><div className="mt-4 max-h-48 overflow-auto rounded-xl border border-border p-3"><div className="grid gap-2 text-xs">{selectedCampaign.recipients.map(recipient => { const failure = (selectedCampaign.error_details || []).find(item => item.email === recipient); return <div key={recipient} className={`flex items-start justify-between gap-2 rounded-lg px-2 py-1.5 ${failure ? 'bg-destructive/10 text-destructive' : 'bg-muted/50'}`}><span className="break-all">{recipient}</span><span className="shrink-0">{failure ? 'Failed' : 'Sent'}</span></div> })}</div></div>{selectedCampaign.failed_count > 0 && <button type="button" onClick={() => loadFailedDraft(selectedCampaign)} className="mt-4 w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90">Edit &amp; resend failed</button>}</div>}</aside>
  </div>
}
