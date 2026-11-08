import { redirect } from 'next/navigation'
import AdminSidebar from '@/components/admin-sidebar'
import AssessmentInviteBoard, { type InviteRow, type PassedInterview, type PublishedAssessment } from '@/components/assessment-invite-board'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export default async function AssessmentInvitesPage() {
  const sessionClient = await createClient()
  const { data: { user } } = await sessionClient.auth.getUser()
  if (!user) redirect('/admin/login')
  const admin = createAdminClient()
  const [{ data: interviews }, { data: assessments }, { data: invites }] = await Promise.all([
    admin.from('interview_sessions').select('id,candidate_name,candidate_email,role,completed_at').eq('status', 'completed').eq('decision_status', 'passed').order('completed_at', { ascending: false }),
    admin.from('assessment_roles').select('id,title').eq('status', 'published').order('title'),
    admin.from('assessment_invites').select('id,candidate_name,candidate_email,role,assessment_id,status,invited_at,deadline_at,completed_at').order('invited_at', { ascending: false }),
  ])

  const passed: PassedInterview[] = (interviews ?? []).filter(row => row.candidate_email).map(row => ({ id: row.id, name: row.candidate_name || 'Unnamed applicant', email: row.candidate_email!.toLowerCase(), role: row.role || 'Unspecified role', completedAt: row.completed_at }))
  const titles = new Map((assessments ?? []).map(item => [item.id, item.title]))
  const inviteRows: InviteRow[] = (invites ?? []).map(row => ({ id: row.id, name: row.candidate_name || 'Unnamed applicant', email: row.candidate_email, role: row.role || 'Unspecified role', assessmentId: row.assessment_id, assessmentTitle: titles.get(row.assessment_id) ?? 'Assessment', status: row.status, invitedAt: row.invited_at, deadlineAt: row.deadline_at, completedAt: row.completed_at }))

  return (
    <div className="min-h-screen bg-[#faf8f2] lg:flex">
      <AdminSidebar />
      <main className="min-w-0 flex-1 p-6 lg:p-12">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#f47700]">CARE International</p>
        <h1 className="mt-3 text-4xl font-semibold text-[#101b30]">Skills assessment invites</h1>
        <p className="mt-3 max-w-2xl text-lg text-[#455c7d]">Applicants whose interview is marked as passed appear here for the final skills screening. Invites are limited to one per applicant and role, and are due by 23:59 UTC the following day. Offers can only be issued once the assessment is completed.</p>
        <AssessmentInviteBoard passed={passed} invites={inviteRows} assessments={(assessments ?? []) as PublishedAssessment[]} generatedAt={Date.now()} />
      </main>
    </div>
  )
}
