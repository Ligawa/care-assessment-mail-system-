import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { documentRequestEmail } from '@/lib/document-request-email'
import { interviewInvitationEmail } from '@/lib/interview-invitation-email'
import { assessmentDeadline, assessmentInviteEmail, formatAssessmentDeadline } from '@/lib/assessment-invites'

const schema = z.object({
  type: z.enum(['document', 'interview', 'assessment']),
  role: z.string().trim().min(2).max(160),
  to: z.string().trim().email().optional().or(z.literal('')),
  assessmentId: z.string().uuid().optional().or(z.literal('')),
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

  const assessment = type === 'assessment' && parsed.data.assessmentId
    ? (await createAdminClient().from('assessment_roles').select('title,duration_minutes,question_count').eq('id', parsed.data.assessmentId).maybeSingle()).data
    : null

  const subject = type === 'document' ? `Request for supporting documents - ${role}` : type === 'assessment' ? `Final screening: skills assessment - ${role}` : `Invitation to AI-powered interview - ${role}`
  const html = type === 'document'
    ? documentRequestEmail({ applicantName: 'Applicant', role, portalUrl: `${origin}/documents/test-preview-link`, deadline: deadlineLabel })
    : type === 'assessment'
      ? assessmentInviteEmail({ role, assessmentTitle: assessment?.title || `${role} skills assessment`, url: `${origin}/assessment/TEST-PREVIEW?invite=preview`, deadline: formatAssessmentDeadline(assessmentDeadline()), durationMinutes: assessment?.duration_minutes ?? 30, questionCount: assessment?.question_count ?? 20 })
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
