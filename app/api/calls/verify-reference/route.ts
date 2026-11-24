import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { hasValidCallReferenceAuthorization } from '@/lib/call-reference-auth'

const requestSchema = z.object({
  reference: z.string().trim().min(5).max(64),
  candidateEmail: z.union([z.string().trim().email().max(254), z.literal('')]).optional(),
  candidateName: z.union([z.string().trim().min(2).max(160), z.literal('')]).optional(),
})

type IdentityRecord = { email: string | null; full_name: string | null }

function matchesIdentity(record: IdentityRecord, email?: string, name?: string) {
  const normalize = (value: string) => value.trim().replace(/\s+/g, ' ').toLowerCase()
  const emailMatches = Boolean(email && record.email?.trim().toLowerCase() === email.trim().toLowerCase())
  const nameMatches = Boolean(name && record.full_name && normalize(record.full_name) === normalize(name))
  return emailMatches || nameMatches
}

function notVerified() {
  return NextResponse.json({ verified: false, recordType: 'unknown', status: 'not_verified' })
}

export async function POST(request: Request) {
  try {
    if (!hasValidCallReferenceAuthorization(request.headers.get('authorization'))) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
    }
  } catch {
    return NextResponse.json({ error: 'Reference verification is not configured.' }, { status: 503 })
  }

  const parsed = requestSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Provide a reference number and the candidate email or full name.' }, { status: 400 })

  const reference = parsed.data.reference.replace(/\s+/g, '').toUpperCase()
  const isJobReference = /^CARE-[A-F0-9]{8}$/.test(reference)
  const isCandidateReference = /^CARE-\d{4}-[A-F0-9]{8}$/.test(reference)
  if (!isJobReference && !isCandidateReference) return notVerified()

  const admin = createAdminClient()
  if (isJobReference) {
    const { data: assessment, error } = await admin.from('assessment_roles').select('status').eq('access_code', reference).maybeSingle()
    if (error) return NextResponse.json({ error: 'Unable to verify this reference right now.' }, { status: 500 })
    return assessment?.status === 'published'
      ? NextResponse.json({ verified: true, recordType: 'job', status: 'published' })
      : notVerified()
  }

  const { data: offer, error: offerError } = await admin.from('assessment_submissions')
    .select('full_name,email,offer_status,offer_response_status')
    .eq('offer_hr_reference', reference)
    .maybeSingle()
  if (offerError) return NextResponse.json({ error: 'Unable to verify this reference right now.' }, { status: 500 })
  if (offer) {
    if (!matchesIdentity(offer, parsed.data.candidateEmail, parsed.data.candidateName) || offer.offer_status !== 'sent') return notVerified()
    const status = offer.offer_response_status === 'withdrawn'
      ? 'withdrawn'
      : offer.offer_response_status === 'declined'
        ? 'declined'
        : offer.offer_response_status === 'signed_received'
          ? 'signed'
          : 'issued'
    return NextResponse.json({ verified: true, recordType: 'offer', status })
  }

  const { data: application, error: applicationError } = await admin.from('assessment_submissions')
    .select('full_name,email')
    .eq('reference_number', reference)
    .maybeSingle()
  if (applicationError) return NextResponse.json({ error: 'Unable to verify this reference right now.' }, { status: 500 })
  if (!application || !matchesIdentity(application, parsed.data.candidateEmail, parsed.data.candidateName)) return notVerified()
  return NextResponse.json({ verified: true, recordType: 'application', status: 'received' })
}
