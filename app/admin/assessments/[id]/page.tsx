import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AssessmentDetailForm from '@/components/assessment-detail-form'

export default async function AssessmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email?.toLowerCase().endsWith('@care-intrenational.org')) redirect('/admin/login')
  const { data: assessment } = await supabase.from('assessment_roles').select('*, positions(title)').eq('id', id).maybeSingle()
  if (!assessment) notFound()
  const { data: questions } = await supabase.from('assessment_questions').select('id,position,competency,prompt,options,answer_key').eq('assessment_id', id).order('position')
  const { data: positions } = await supabase.from('positions').select('id,title').order('title')
  const { data: departments } = await supabase.from('departments').select('id,name').order('name')
  return <AssessmentDetailForm assessment={assessment} questions={questions ?? []} positions={positions ?? []} departments={departments ?? []} />
}
