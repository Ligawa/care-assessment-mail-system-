import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { interviewInvitationEmail } from '@/lib/interview-invitation-email'
import { BETWEEN_EMAILS_DELAY_MS, sendWithRetry, wait } from '@/lib/email-delivery'

export const maxDuration = 300

const schema = z.object({ portalIds: z.array(z.string().uuid()).max(300).optional() })
const DEFAULT_ROLE = 'Accounts Payable Clerk'

export async function POST(request: Request) {
  const session = await createClient()
  const { data: { user } } = await session.auth.getUser()
  if (!user?.email?.toLowerCase().endsWith('@care-intrenational.org')) return NextResponse.json({ error: 'Admin sign-in required.' }, { status: 401 })
  const parsed = schema.safeParse(await request.json().catch(() => ({})))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  if (!process.env.RESEND_API_KEY) return NextResponse.json({ error: 'Email service is not configured.' }, { status: 500 })

  const supabase = createAdminClient()
  let portalQuery = supabase.from('applicant_document_portals').select('id,applicant_name,applicant_email,role,status,applicant_documents(id)').in('status', ['documents_received', 'partially_received'])
  if (parsed.data.portalIds?.length) portalQuery = portalQuery.in('id', parsed.data.portalIds)
  const { data: portals, error: portalsError } = await portalQuery
  if (portalsError) return NextResponse.json({ error: portalsError.message }, { status: 500 })

  const { data: existing } = await supabase.from('interview_sessions').select('candidate_email')
  const alreadyInvited = new Set((existing || []).map(row => row.candidate_email?.toLowerCase()))
  const seen = new Set<string>()
  const eligible = (portals || []).filter(portal => {
    const email = portal.applicant_email.toLowerCase()
    if (alreadyInvited.has(email) || seen.has(email) || !portal.applicant_documents?.length) return false
    seen.add(email)
    return true
  })
  if (!eligible.length) return NextResponse.json({ eligible: 0, sent: 0, skipped: (portals || []).length, failedEmails: [], deadline: null })

  const deadline = new Date(); deadline.setDate(deadline.getDate() + 1)
  const deadlineAt = deadline.toISOString().slice(0, 10)
  const deadlineLabel = deadline.toLocaleDateString('en-GB')
  const origin = 'https://assessment.care-intrenational.org'
  const resend = new Resend(process.env.RESEND_API_KEY)
  const failedEmails: string[] = []
  let sent = 0

  for (let index = 0; index < eligible.length; index += 1) {
    const portal = eligible[index]
    const role = portal.role || DEFAULT_ROLE
    const email = portal.applicant_email.toLowerCase()
    const { data: created, error } = await supabase.from('interview_sessions').insert({ access_code: `INT-${crypto.randomUUID().slice(0, 10).toUpperCase()}`, candidate_name: portal.applicant_name, candidate_email: email, role, status: 'invited', decision_status: 'pending', transcript: [], assessment: null, completed_at: null, deadline_at: deadlineAt }).select('id,access_code').single()
    if (error || !created) { failedEmails.push(email); continue }
    try {
      const result = await sendWithRetry(() => resend.emails.send({ from: 'CARE International <careers@care-intrenational.org>', to: [email], subject: `Invitation to AI-powered interview - ${role}`, html: interviewInvitationEmail({ role, deadline: deadlineLabel, url: `${origin}/interview/${created.access_code}` }) }))
      if (result.error) throw new Error(result.error.message)
      sent += 1
    } catch {
      failedEmails.push(email)
      await supabase.from('interview_sessions').delete().eq('id', created.id)
    }
    if (index < eligible.length - 1) await wait(BETWEEN_EMAILS_DELAY_MS)
  }
  return NextResponse.json({ eligible: eligible.length, sent, skipped: (portals || []).length - eligible.length, failedEmails, deadline: deadlineLabel })
}
