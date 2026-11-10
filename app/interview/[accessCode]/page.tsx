import { createAdminClient } from '@/lib/supabase/admin'
import InterviewClient from '@/components/interview-client'
import InterviewStatus from '@/components/interview-status'
import InterviewCodeForm from '@/components/interview-code-form'

function cleanCode(raw: string) {
  let value = raw
  try { value = decodeURIComponent(raw) } catch {}
  return value.trim().replace(/[^A-Za-z0-9-]/g, '').replace(/-+$/, '').toUpperCase()
}

export default async function InterviewPage({ params }: { params: Promise<{ accessCode: string }> }) {
  const { accessCode: rawCode } = await params
  const accessCode = cleanCode(rawCode)
  const supabase = createAdminClient()
  const { data: assessment } = await supabase.from('assessment_roles').select('title,access_code,status').eq('access_code', accessCode).eq('status', 'published').maybeSingle()
  const { data: interview } = await supabase.from('interview_sessions').select('role,access_code,status').eq('access_code', accessCode).maybeSingle()

  if (interview?.status === 'completed') {
    return <InterviewStatus variant="completed" title="Your interview is already complete" message="Thank you. We have received your interview and our recruitment team is reviewing it. This link can only be used once, so there is nothing more you need to do. We will contact you by email about the next step." />
  }

  const role = assessment?.title || interview?.role
  if (!role) {
    return (
      <InterviewStatus variant="invalid" title="We could not find this interview" message="The code in this link was not recognised. Check that you copied the full link from your invitation email, or type your interview code below.">
        <InterviewCodeForm />
      </InterviewStatus>
    )
  }

  const { data: voice } = await supabase.from('interview_settings').select('voice_uri,voice_name,voice_lang').eq('id', 1).maybeSingle()
  return <InterviewClient role={role} accessCode={assessment?.access_code || interview?.access_code || accessCode} voiceUri={voice?.voice_uri || ''} />
}
