import { createAdminClient } from '@/lib/supabase/admin'
import type { InviteRow, PassedInterview, PublishedAssessment } from '@/components/assessment-invite-board'

export type AssessmentInviteData = { passed: PassedInterview[]; invites: InviteRow[]; assessments: PublishedAssessment[] }

export async function loadAssessmentInviteData(): Promise<AssessmentInviteData> {
  const admin = createAdminClient()
  const [{ data: interviews }, { data: assessments }, { data: invites }] = await Promise.all([
    admin.from('interview_sessions').select('id,candidate_name,candidate_email,role,completed_at').eq('status', 'completed').eq('decision_status', 'passed').order('completed_at', { ascending: false }),
    admin.from('assessment_roles').select('id,title').eq('status', 'published').order('title'),
    admin.from('assessment_invites').select('id,candidate_name,candidate_email,role,assessment_id,status,invited_at,deadline_at,completed_at').order('invited_at', { ascending: false }),
  ])

  const passed: PassedInterview[] = (interviews ?? []).filter(row => row.candidate_email).map(row => ({ id: row.id, name: row.candidate_name || 'Unnamed applicant', email: row.candidate_email!.toLowerCase(), role: row.role || 'Unspecified role', completedAt: row.completed_at }))
  const titles = new Map((assessments ?? []).map(item => [item.id, item.title]))
  const inviteRows: InviteRow[] = (invites ?? []).map(row => ({ id: row.id, name: row.candidate_name || 'Unnamed applicant', email: row.candidate_email, role: row.role || 'Unspecified role', assessmentId: row.assessment_id, assessmentTitle: titles.get(row.assessment_id) ?? 'Assessment', status: row.status, invitedAt: row.invited_at, deadlineAt: row.deadline_at, completedAt: row.completed_at }))
  return { passed, invites: inviteRows, assessments: (assessments ?? []) as PublishedAssessment[] }
}
