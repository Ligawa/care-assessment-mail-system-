import { createAdminClient } from '@/lib/supabase/admin'
import { calculateAssessmentScore, type ScoreQuestion } from '@/lib/assessment-score'
import type { InviteRow, PassedInterview, PublishedAssessment } from '@/components/assessment-invite-board'

export type AssessmentInviteData = { passed: PassedInterview[]; invites: InviteRow[]; assessments: PublishedAssessment[] }

export async function loadAssessmentInviteData(): Promise<AssessmentInviteData> {
  const admin = createAdminClient()
  const [{ data: interviews }, { data: assessments }, { data: invites }] = await Promise.all([
    admin.from('interview_sessions').select('id,candidate_name,candidate_email,role,completed_at').eq('status', 'completed').eq('decision_status', 'passed').is('assessment_removed_at', null).order('completed_at', { ascending: false }),
    admin.from('assessment_roles').select('id,title').eq('status', 'published').order('title'),
    admin.from('assessment_invites').select('id,candidate_name,candidate_email,role,assessment_id,status,invited_at,deadline_at,completed_at,submission_id').order('invited_at', { ascending: false }),
  ])

  const submissionIds = (invites ?? []).map(row => row.submission_id).filter((id): id is string => Boolean(id))
  const assessmentIds = [...new Set((invites ?? []).filter(row => row.submission_id).map(row => row.assessment_id))]
  const [{ data: submissions }, { data: questions }] = await Promise.all([
    submissionIds.length ? admin.from('assessment_submissions').select('id,answers').in('id', submissionIds) : Promise.resolve({ data: [] as { id: string; answers: Record<string, unknown> | null }[] }),
    assessmentIds.length ? admin.from('assessment_questions').select('id,assessment_id,position,competency,prompt,options,answer_key').in('assessment_id', assessmentIds) : Promise.resolve({ data: [] as (ScoreQuestion & { assessment_id: string })[] }),
  ])
  const answersBySubmission = new Map((submissions ?? []).map(item => [item.id, item.answers as Record<string, unknown> | null]))
  const questionsByAssessment = new Map<string, ScoreQuestion[]>()
  for (const question of questions ?? []) questionsByAssessment.set(question.assessment_id, [...(questionsByAssessment.get(question.assessment_id) ?? []), question])

  const passed: PassedInterview[] = (interviews ?? []).filter(row => row.candidate_email).map(row => ({ id: row.id, name: row.candidate_name || 'Unnamed applicant', email: row.candidate_email!.toLowerCase(), role: row.role || 'Unspecified role', completedAt: row.completed_at }))
  const titles = new Map((assessments ?? []).map(item => [item.id, item.title]))
  const inviteRows: InviteRow[] = (invites ?? []).map(row => {
    const submitted = row.submission_id ? answersBySubmission.has(row.submission_id) : false
    const score = submitted ? calculateAssessmentScore(questionsByAssessment.get(row.assessment_id) ?? [], answersBySubmission.get(row.submission_id!) ?? null) : null
    return { id: row.id, name: row.candidate_name || 'Unnamed applicant', email: row.candidate_email, role: row.role || 'Unspecified role', assessmentId: row.assessment_id, assessmentTitle: titles.get(row.assessment_id) ?? 'Assessment', status: row.status, invitedAt: row.invited_at, deadlineAt: row.deadline_at, completedAt: row.completed_at, submissionId: row.submission_id, score: score ? { percentage: score.percentage, correct: score.correct, total: score.total } : null }
  })
  return { passed, invites: inviteRows, assessments: (assessments ?? []) as PublishedAssessment[] }
}
