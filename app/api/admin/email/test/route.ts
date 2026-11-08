import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { documentRequestEmail } from '@/lib/document-request-email'
import { interviewInvitationEmail } from '@/lib/interview-invitation-email'

const schema = z.object({
  type: z.enum(['document', 'interview']),
  role: z.string().trim().min(2).max(160),
  to: z.string().trim().email().optional().or(z.literal('')),
})

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 })
  const parsed = schema.safeParse(await request.json().catch(() => ({})))
  if (!parsed.success) return NextResponse.json({ error: 'Enter a position and a valid test email address.' }, { status: 400 })
  if (!process.env.RESEND_API_KEY) return NextResponse.json({ error: 'Email sending is not configured.' }, { status: 500 })

  const recipient = (parsed.data.to || user.email || '').toLowerCase()
  if (!recipient) return NextResponse.json({ error: 'Enter an email address to receive the test.' }, { status: 400 })

  const { type, role } = parsed.data
  const origin = process.env.NEXT_PUBLIC_APP_URL || 'https://assessment.care-intrenational.org'
  const deadline = new Date(); deadline.setDate(deadline.getDate() + 1)
  const deadlineLabel = deadline.toLocaleDateString('en-GB')

  const subject = type === 'document' ? `Request for supporting documents - ${role}` : `Invitation to AI-powered interview - ${role}`
  const html = type === 'document'
    ? documentRequestEmail({ applicantName: 'Applicant', role, portalUrl: `${origin}/documents/test-preview-link`, deadline: deadlineLabel })
    : interviewInvitationEmail({ role, deadline: deadlineLabel, url: `${origin}/interview/INT-TEST-PREVIEW` })

  const result = await new Resend(process.env.RESEND_API_KEY).emails.send({
    from: 'CARE International <careers@care-intrenational.org>',
    to: [recipient],
    subject: `[TEST] ${subject}`,
    html,
  })
  if (result.error) return NextResponse.json({ error: result.error.message || 'The test email could not be sent.' }, { status: 502 })
  return NextResponse.json({ sentTo: recipient })
}
