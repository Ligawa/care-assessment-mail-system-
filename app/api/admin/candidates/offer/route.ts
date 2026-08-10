import { NextResponse } from 'next/server'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { Resend } from 'resend'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const schema = z.object({ submissionId: z.string().uuid(), startDate: z.string().min(1), dutyStation: z.string().min(1), department: z.string().min(1), contractType: z.string().min(1), hrReference: z.string().min(1), documentDeadline: z.string().min(1) })
const resend = new Resend(process.env.RESEND_API_KEY)

function wrap(text: string, max = 92) { const words = text.split(' '); const lines: string[] = []; let line = ''; for (const word of words) { if ((line + ' ' + word).trim().length > max) { lines.push(line); line = word } else line = (line + ' ' + word).trim() } if (line) lines.push(line); return lines }

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email?.toLowerCase().endsWith('@care-intrenational.org')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const parsed = schema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: 'Complete all offer fields.' }, { status: 400 })
  const input = parsed.data
  const { data: candidate } = await supabase.from('assessment_submissions').select('id,full_name,email,decision_status,offer_status,offer_request_key').eq('id', input.submissionId).maybeSingle()
  if (!candidate) return NextResponse.json({ error: 'Candidate not found.' }, { status: 404 })
  if (candidate.decision_status !== 'passed') return NextResponse.json({ error: 'Offers can only be issued to passed candidates.' }, { status: 400 })
  const requestKey = `${candidate.id}:${input.startDate}:${input.hrReference}`
  if (candidate.offer_status === 'sent' && candidate.offer_request_key === requestKey) return NextResponse.json({ message: 'Offer already sent.' })
  const { error: saving } = await supabase.from('assessment_submissions').update({ offer_status: 'generating', offer_error: null, offer_request_key: requestKey, offer_start_date: input.startDate, offer_duty_station: input.dutyStation, offer_department: input.department, offer_contract_type: input.contractType, offer_hr_reference: input.hrReference, offer_document_deadline: input.documentDeadline }).eq('id', candidate.id)
  if (saving) return NextResponse.json({ error: saving.message }, { status: 500 })

  const pdf = await PDFDocument.create(); const page = pdf.addPage([595, 842]); const font = await pdf.embedFont(StandardFonts.Helvetica); const bold = await pdf.embedFont(StandardFonts.HelveticaBold); let y = 790
  const draw = (text: string, size = 10, isBold = false, gap = 16) => { for (const line of wrap(text)) { page.drawText(line, { x: 52, y, size, font: isBold ? bold : font, color: rgb(0.12, 0.15, 0.18) }); y -= gap } y -= 4 }
  draw('CONDITIONAL OFFER OF EMPLOYMENT', 16, true, 22); draw('CARE INTERNATIONAL', 11, true); draw(`Date: ${new Date().toLocaleDateString('en-GB')}    Reference: ${input.hrReference}`); draw(`To: ${candidate.full_name}    Position: Candidate appointment    Duty Station: ${input.dutyStation}    Department/Programme: ${input.department}    Proposed Start Date: ${input.startDate}    Contract Type: ${input.contractType}`); draw('RE: CONDITIONAL OFFER OF EMPLOYMENT', 12, true, 18); draw(`Dear ${candidate.full_name},`); draw('Following the completion of the applicable recruitment and selection process, we are pleased to provide you with this conditional offer of employment for the position of Candidate appointment, subject to satisfactory completion of the pre-employment and onboarding requirements outlined below.'); draw('1. CONDITIONS OF OFFER', 11, true); draw('This offer is conditional upon satisfactory verification of academic and professional qualifications; verification of references and employment history; confirmation of eligibility to work in the applicable duty station; completion of required compliance, safeguarding and background checks; and submission and verification of all required onboarding documentation.'); draw('2. DOCUMENT SUBMISSION DEADLINE', 11, true); draw(`All requested documents must be submitted by ${input.documentDeadline}. Failure to provide required documentation may result in a delay, amendment or withdrawal of this conditional offer.`); draw('3. ACCEPTANCE DEADLINE', 11, true); draw('You must confirm your acceptance of this conditional offer within two (2) calendar days of receiving this letter by signing and returning it to Human Resources.'); draw('This conditional offer does not constitute a final appointment or employment contract. Final appointment is subject to satisfactory completion of all applicable requirements.'); draw('Yours sincerely,'); draw('Human Resources\nCARE International'); draw('APPLICANT ACCEPTANCE', 11, true); draw('I accept the conditional offer described above.\nSignature: ____________________    Date: ____________________')
  const bytes = await pdf.save()
  const sent = await resend.emails.send({ from: 'CARE International <careers@care-intrenational.org>', to: [candidate.email], subject: 'Conditional Offer of Employment', text: `Dear ${candidate.full_name}, please find your conditional offer of employment attached.`, attachments: [{ filename: `conditional-offer-${candidate.full_name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.pdf`, content: Buffer.from(bytes).toString('base64') }] })
  if (sent.error) { await supabase.from('assessment_submissions').update({ offer_status: 'failed', offer_error: sent.error.message }).eq('id', candidate.id); return NextResponse.json({ error: sent.error.message }, { status: 502 }) }
  const { error: finalError } = await supabase.from('assessment_submissions').update({ offer_status: 'sent', offer_sent_at: new Date().toISOString(), offer_error: null }).eq('id', candidate.id)
  if (finalError) return NextResponse.json({ error: `Offer sent but status could not be saved: ${finalError.message}` }, { status: 500 })
  return NextResponse.json({ message: 'Offer letter sent.' })
}
