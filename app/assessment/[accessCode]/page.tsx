import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import AssessmentClient from '@/components/assessment-client'
import { formatAssessmentDeadline } from '@/lib/assessment-invites'

function Notice({ title, body }: { title: string; body: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5">
      <div className="max-w-md text-center">
        <h1 className="text-3xl font-semibold">{title}</h1>
        <p className="mt-4 leading-7 text-muted-foreground">{body}</p>
      </div>
    </main>
  )
}

export default async function AssessmentPage({ params, searchParams }: { params: Promise<{ accessCode: string }>; searchParams: Promise<{ invite?: string }> }) {
  const [{ accessCode }, { invite: token }] = await Promise.all([params, searchParams])
  const supabase = await createClient()
  const { data: assessment } = await supabase.from('assessment_roles').select('*').eq('access_code', accessCode.toUpperCase()).eq('status', 'published').maybeSingle()
  if (!assessment) notFound()

  if (!token) return <Notice title="Invitation required" body="This skills assessment is by invitation only. Please open the personal link from the invitation email sent to you by CARE International." />
  const { data: invite } = await createAdminClient().from('assessment_invites').select('candidate_name,candidate_email,status,deadline_at').eq('token', token).eq('assessment_id', assessment.id).maybeSingle()
  if (!invite) return <Notice title="Invitation not found" body="This invitation link is not valid. Please use the exact link from your invitation email or contact the recruitment team." />
  if (invite.status === 'completed') return <Notice title="Assessment already submitted" body="We have already received your assessment. The HR team will review it and contact you about the next steps." />
  if (new Date(invite.deadline_at).getTime() < Date.now()) return <Notice title="This assessment has closed" body={`The deadline for this invitation was ${formatAssessmentDeadline(invite.deadline_at)}. Please contact the recruitment team if you need help.`} />

  const { data: questions } = await supabase.from('assessment_questions').select('id,position,competency,prompt,options').eq('assessment_id', assessment.id).order('position')
  return <AssessmentClient assessment={assessment} questions={questions ?? []} invite={{ token, name: invite.candidate_name ?? '', email: invite.candidate_email }} />
}
