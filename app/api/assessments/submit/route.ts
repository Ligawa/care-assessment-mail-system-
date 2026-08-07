import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const body = await request.json()
  if (!body.assessmentId || !body.fullName || !body.email || !body.answers) return NextResponse.json({ error:'Required submission data is missing.' }, { status:400 })
  const supabase = await createClient()
  const referenceNumber = `CARE-${new Date().getFullYear()}-${crypto.randomUUID().slice(0,8).toUpperCase()}`
  const { error } = await supabase.from('assessment_submissions').insert({ assessment_id:body.assessmentId, reference_number:referenceNumber, full_name:body.fullName, email:body.email, current_location:body.currentLocation, years_experience:body.yearsExperience, photo_pathname:body.photoPathname, available_for_deployment:body.availableForDeployment, deployment_availability:body.deploymentAvailability, salary_expectation:body.salaryExpectation, answers:body.answers, submitted_at:new Date().toISOString() })
  if (error) return NextResponse.json({ error:'Could not save your assessment.' }, { status:500 })
  return NextResponse.json({ referenceNumber })
}
