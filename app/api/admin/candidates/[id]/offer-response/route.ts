import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

const responseStatuses = new Set(['awaiting_response', 'signed_received', 'declined', 'withdrawn'])

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email?.toLowerCase().endsWith('@care-intrenational.org')) {
    return NextResponse.json({ error: 'Your admin session is not authorized to update offer status.' }, { status: 401 })
  }

  let body: { status?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }
  if (typeof body.status !== 'string' || !responseStatuses.has(body.status)) {
    return NextResponse.json({ error: 'Choose a valid offer response status.' }, { status: 400 })
  }

  const { id } = await params
  const admin = createAdminClient()
  const { data: candidate, error: candidateError } = await admin
    .from('assessment_submissions')
    .select('id,offer_status')
    .eq('id', id)
    .eq('offer_status', 'sent')
    .maybeSingle()
  if (candidateError) return NextResponse.json({ error: 'Could not verify the offer.' }, { status: 500 })
  if (!candidate) return NextResponse.json({ error: 'Candidate offer not found.' }, { status: 404 })

  const { error: updateError } = await admin
    .from('assessment_submissions')
    .update({ offer_response_status: body.status })
    .eq('id', id)
    .eq('offer_status', 'sent')
  if (updateError) return NextResponse.json({ error: 'Could not save the offer response status.' }, { status: 500 })

  if (body.status === 'signed_received' || body.status === 'awaiting_response') {
    const document = { submission_id: id, document_key: 'signed_offer_letter', document_label: 'Signed offer letter', status: body.status === 'signed_received' ? 'received' : 'pending', updated_at: new Date().toISOString(), updated_by: user.email }
    const { error: checklistError } = await admin.from('offer_document_submissions').upsert(document, { onConflict: 'submission_id,document_key' })
    if (checklistError) return NextResponse.json({ error: 'Offer status saved, but the signed-letter checklist could not be synchronized.' }, { status: 500 })
  }

  return NextResponse.json({ status: body.status })
}
