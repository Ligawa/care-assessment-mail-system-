import { redirect } from 'next/navigation'
import AdminSidebar from '@/components/admin-sidebar'
import InterviewLinkCreator from '@/components/interview-link-creator'
import InterviewsBoard, { type InterviewListItem } from '@/components/interviews-board'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export default async function InterviewsPage() {
  const sessionClient = await createClient()
  const { data: { user } } = await sessionClient.auth.getUser()
  if (!user) redirect('/admin/login')
  const supabase = createAdminClient()
  const [{ data: rows, error }, { data: positions }] = await Promise.all([
    supabase.from('interview_sessions').select('id,candidate_name,candidate_email,role,status,decision_status,created_at,started_at,completed_at,deadline_at,reminder_count,assessment').order('created_at', { ascending: false }),
    supabase.from('positions').select('id,title,status').order('title')
  ])
  if (error) console.error('[v0] Interview sessions query failed:', error.message)
  const interviews: InterviewListItem[] = (rows ?? []).map(row => {
    const assessment = row.assessment as { recommendation?: string; summary?: string } | null
    return {
      id: row.id,
      name: row.candidate_name || 'Unnamed candidate',
      email: row.candidate_email,
      role: row.role,
      status: row.status,
      decision: row.decision_status,
      createdAt: row.created_at,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      deadlineAt: row.deadline_at,
      reminders: row.reminder_count || 0,
      recommendation: assessment?.recommendation ?? null,
      summary: assessment?.summary ?? null
    }
  })
  return (
    <div className="min-h-screen bg-[#faf8f2] lg:flex">
      <AdminSidebar />
      <main className="min-w-0 flex-1 p-6 lg:p-12">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#f47700]">CARE International</p>
        <h1 className="mt-3 text-4xl font-semibold text-[#101b30]">Interviews</h1>
        <p className="mt-3 max-w-2xl text-lg text-[#455c7d]">Track every interview invite, see who has attempted or is still pending, review completed Emmy Nana interviews, and record outcomes.</p>
        <div className="mt-10"><InterviewLinkCreator positions={positions ?? []} /></div>
        <InterviewsBoard interviews={interviews} generatedAt={Date.now()} />
      </main>
    </div>
  )
}
