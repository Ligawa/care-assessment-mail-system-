import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildOfferLetterPdf } from '@/lib/offer-letter-pdf'

const LEGACY_MONTHLY_SALARY = 4500

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email?.toLowerCase().endsWith('@care-intrenational.org')) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })

  const { data: candidate } = await supabase.from('assessment_submissions').select('*').eq('id', id).maybeSingle()
  if (!candidate || !candidate.offer_hr_reference) return NextResponse.json({ error: 'No offer has been issued to this candidate.' }, { status: 404 })

  let jobTitle: string = candidate.offer_job_title ?? ''
  if (!jobTitle) {
    const { data: role } = await supabase.from('assessment_roles').select('title,position_id').eq('id', candidate.assessment_id).maybeSingle()
    const { data: position } = role?.position_id ? await supabase.from('positions').select('title').eq('id', role.position_id).maybeSingle() : { data: null }
    jobTitle = position?.title?.trim() || role?.title || 'Position'
  }

  const bytes = await buildOfferLetterPdf({
    applicantName: candidate.offer_applicant_name || candidate.full_name,
    jobTitle,
    hrReference: candidate.offer_hr_reference,
    issueDate: new Date(candidate.offer_sent_at ?? Date.now()),
    startDate: candidate.offer_start_date ?? 'To be confirmed',
    workArrangement: candidate.offer_work_arrangement || candidate.offer_duty_station || 'Remote',
    department: candidate.offer_department || 'Operations',
    contractType: candidate.offer_contract_type || 'Fixed-Term',
    contractDuration: candidate.offer_contract_duration || '2 years, renewable',
    basicSalary: Number(candidate.offer_basic_salary ?? LEGACY_MONTHLY_SALARY),
    documentDeadline: candidate.offer_document_deadline ?? 'the deadline stated in your offer email',
    acceptanceDeadline: candidate.offer_acceptance_deadline ?? 'the deadline stated in your offer email',
  })
  const safeName = candidate.full_name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()
  return new NextResponse(Buffer.from(bytes), { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="conditional-offer-${safeName}.pdf"`, 'Cache-Control': 'no-store' } })
}
