import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import InterviewClient from '@/components/interview-client'

export default async function InterviewPage({ params }: { params: Promise<{ accessCode: string }> }) {
  const { accessCode } = await params
  const supabase = await createClient()
  const { data: assessment } = await supabase.from('assessment_roles').select('title,access_code,status').eq('access_code', accessCode.toUpperCase()).eq('status', 'published').maybeSingle()
  if (!assessment) notFound()
  const { data: voice } = await supabase.from('interview_settings').select('voice_uri,voice_name,voice_lang').eq('id', 1).maybeSingle()
  return <InterviewClient role={assessment.title} accessCode={assessment.access_code} voiceUri={voice?.voice_uri || ''} />
}
