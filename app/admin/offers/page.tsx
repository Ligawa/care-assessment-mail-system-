import { redirect } from 'next/navigation'
import AdminSidebar from '@/components/admin-sidebar'
import OfferApplicantDirectory from '@/components/offer-applicant-directory'
import OfferDocumentTracker from '@/components/offer-document-tracker'
import { OFFER_DOCUMENT_CHECKLIST } from '@/lib/offer-document-checklist'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

type OfferRow = {
  id: string
  full_name: string
  email: string
  offer_status: string
  offer_response_status: 'awaiting_response' | 'signed_received' | 'declined' | 'withdrawn'
  offer_hr_reference: string | null
  offer_job_title: string | null
  offer_basic_salary: number | null
  offer_sent_at: string | null
  offer_acceptance_deadline: string | null
  offer_document_deadline: string | null
  offer_error: string | null
}

const dateFormat = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeZone: 'UTC' })
const formatDate = (value: string | null) => (value ? dateFormat.format(new Date(value)) : '—')

export default async function OffersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email?.toLowerCase().endsWith('@care-intrenational.org')) redirect('/admin/login')

  const { data } = await supabase
    .from('assessment_submissions')
    .select('id,full_name,email,offer_status,offer_response_status,offer_hr_reference,offer_job_title,offer_basic_salary,offer_sent_at,offer_acceptance_deadline,offer_document_deadline,offer_error')
    .in('offer_status', ['sent', 'failed', 'generating'])
    .order('offer_sent_at', { ascending: false, nullsFirst: false })
  const offers = (data ?? []) as OfferRow[]
  const sentOffers = offers.filter(offer => offer.offer_status === 'sent')
  const sent = sentOffers.length
  const adminSupabase = createAdminClient()
  const checklistRows = sentOffers.flatMap(offer => OFFER_DOCUMENT_CHECKLIST.map(document => ({
    submission_id: offer.id,
    document_key: document.key,
    document_label: document.label,
  })))
  if (checklistRows.length) {
    await adminSupabase.from('offer_document_submissions').upsert(checklistRows, { onConflict: 'submission_id,document_key', ignoreDuplicates: true })
  }
  const { data: documentRows } = sentOffers.length
    ? await adminSupabase.from('offer_document_submissions').select('submission_id,document_key,document_label,status,reminder_count,last_reminder_at').in('submission_id', sentOffers.map(offer => offer.id))
    : { data: [] as { submission_id: string; document_key: string; document_label: string; status: string; reminder_count: number; last_reminder_at: string | null }[] }
  const offerDocumentCandidates = sentOffers.map(offer => {
    const candidateDocs = (documentRows ?? []).filter(row => row.submission_id === offer.id)
    const reminderCount = candidateDocs.reduce((maximum, row) => Math.max(maximum, row.reminder_count ?? 0), 0)
    return {
      id: offer.id,
      name: offer.full_name,
      email: offer.email,
      role: offer.offer_job_title,
      reference: offer.offer_hr_reference,
      deadline: offer.offer_document_deadline ? formatDate(offer.offer_document_deadline) : null,
      responseStatus: offer.offer_response_status,
      reminderCount,
    }
  })

  const { data: completedInvites } = await supabase.from('assessment_invites').select('submission_id').eq('status', 'completed').not('submission_id', 'is', null)
  const activeOfferIds = new Set(offers.filter(offer => offer.offer_status === 'sent' || offer.offer_status === 'generating').map(offer => offer.id))
  const eligibleIds = [...new Set((completedInvites ?? []).map(invite => invite.submission_id as string))].filter(id => !activeOfferIds.has(id))
  const { data: eligibleData } = eligibleIds.length
    ? await supabase.from('assessment_submissions').select('id,full_name,email,created_at,offer_status').in('id', eligibleIds).eq('decision_status', 'passed').order('created_at', { ascending: false })
    : { data: [] as { id: string; full_name: string; email: string; created_at: string; offer_status: string | null }[] }
  const eligible = eligibleData ?? []
  const directoryOfferIds = new Set(offers.map(offer => offer.id))
  const directoryApplicants = [
    ...offers.map(offer => ({
      id: offer.id,
      fullName: offer.full_name,
      email: offer.email,
      jobTitle: offer.offer_job_title,
      reference: offer.offer_hr_reference,
      salary: offer.offer_basic_salary ? `USD ${Number(offer.offer_basic_salary).toLocaleString('en-US')}` : '—',
      sentAt: formatDate(offer.offer_sent_at),
      acceptanceDeadline: formatDate(offer.offer_acceptance_deadline),
      status: offer.offer_status === 'sent' ? 'sent' as const : offer.offer_status === 'failed' ? 'failed' as const : 'generating' as const,
    })),
    ...eligible.filter(candidate => !directoryOfferIds.has(candidate.id)).map(candidate => ({
      id: candidate.id,
      fullName: candidate.full_name,
      email: candidate.email,
      jobTitle: null,
      reference: null,
      salary: '—',
      sentAt: '—',
      acceptanceDeadline: '—',
      status: 'ready' as const,
    })),
  ]

  return (
    <div className="min-h-screen bg-[#faf8f2] lg:flex">
      <AdminSidebar />
      <main className="min-w-0 flex-1 p-6 lg:p-12">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#f47700]">CARE International</p>
        <h1 className="mt-3 text-4xl font-semibold text-[#101b30]">Offer letters</h1>
        <p className="mt-3 max-w-2xl text-lg text-[#455c7d]">Track conditional offers and post-offer documents. Offers are issued only to candidates who completed and passed their assessment; initial application document requests are tracked separately.</p>

        <dl className="mt-8 grid max-w-xl gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-[#ded8ca] bg-white p-5"><dt className="text-sm text-[#455c7d]">Offers sent</dt><dd className="mt-1 text-3xl font-semibold text-[#101b30]">{sent}</dd></div>
          <div className="rounded-2xl border border-[#ded8ca] bg-white p-5"><dt className="text-sm text-[#455c7d]">Needs attention</dt><dd className="mt-1 text-3xl font-semibold text-[#101b30]">{offers.length - sent}</dd></div>
        </dl>

        <OfferDocumentTracker candidates={offerDocumentCandidates} documents={(documentRows ?? []) as { submission_id: string; document_key: string; document_label: string; status: 'pending' | 'received' | 'not_applicable'; reminder_count: number; last_reminder_at: string | null }[]} />

        <OfferApplicantDirectory applicants={directoryApplicants} />

      </main>
    </div>
  )
}
