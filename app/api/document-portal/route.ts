import { put } from '@vercel/blob'
import { createHash, randomBytes } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const hash = (value: string) => createHash('sha256').update(value).digest('hex')

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
  return NextResponse.json({ url: `${request.nextUrl.origin}/documents/${token}` })
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
