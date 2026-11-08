export type PortalRow = { id: string; applicant_name: string; applicant_email: string; status: string; deadline_at: string | null; submitted_at: string | null }
export type InterviewRow = { id: string; candidate_email: string | null; status: string; decision_status: string | null; deadline_at: string | null }
export type CandidateRow = { id: string; decision_status: string | null; offer_status: string | null; submitted_at: string | null }

export type PipelineStats = {
  funnel: { label: string; value: number; hint: string }[]
  documents: { invited: number; awaiting: number; partial: number; received: number; overdue: number; readyForInterview: number }
  interviews: { invited: number; completed: number; passed: number; failed: number; awaitingDecision: number; overdue: number }
  offers: { assessed: number; passed: number; readyForOffer: number; issued: number; failed: number; notPassed: number }
  recentSubmissions: { id: string; name: string; email: string; status: string; submittedAt: string }[]
}

export function buildPipelineStats(portals: PortalRow[], interviews: InterviewRow[], candidates: CandidateRow[]): PipelineStats {
  const now = Date.now()
  const isPast = (value: string | null) => !!value && new Date(value).getTime() < now
  const invitedEmails = new Set(interviews.map(item => item.candidate_email?.toLowerCase()).filter(Boolean) as string[])

  const received = portals.filter(portal => portal.status === 'documents_received')
  const partial = portals.filter(portal => portal.status === 'partially_received')
  const awaiting = portals.filter(portal => portal.status !== 'documents_received' && portal.status !== 'partially_received')
  const overdueDocs = portals.filter(portal => portal.status !== 'documents_received' && isPast(portal.deadline_at))
  const readyForInterview = portals.filter(portal => (portal.status === 'documents_received' || portal.status === 'partially_received') && !invitedEmails.has(portal.applicant_email.toLowerCase()))

  const completed = interviews.filter(item => item.status === 'completed')
  const passedInterviews = completed.filter(item => item.decision_status === 'passed')
  const failedInterviews = completed.filter(item => item.decision_status === 'failed' || item.decision_status === 'not_passed')
  const awaitingDecision = completed.filter(item => !item.decision_status || item.decision_status === 'pending')
  const overdueInterviews = interviews.filter(item => item.status !== 'completed' && isPast(item.deadline_at))

  const passedCandidates = candidates.filter(item => item.decision_status === 'passed')
  const issued = candidates.filter(item => item.offer_status === 'sent')
  const readyForOffer = passedCandidates.filter(item => item.offer_status !== 'sent')
  const failedOffers = candidates.filter(item => item.offer_status === 'failed')

  const recentSubmissions = portals
    .filter(portal => portal.submitted_at && (portal.status === 'documents_received' || portal.status === 'partially_received'))
    .sort((a, b) => new Date(b.submitted_at!).getTime() - new Date(a.submitted_at!).getTime())
    .slice(0, 6)
    .map(portal => ({ id: portal.id, name: portal.applicant_name, email: portal.applicant_email, status: portal.status, submittedAt: portal.submitted_at! }))

  return {
    funnel: [
      { label: 'Document invites sent', value: portals.length, hint: 'Applicants asked to upload documents' },
      { label: 'Documents submitted', value: received.length + partial.length, hint: 'Fully or partially received' },
      { label: 'Interview invites sent', value: interviews.length, hint: 'AI-powered interview links issued' },
      { label: 'Interviews completed', value: completed.length, hint: 'Ready for HR review' },
      { label: 'Passed and ready', value: passedCandidates.length, hint: 'Passed candidates eligible for an offer' },
      { label: 'Offer letters issued', value: issued.length, hint: 'Conditional offers emailed' }
    ],
    documents: { invited: portals.length, awaiting: awaiting.length, partial: partial.length, received: received.length, overdue: overdueDocs.length, readyForInterview: readyForInterview.length },
    interviews: { invited: interviews.length, completed: completed.length, passed: passedInterviews.length, failed: failedInterviews.length, awaitingDecision: awaitingDecision.length, overdue: overdueInterviews.length },
    offers: { assessed: candidates.length, passed: passedCandidates.length, readyForOffer: readyForOffer.length, issued: issued.length, failed: failedOffers.length, notPassed: candidates.filter(item => item.decision_status === 'not_passed').length },
    recentSubmissions
  }
}
