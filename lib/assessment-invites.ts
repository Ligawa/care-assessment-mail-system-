import { Resend } from 'resend'
import type { SupabaseClient } from '@supabase/supabase-js'
import { BETWEEN_EMAILS_DELAY_MS, sendWithRetry, wait } from '@/lib/email-delivery'

export const ASSESSMENT_ORIGIN = 'https://assessment.care-intrenational.org'

export type AssessmentSummary = { id: string; title: string; access_code: string; duration_minutes: number | null; question_count: number | null }
export type InviteCandidate = { id: string; candidate_name: string | null; candidate_email: string | null; role: string | null }

export function assessmentDeadline(from = new Date()) {
  return new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate() + 1, 23, 59, 59))
}

export function formatAssessmentDeadline(value: Date | string) {
  const date = new Date(value)
  const day = date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
  return `${day} at 23:59 UTC`
}

export function assessmentInviteEmail({ role, assessmentTitle, url, deadline, durationMinutes, questionCount }: { role: string; assessmentTitle: string; url: string; deadline: string; durationMinutes: number | null; questionCount: number | null }) {
  const facts = [durationMinutes ? `${durationMinutes} minutes` : null, questionCount ? `${questionCount} questions` : null].filter(Boolean).join(' &middot; ')
  return `<!DOCTYPE html><html><body style="margin:0;background:#f3f5f7;font-family:Arial,Helvetica,sans-serif;color:#333"><table width="100%" cellpadding="0" cellspacing="0" style="padding:30px 10px;background:#f3f5f7"><tr><td align="center"><table width="100%" style="max-width:680px;background:#fff;border:1px solid #e5e7eb"><tr><td style="padding:28px 35px;text-align:center;border-bottom:4px solid #e57200"><img src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Care%20Intl%20logo-8dXiV9R7mb3d8yCbmDLtahqHcQJ2Xm.png" alt="CARE International" width="190"></td></tr><tr><td style="padding:34px 35px;font-size:14px;line-height:1.8"><h1 style="color:#252525;font-size:25px;margin:0 0 18px">Final screening: skills assessment</h1><p>Dear Applicant,</p><p>Thank you for completing your interview for the <strong>${role}</strong> position at CARE International. We are pleased to invite you to the final stage of screening, a brief skill-based assessment.</p><table width="100%" style="background:#fff7ee;border-left:4px solid #e57200;margin:22px 0"><tr><td style="padding:18px 20px"><strong style="color:#c25e00">Deadline</strong><br><span style="font-size:16px;font-weight:bold">${deadline}</span>${facts ? `<br><span style="color:#555">${assessmentTitle} &middot; ${facts}</span>` : ''}</td></tr></table><p style="text-align:center;margin:28px 0"><a href="${url}" style="display:inline-block;background:#e57200;color:#fff;text-decoration:none;font-weight:bold;padding:16px 32px;border-radius:4px">START YOUR SKILLS ASSESSMENT</a></p><p><strong>Before you begin</strong></p><ul style="line-height:2;padding-left:20px"><li>This link is personal to you. Please do not share it.</li><li>Use the same email address this invitation was sent to.</li><li>Once started, the timer runs until you submit. Choose a quiet place with a stable connection.</li><li>The assessment can only be submitted once.</li><li>Your results will be reviewed by the HR team.</li></ul><p>If the button does not work, copy and paste this link into your browser:<br><a href="${url}" style="color:#e57200;word-break:break-all">${url}</a></p><p>Kind regards,<br>CARE International Recruitment Team</p></td></tr></table></td></tr></table></body></html>`
}

export type InviteResult = { eligible: number; sent: number; skippedDuplicates: string[]; failedEmails: string[]; deadline: string }

export async function sendAssessmentInvites(admin: SupabaseClient, assessment: AssessmentSummary, candidates: InviteCandidate[]): Promise<InviteResult> {
  const deadline = assessmentDeadline()
  const deadlineLabel = formatAssessmentDeadline(deadline)
  const withEmail = candidates.filter(candidate => candidate.candidate_email)
  const emails = [...new Set(withEmail.map(candidate => candidate.candidate_email!.toLowerCase()))]
  const { data: existing } = emails.length
    ? await admin.from('assessment_invites').select('candidate_email,assessment_id,role').in('candidate_email', emails)
    : { data: [] as { candidate_email: string; assessment_id: string; role: string | null }[] }

  const skippedDuplicates: string[] = []
  const failedEmails: string[] = []
  const seen = new Set<string>()
  const eligible = withEmail.filter(candidate => {
    const email = candidate.candidate_email!.toLowerCase()
    const role = (candidate.role || assessment.title).toLowerCase()
    const duplicate = seen.has(email) || (existing || []).some(row => row.candidate_email.toLowerCase() === email && (row.assessment_id === assessment.id || (row.role || '').toLowerCase() === role))
    if (duplicate) { skippedDuplicates.push(email); return false }
    seen.add(email)
    return true
  })

  const resend = new Resend(process.env.RESEND_API_KEY)
  let sent = 0
  for (let index = 0; index < eligible.length; index += 1) {
    const candidate = eligible[index]
    const email = candidate.candidate_email!.toLowerCase()
    const role = candidate.role || assessment.title
    const { data: invite, error } = await admin.from('assessment_invites').insert({ interview_id: candidate.id, assessment_id: assessment.id, candidate_name: candidate.candidate_name, candidate_email: email, role, deadline_at: deadline.toISOString() }).select('id,token').single()
    if (error || !invite) {
      if (error?.code === '23505') skippedDuplicates.push(email)
      else failedEmails.push(email)
      continue
    }
    try {
      const url = `${ASSESSMENT_ORIGIN}/assessment/${assessment.access_code}?invite=${invite.token}`
      const result = await sendWithRetry(() => resend.emails.send({ from: 'CARE International <careers@care-intrenational.org>', to: [email], subject: `Final screening: skills assessment - ${role}`, html: assessmentInviteEmail({ role, assessmentTitle: assessment.title, url, deadline: deadlineLabel, durationMinutes: assessment.duration_minutes, questionCount: assessment.question_count }) }))
      if (result.error) throw new Error(result.error.message)
      sent += 1
    } catch {
      failedEmails.push(email)
      await admin.from('assessment_invites').delete().eq('id', invite.id)
    }
    if (index < eligible.length - 1) await wait(BETWEEN_EMAILS_DELAY_MS)
  }
  return { eligible: eligible.length, sent, skippedDuplicates, failedEmails, deadline: deadlineLabel }
}
