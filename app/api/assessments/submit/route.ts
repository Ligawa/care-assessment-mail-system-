import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  const body = await request.json()
  if (!body.assessmentId || !body.fullName || !body.email || !body.answers) return NextResponse.json({ error: 'Required submission data is missing.' }, { status: 400 })
  const admin = createAdminClient()

  const inviteQuery = admin.from('assessment_invites').select('id,status,deadline_at,candidate_email').eq('assessment_id', body.assessmentId)
  const { data: invite } = await (body.inviteToken ? inviteQuery.eq('token', String(body.inviteToken)) : inviteQuery.eq('candidate_email', String(body.email).trim().toLowerCase())).maybeSingle()
  if (!invite) return NextResponse.json({ error: 'This assessment is by invitation only. Please use the link from your invitation email.' }, { status: 403 })
  if (invite.status === 'completed') return NextResponse.json({ error: 'This assessment has already been submitted.' }, { status: 409 })
  if (new Date(invite.deadline_at).getTime() < Date.now()) return NextResponse.json({ error: 'The deadline for this assessment has passed.' }, { status: 403 })

  const submittedAt = new Date().toISOString()
  const referenceNumber = `CARE-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`
  const { data: submission, error } = await admin.from('assessment_submissions').insert({ assessment_id: body.assessmentId, reference_number: referenceNumber, full_name: body.fullName, email: invite.candidate_email, current_location: body.currentLocation, years_experience: body.yearsExperience, photo_pathname: body.photoPathname, available_for_deployment: body.availableForDeployment, deployment_availability: body.deploymentAvailability, salary_expectation: body.salaryExpectation, answers: body.answers, submitted_at: submittedAt }).select('id').single()
  if (error || !submission) return NextResponse.json({ error: 'Could not save your assessment.' }, { status: 500 })
  await admin.from('assessment_invites').update({ status: 'completed', completed_at: submittedAt, submission_id: submission.id }).eq('id', invite.id)
  return NextResponse.json({ referenceNumber })
}
