import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendAssessmentInvites } from '@/lib/assessment-invites'

export const maxDuration = 300

const schema = z.object({ assessmentId: z.string().uuid(), interviewIds: z.array(z.string().uuid()).min(1).max(300) })

export async function POST(request: Request) {
  const session = await createClient()
  const { data: { user } } = await session.auth.getUser()
  if (!user?.email?.toLowerCase().endsWith('@care-intrenational.org')) return NextResponse.json({ error: 'Admin sign-in required.' }, { status: 401 })
  if (!process.env.RESEND_API_KEY) return NextResponse.json({ error: 'Email service is not configured.' }, { status: 500 })
  const parsed = schema.safeParse(await request.json().catch(() => ({})))
  if (!parsed.success) return NextResponse.json({ error: 'Choose an assessment and at least one applicant.' }, { status: 400 })

  const admin = createAdminClient()
  const { data: assessment } = await admin.from('assessment_roles').select('id,title,access_code,duration_minutes,question_count,status').eq('id', parsed.data.assessmentId).maybeSingle()
  if (!assessment) return NextResponse.json({ error: 'Assessment not found.' }, { status: 404 })
  if (assessment.status !== 'published') return NextResponse.json({ error: 'Publish this assessment before inviting applicants.' }, { status: 400 })

  const { data: interviews, error } = await admin.from('interview_sessions').select('id,candidate_name,candidate_email,role').in('id', parsed.data.interviewIds).eq('status', 'completed').eq('decision_status', 'passed')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!interviews?.length) return NextResponse.json({ error: 'Only applicants whose interview is marked as passed can be invited.' }, { status: 400 })

  const result = await sendAssessmentInvites(admin, assessment, interviews)
  return NextResponse.json(result)
}
