import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PositionDetailForm from '@/components/position-detail-form'

export default async function PositionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email?.toLowerCase().endsWith('@care-intrenational.org')) redirect('/admin/login')
  const { data: position } = await supabase.from('positions').select('*').eq('id', id).maybeSingle()
  if (!position) notFound()
  const { data: assessments } = await supabase.from('assessment_roles').select('id,title,status,access_code,question_count,duration_minutes').eq('position_id', id).order('created_at', { ascending: false })
  return <PositionDetailForm position={position} assessments={assessments ?? []} />
}
