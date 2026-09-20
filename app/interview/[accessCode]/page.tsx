import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import InterviewClient from '@/components/interview-client'

export default async function InterviewPage({ params }: { params: Promise<{ accessCode: string }> }) {
  const { accessCode } = await params
  const supabase = await createClient()
  const { data: assessment } = await supabase.from('assessment_roles').select('title,access_code,status').eq('access_code', accessCode.toUpperCase()).eq('status', 'published').maybeSingle()
  if (!assessment) notFound()
  return <InterviewClient role={assessment.title} accessCode={assessment.access_code} />
}
