import { redirect } from 'next/navigation'
import AdminSidebar from '@/components/admin-sidebar'
import AssessmentInviteBoard from '@/components/assessment-invite-board'
import { createClient } from '@/lib/supabase/server'
import { loadAssessmentInviteData } from '@/lib/assessment-invite-data'

export const dynamic = 'force-dynamic'

export default async function AssessmentInvitesPage() {
  const sessionClient = await createClient()
  const { data: { user } } = await sessionClient.auth.getUser()
  if (!user) redirect('/admin/login')
  const { passed, invites, assessments } = await loadAssessmentInviteData()

  return (
    <div className="min-h-screen bg-[#faf8f2] lg:flex">
      <AdminSidebar />
      <main className="min-w-0 flex-1 p-6 lg:p-12">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#f47700]">CARE International</p>
        <h1 className="mt-3 text-4xl font-semibold text-[#101b30]">Skills assessment invites</h1>
        <p className="mt-3 max-w-2xl text-lg text-[#455c7d]">Applicants whose interview is marked as passed appear here for the final skills screening. Invites are limited to one per applicant and role, and are due by 23:59 UTC the following day. Offers can only be issued once the assessment is completed.</p>
        <AssessmentInviteBoard passed={passed} invites={invites} assessments={assessments} generatedAt={Date.now()} />
      </main>
    </div>
  )
}
