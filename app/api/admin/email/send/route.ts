import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import sanitizeHtml from 'sanitize-html'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const requestSchema = z.object({
  recipients: z.array(z.string().trim().email()).min(1).max(100),
  subject: z.string().trim().min(1).max(200),
  html: z.string().min(1).max(1_000_000),
  text: z.string().max(200_000).optional(),
})

const allowedTags = [...sanitizeHtml.defaults.allowedTags, 'img', 'table', 'thead', 'tbody', 'tr', 'th', 'td']
const allowedAttributes = { ...sanitizeHtml.defaults.allowedAttributes, '*': ['style', 'class'], a: ['href', 'name', 'target', 'rel'], img: ['src', 'alt', 'width', 'height'] }
const BATCH_SIZE = 10
const BATCH_DELAY_MS = 250
const MAX_RETRIES = 3

function wait(ms: number) { return new Promise(resolve => setTimeout(resolve, ms)) }
function isTransientError(error: unknown) {
  const candidate = error as { statusCode?: number; status?: number; message?: string }
  const status = candidate?.statusCode ?? candidate?.status
  return status === undefined || status === 408 || status === 425 || status === 429 || status >= 500 || /timeout|temporar|rate.?limit|network|fetch/i.test(candidate?.message || '')
}

async function sendWithRetry(send: () => Promise<{ error?: { message: string } | null }>) {
  let lastError: unknown
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      const result = await send()
      if (!result.error || !isTransientError(result.error)) return result
      lastError = result.error
    } catch (error) {
      lastError = error
      if (!isTransientError(error)) throw error
    }
    if (attempt < MAX_RETRIES) await wait(400 * 2 ** attempt)
  }
  throw lastError instanceof Error ? lastError : new Error('Email delivery failed after retries.')
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email?.toLowerCase().endsWith('@care-intrenational.org')) return NextResponse.json({ error: 'Staff access required.' }, { status: 403 })
  if (!process.env.RESEND_API_KEY) return NextResponse.json({ error: 'Resend is not configured.' }, { status: 500 })
  try {
    const input = requestSchema.parse(await request.json())
    const recipients = [...new Set(input.recipients.map(email => email.trim().toLowerCase()))]
    if (recipients.length > 100) return NextResponse.json({ error: 'You can send to a maximum of 100 recipients.' }, { status: 400 })
    const html = sanitizeHtml(input.html.trimEnd(), { allowedTags, allowedAttributes, allowedSchemes: ['http', 'https', 'mailto'] }).trimEnd()
    const text = input.text?.trim() || sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} }).replace(/\s+/g, ' ').trim()
    const { data: campaign, error: insertError } = await supabase.from('email_campaigns').insert({ subject: input.subject.trim(), html_body: html, text_body: text, recipients, recipient_count: recipients.length, status: 'sending', created_by: user.id }).select('id').single()
    if (insertError || !campaign) return NextResponse.json({ error: insertError?.message || 'Could not create campaign history.' }, { status: 500 })
    const resend = new Resend(process.env.RESEND_API_KEY)
    const results: ({ email: string; error?: string } | null)[] = []
    for (let start = 0; start < recipients.length; start += BATCH_SIZE) {
      const batch = recipients.slice(start, start + BATCH_SIZE)
      const batchResults = await Promise.all(batch.map(async to => {
        try {
          const result = await sendWithRetry(() => resend.emails.send({ from: 'CARE International <careers@care-intrenational.org>', to: [to], subject: input.subject.trim(), html, text, headers: { 'X-Entity-Ref-ID': campaign.id } }))
          return result.error ? { email: to, error: result.error.message } : null
        } catch (error) {
          return { email: to, error: error instanceof Error ? error.message : 'Send failed' }
        }
      }))
      results.push(...batchResults)
      if (start + BATCH_SIZE < recipients.length) await wait(BATCH_DELAY_MS)
    }
    const failures = results.filter((result): result is { email: string; error: string } => Boolean(result))
    const sentCount = recipients.length - failures.length
    const failedCount = failures.length
    const status = failedCount === 0 ? 'sent' : sentCount === 0 ? 'failed' : 'partial'
    await supabase.from('email_campaigns').update({ sent_count: sentCount, failed_count: failedCount, status, error_details: failures, completed_at: new Date().toISOString() }).eq('id', campaign.id)
    return NextResponse.json({ campaignId: campaign.id, recipientCount: recipients.length, sentCount, failedCount, failures })
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'Enter a valid subject, HTML body, and recipient list.' }, { status: 400 })
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Email delivery failed.' }, { status: 502 })
  }
}
