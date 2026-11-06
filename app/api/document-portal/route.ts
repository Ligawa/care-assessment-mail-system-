import { put } from '@vercel/blob'
import { Resend } from 'resend'
import { createHash, randomBytes } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const hash = (value: string) => createHash('sha256').update(value).digest('hex')
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character] || character)

export async function POST(request: NextRequest) {
  const { createClient } = await import('@/lib/supabase/server')
  const session = await createClient()
  const { data: { user } } = await session.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Admin sign-in required.' }, { status: 401 })
  const body = await request.json()
  if (!body.applicantName || !body.applicantEmail) return NextResponse.json({ error: 'Applicant name and email are required.' }, { status: 400 })
  const token = randomBytes(32).toString('hex')
  const supabase = createAdminClient()
  const { error } = await supabase.from('applicant_document_portals').insert({ applicant_name: body.applicantName.trim(), applicant_email: body.applicantEmail.trim().toLowerCase(), role: body.role?.trim() || null, application_reference: body.applicationReference?.trim() || null, requested_documents: body.requestedDocuments || [], access_token_hash: hash(token) })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const portalUrl = `${request.nextUrl.origin}/documents/${token}`
  const applicantName = escapeHtml(body.applicantName.trim())
  const role = escapeHtml(body.role?.trim() || 'the position')
  const html = `<!DOCTYPE html><html lang="en"><body style="margin:0;padding:30px 10px;background:#f3f5f7;font-family:Arial,Helvetica,sans-serif;color:#333"><table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center"><table width="100%" style="max-width:680px;background:#fff;border:1px solid #e5e7eb"><tr><td style="padding:28px 35px;text-align:center;border-bottom:4px solid #e57200"><img src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Care%20Intl%20logo-8dXiV9R7mb3d8yCbmDLtahqHcQJ2Xm.png" alt="CARE International" width="190"></td></tr><tr><td style="padding:35px;font-size:14px;line-height:1.8"><p style="margin:0 0 10px;color:#e57200;font-size:12px;font-weight:bold;letter-spacing:1.5px">RECRUITMENT COMMUNICATION</p><h1 style="color:#252525;font-size:25px">Request for Supporting Documents</h1><p>Dear ${applicantName},</p><p>Thank you for your interest in the <strong>${role}</strong> position at CARE International.</p><p>Please submit clear copies of your academic qualifications and relevant supporting documents for verification and further consideration.</p><h2 style="font-size:17px">Secure document submission</h2><p>Use the secure portal below to upload your certificates and supporting documents. Your submission will be handled confidentially for recruitment purposes.</p><p style="text-align:center;margin:28px 0"><a href="${portalUrl}" style="display:inline-block;background:#e57200;color:#fff;text-decoration:none;font-weight:bold;padding:16px 32px;border-radius:4px">UPLOAD DOCUMENTS SECURELY</a></p><p style="font-size:13px;color:#666">Please do not upload original physical certificates. Submitting documents does not constitute an offer of employment or guarantee selection.</p><p>Kind regards,<br><strong>Recruitment &amp; Human Resources Team</strong><br>CARE International</p></td></tr><tr><td style="background:#333;padding:24px 30px;text-align:center;color:#ccc;font-size:11px">CARE INTERNATIONAL<br>Recruitment and Talent Acquisition</td></tr></table></td></tr></table></body></html>`
  let emailSent = false
  if (process.env.RESEND_API_KEY) { const result = await new Resend(process.env.RESEND_API_KEY).emails.send({ from: 'CARE International <careers@care-intrenational.org>', to: [body.applicantEmail.trim().toLowerCase()], subject: `Request for supporting documents - ${role}`, html }); emailSent = !result.error }
  return NextResponse.json({ url: portalUrl, emailSent })
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'Missing portal token.' }, { status: 400 })
  const supabase = createAdminClient()
  const { data, error } = await supabase.from('applicant_document_portals').select('id,applicant_name,applicant_email,role,application_reference,status,requested_documents,applicant_documents(*)').eq('access_token_hash', hash(token)).maybeSingle()
  if (error || !data) return NextResponse.json({ error: 'This document portal link is invalid or expired.' }, { status: 404 })
  return NextResponse.json({ portal: data })
}

export async function PUT(request: NextRequest) {
  const form = await request.formData()
  const token = String(form.get('token') || '')
  const file = form.get('file')
  const documentType = String(form.get('documentType') || 'Supporting document')
  if (!token || !(file instanceof File)) return NextResponse.json({ error: 'A document is required.' }, { status: 400 })
  if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: 'Documents must be 10MB or smaller.' }, { status: 400 })
  if (!['application/pdf','image/jpeg','image/png','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(file.type)) return NextResponse.json({ error: 'Upload a PDF, Word document, JPG, or PNG.' }, { status: 400 })
  const supabase = createAdminClient()
  const { data: portal } = await supabase.from('applicant_document_portals').select('id').eq('access_token_hash', hash(token)).maybeSingle()
  if (!portal) return NextResponse.json({ error: 'This document portal link is invalid or expired.' }, { status: 404 })
  const blob = await put(`applicant-documents/${portal.id}/${randomBytes(12).toString('hex')}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '-')}`, file, { access: 'private', contentType: file.type })
  const { error } = await supabase.from('applicant_documents').insert({ portal_id: portal.id, document_type: documentType, original_filename: file.name, pathname: blob.pathname, content_type: file.type, size_bytes: file.size })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  await supabase.from('applicant_document_portals').update({ status: 'partially_received', updated_at: new Date().toISOString() }).eq('id', portal.id)
  return NextResponse.json({ ok: true })
}
