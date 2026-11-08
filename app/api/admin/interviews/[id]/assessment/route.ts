import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendAssessmentInvites } from '@/lib/assessment-invites'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email?.toLowerCase().endsWith('@care-intrenational.org')) return NextResponse.json({ error: 'Staff access required.' }, { status: 403 })
  if (!process.env.RESEND_API_KEY) return NextResponse.json({ error: 'Email service is not configured.' }, { status: 500 })
  const { id } = await params
  const parsed = z.object({ assessmentId: z.string().uuid() }).safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: 'Choose an assessment.' }, { status: 400 })
  const admin = createAdminClient()
  const [{ data: interview }, { data: assessment }] = await Promise.all([
    admin.from('interview_sessions').select('id,candidate_name,candidate_email,role,status,decision_status').eq('id', id).maybeSingle(),
    admin.from('assessment_roles').select('id,title,access_code,duration_minutes,question_count,status').eq('id', parsed.data.assessmentId).maybeSingle(),
  ])
  if (!interview?.candidate_email) return NextResponse.json({ error: 'This interview has no applicant email.' }, { status: 400 })
  if (interview.status !== 'completed' || interview.decision_status !== 'passed') return NextResponse.json({ error: 'Mark the interview as passed before inviting the applicant to the assessment.' }, { status: 400 })
  if (!assessment) return NextResponse.json({ error: 'Assessment not found.' }, { status: 404 })
  if (assessment.status !== 'published') return NextResponse.json({ error: 'Publish this assessment before inviting applicants.' }, { status: 400 })
  const result = await sendAssessmentInvites(admin, assessment, [interview])
  if (result.skippedDuplicates.length) return NextResponse.json({ error: 'This applicant has already been invited to an assessment for this role.' }, { status: 409 })
  if (result.failedEmails.length) return NextResponse.json({ error: 'The invitation email could not be sent. Please try again.' }, { status: 502 })
  return NextResponse.json({ ok: true })
}
