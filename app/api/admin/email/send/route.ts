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
    const results = await Promise.allSettled(recipients.map(to => resend.emails.send({ from: 'CARE International <careers@care-intrenational.org>', to: [to], subject: input.subject.trim(), html, text })))
    const sentCount = results.filter(result => result.status === 'fulfilled' && !result.value.error).length
    const failures = results.map((result, index) => result.status === 'rejected' ? { email: recipients[index], error: result.reason instanceof Error ? result.reason.message : 'Send failed' } : result.value.error ? { email: recipients[index], error: result.value.error.message } : null).filter(Boolean)
    const failedCount = recipients.length - sentCount
    const status = failedCount === 0 ? 'sent' : sentCount === 0 ? 'failed' : 'partial'
    await supabase.from('email_campaigns').update({ sent_count: sentCount, failed_count: failedCount, status, error_details: failures, completed_at: new Date().toISOString() }).eq('id', campaign.id)
    return NextResponse.json({ campaignId: campaign.id, recipientCount: recipients.length, sentCount, failedCount, failures })
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'Enter a valid subject, HTML body, and recipient list.' }, { status: 400 })
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Email delivery failed.' }, { status: 502 })
  }
}
