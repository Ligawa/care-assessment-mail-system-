export const STALE_INTERVIEW_INVITE_DAYS = 7

type InterviewInvite = {
  status: string
  startedAt: string | null
  completedAt: string | null
  createdAt: string | null
}

export function isStalePendingInterviewInvite(invite: InterviewInvite, now = Date.now()) {
  if (invite.status !== 'invited' || invite.startedAt || invite.completedAt || !invite.createdAt) return false
  const createdAt = new Date(invite.createdAt).getTime()
  return Number.isFinite(createdAt) && createdAt < now - STALE_INTERVIEW_INVITE_DAYS * 24 * 60 * 60 * 1000
}

export function getStaleInterviewInviteCutoff(now = Date.now()) {
  return new Date(now - STALE_INTERVIEW_INVITE_DAYS * 24 * 60 * 60 * 1000).toISOString()
}
