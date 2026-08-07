import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AssessmentClient from '@/components/assessment-client'

export default async function AssessmentPage({ params }: { params: Promise<{ accessCode: string }> }) {
  const { accessCode } = await params
  const supabase = await createClient()
  const { data: assessment } = await supabase.from('assessment_roles').select('*').eq('access_code', accessCode.toUpperCase()).eq('status', 'published').maybeSingle()
  if (!assessment) notFound()
  const { data: questions } = await supabase.from('assessment_questions').select('id,position,competency,prompt,options').eq('assessment_id', assessment.id).order('position')
  return <AssessmentClient assessment={assessment} questions={questions ?? []} />
}
