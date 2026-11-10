import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient } from '@/lib/supabase/server'
import { HR_CONTACT, buildOfferLetterPdf, formatLongDate, formatMonthlySalary } from '@/lib/offer-letter-pdf'
import { offerSchema } from '@/lib/offer-letter-schema'

const resend = new Resend(process.env.RESEND_API_KEY)
const candidateIdFragment = (id: string) => id.replaceAll('-', '').slice(0, 8).toUpperCase()

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email?.toLowerCase().endsWith('@care-intrenational.org')) return NextResponse.json({ error: 'Your admin session is not authorized to issue offers.' }, { status: 401 })
  if (!process.env.RESEND_API_KEY) return NextResponse.json({ error: 'Email delivery is not configured. Add RESEND_API_KEY in the project environment.' }, { status: 503 })
  const parsed = offerSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: 'Complete all offer fields, including a basic salary greater than zero.' }, { status: 400 })
  const input = parsed.data
  const hrReference = `CARE-${new Date().getUTCFullYear()}-${candidateIdFragment(input.submissionId)}`

  const { data: candidate } = await supabase.from('assessment_submissions').select('id,full_name,email,decision_status,offer_status,offer_request_key').eq('id', input.submissionId).maybeSingle()
  if (!candidate) return NextResponse.json({ error: 'Candidate not found.' }, { status: 404 })
  const { data: completedInvite } = await supabase.from('assessment_invites').select('id').eq('submission_id', candidate.id).eq('status', 'completed').maybeSingle()
  if (!completedInvite) return NextResponse.json({ error: 'Offers can only be issued to applicants who completed their invited skills assessment.' }, { status: 400 })

  const requestKey = [candidate.id, input.startDate, hrReference, input.acceptanceDeadline, input.basicSalary, input.contractDuration, input.workArrangement].join(':')
  if (candidate.offer_status === 'sent' && candidate.offer_request_key === requestKey) return NextResponse.json({ message: 'Offer already sent.' })

  const { error: saving } = await supabase.from('assessment_submissions').update({
    decision_status: 'passed', offer_status: 'generating', offer_error: null, offer_request_key: requestKey,
    offer_start_date: input.startDate, offer_duty_station: input.workArrangement, offer_department: input.department,
    offer_contract_type: input.contractType, offer_hr_reference: hrReference, offer_document_deadline: input.documentDeadline,
    offer_job_title: input.jobTitle, offer_applicant_name: input.applicantName, offer_basic_salary: input.basicSalary,
    offer_contract_duration: input.contractDuration, offer_work_arrangement: input.workArrangement, offer_acceptance_deadline: input.acceptanceDeadline,
  }).eq('id', candidate.id)
  if (saving) return NextResponse.json({ error: saving.message }, { status: 500 })

  const issueDate = new Date()
  const bytes = await buildOfferLetterPdf({ ...input, hrReference, issueDate })
  const safeName = candidate.full_name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()
  const salary = formatMonthlySalary(input.basicSalary)
  const acceptanceDeadline = formatLongDate(input.acceptanceDeadline)

  const text = `Dear ${input.applicantName},

CONDITIONAL OFFER OF EMPLOYMENT
Reference: ${hrReference}
Position: ${input.jobTitle}
Basic salary: ${salary}, plus any bonuses and allowances set out in your contract
Contract: ${input.contractType}, ${input.contractDuration}
Work arrangement: ${input.workArrangement}

Congratulations. Following completion of our recruitment and selection process, CARE International is pleased to share your conditional offer of employment.

PLEASE READ CAREFULLY
The attached PDF contains the complete terms and conditions of your conditional offer. Please review every page and retain a copy for your records.

HOW TO ACCEPT
1. Download and print the attached offer letter.
2. Sign the applicant acceptance page using ink.
3. Scan the complete signed document clearly.
4. Reply to this email with the scanned signed copy attached by ${acceptanceDeadline}.

PRE-DEPLOYMENT REQUIREMENTS
Please submit the following documents, each in English, French and Portuguese, by ${formatLongDate(input.documentDeadline)}:
1. Primary / basic school certificate
2. Secondary school certificate
3. Tertiary certificates provided during application processing
4. Police clearance document (if available)
5. Tax documents (if available)
If a police clearance or tax document cannot be obtained in your country, tell us in writing before the deadline.

DOCUMENTS AND TRANSLATION
Documents must be provided in English, French and Portuguese, and all translations must be done by an internationally sworn translator. We do not pay for translations upfront; translation costs are reimbursed once you submit the receipts. If you need documents translated, you may contact Lingua Bridge at info@linguab.com or visit https://linguab.com. More details will be explained during onboarding and documentation.

Your appointment remains conditional until the applicable requirements are completed and confirmed by Human Resources.

QUESTIONS
For questions, reply to this email and quote HR reference ${hrReference}.

Kind regards,

${HR_CONTACT}
CARE International`

  const sent = await resend.emails.send({
    from: 'CARE International <careers@care-intrenational.org>',
    to: [candidate.email],
    subject: `Conditional Offer of Employment | ${hrReference}`,
    text,
    attachments: [{ filename: `conditional-offer-${safeName}.pdf`, content: Buffer.from(bytes).toString('base64') }],
  })
  if (sent.error) {
    await supabase.from('assessment_submissions').update({ offer_status: 'failed', offer_error: sent.error.message }).eq('id', candidate.id)
    return NextResponse.json({ error: sent.error.message }, { status: 502 })
  }
  const { error: finalError } = await supabase.from('assessment_submissions').update({ offer_status: 'sent', offer_sent_at: issueDate.toISOString(), offer_error: null }).eq('id', candidate.id)
  if (finalError) return NextResponse.json({ error: `Offer sent but status could not be saved: ${finalError.message}` }, { status: 500 })
  return NextResponse.json({ message: 'Offer letter sent. You can download a copy from the Offers page.' })
}
