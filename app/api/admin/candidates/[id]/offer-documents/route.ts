import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { getOfferDocument, type OfferDocumentStatus } from '@/lib/offer-document-checklist'

const statuses = new Set<OfferDocumentStatus>(['pending', 'received', 'not_applicable'])

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email?.toLowerCase().endsWith('@care-intrenational.org')) {
    return NextResponse.json({ error: 'Your admin session is not authorized to update offer documents.' }, { status: 401 })
  }

  const { id } = await params
  let body: { documentKey?: unknown; status?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }

  if (typeof body.documentKey !== 'string' || typeof body.status !== 'string' || !statuses.has(body.status as OfferDocumentStatus)) {
    return NextResponse.json({ error: 'Choose a valid document and status.' }, { status: 400 })
  }

  const document = getOfferDocument(body.documentKey)
  const status = body.status as OfferDocumentStatus
  if (!document || (!document.optional && status === 'not_applicable')) {
    return NextResponse.json({ error: 'This document cannot be marked as not applicable.' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: candidate, error: candidateError } = await admin
    .from('assessment_submissions')
    .select('id,offer_status')
    .eq('id', id)
    .eq('offer_status', 'sent')
    .maybeSingle()
  if (candidateError) return NextResponse.json({ error: 'Could not verify the offer.' }, { status: 500 })
  if (!candidate) return NextResponse.json({ error: 'Candidate offer not found.' }, { status: 404 })

  const { error } = await admin.from('offer_document_submissions').upsert({
    submission_id: id,
    document_key: document.key,
    document_label: document.label,
    status,
    updated_at: new Date().toISOString(),
    updated_by: user.email,
  }, { onConflict: 'submission_id,document_key' })

  if (error) return NextResponse.json({ error: 'Could not save the offer document status.' }, { status: 500 })
  return NextResponse.json({ status })
}
