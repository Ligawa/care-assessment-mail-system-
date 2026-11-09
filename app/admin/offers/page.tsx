import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Download, FileText } from 'lucide-react'
import AdminSidebar from '@/components/admin-sidebar'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

type OfferRow = {
  id: string
  full_name: string
  email: string
  offer_status: string
  offer_hr_reference: string | null
  offer_job_title: string | null
  offer_basic_salary: number | null
  offer_sent_at: string | null
  offer_acceptance_deadline: string | null
  offer_error: string | null
}

const dateFormat = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeZone: 'UTC' })
const formatDate = (value: string | null) => (value ? dateFormat.format(new Date(value)) : '—')

export default async function OffersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const { data } = await supabase
    .from('assessment_submissions')
    .select('id,full_name,email,offer_status,offer_hr_reference,offer_job_title,offer_basic_salary,offer_sent_at,offer_acceptance_deadline,offer_error')
    .in('offer_status', ['sent', 'failed', 'generating'])
    .order('offer_sent_at', { ascending: false, nullsFirst: false })
  const offers = (data ?? []) as OfferRow[]
  const sent = offers.filter(offer => offer.offer_status === 'sent').length

  return (
    <div className="min-h-screen bg-[#faf8f2] lg:flex">
      <AdminSidebar />
      <main className="min-w-0 flex-1 p-6 lg:p-12">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#f47700]">CARE International</p>
        <h1 className="mt-3 text-4xl font-semibold text-[#101b30]">Offer letters</h1>
        <p className="mt-3 max-w-2xl text-lg text-[#455c7d]">Every conditional offer issued to candidates. Download the exact PDF a candidate received, or issue new offers from a candidate&apos;s profile.</p>

        <dl className="mt-8 grid max-w-xl gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-[#ded8ca] bg-white p-5"><dt className="text-sm text-[#455c7d]">Offers sent</dt><dd className="mt-1 text-3xl font-semibold text-[#101b30]">{sent}</dd></div>
          <div className="rounded-2xl border border-[#ded8ca] bg-white p-5"><dt className="text-sm text-[#455c7d]">Needs attention</dt><dd className="mt-1 text-3xl font-semibold text-[#101b30]">{offers.length - sent}</dd></div>
        </dl>

        <section className="mt-8 overflow-x-auto rounded-3xl border border-[#ded8ca] bg-white">
          {offers.length === 0 ? (
            <div className="flex flex-col items-center gap-3 p-12 text-center text-[#455c7d]"><FileText className="size-8 text-[#f47700]" /><p>No offers have been issued yet. Open a candidate who completed the skills assessment to issue one.</p></div>
          ) : (
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="border-b border-[#ded8ca] text-[#455c7d]">
                <tr><th className="px-5 py-4 font-semibold">Candidate</th><th className="px-5 py-4 font-semibold">Role</th><th className="px-5 py-4 font-semibold">Reference</th><th className="px-5 py-4 font-semibold">Salary (USD/month)</th><th className="px-5 py-4 font-semibold">Sent</th><th className="px-5 py-4 font-semibold">Accept by</th><th className="px-5 py-4 font-semibold">Status</th><th className="px-5 py-4 font-semibold"><span className="sr-only">Actions</span></th></tr>
              </thead>
              <tbody>
                {offers.map(offer => (
                  <tr key={offer.id} className="border-b border-[#ded8ca] last:border-0">
                    <td className="px-5 py-4"><Link href={`/admin/candidates/${offer.id}`} className="font-semibold text-[#101b30] hover:text-[#f47700]">{offer.full_name}</Link><p className="text-xs text-[#455c7d]">{offer.email}</p></td>
                    <td className="px-5 py-4 text-[#101b30]">{offer.offer_job_title ?? '—'}</td>
                    <td className="px-5 py-4 font-mono text-xs text-[#455c7d]">{offer.offer_hr_reference ?? '—'}</td>
                    <td className="px-5 py-4 text-[#101b30]">{offer.offer_basic_salary ? `USD ${Number(offer.offer_basic_salary).toLocaleString('en-US')}` : '—'}</td>
                    <td className="px-5 py-4 text-[#455c7d]">{formatDate(offer.offer_sent_at)}</td>
                    <td className="px-5 py-4 text-[#455c7d]">{formatDate(offer.offer_acceptance_deadline)}</td>
                    <td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${offer.offer_status === 'sent' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`} title={offer.offer_error ?? undefined}>{offer.offer_status === 'sent' ? 'Sent' : offer.offer_status === 'failed' ? 'Failed' : 'Generating'}</span></td>
                    <td className="px-5 py-4 text-right">{offer.offer_hr_reference && <a href={`/api/admin/candidates/${offer.id}/offer-pdf`} className="inline-flex items-center gap-2 rounded-xl border border-[#ded8ca] px-3 py-2 font-semibold text-[#101b30] transition hover:border-[#f47700] hover:text-[#f47700]"><Download className="size-4" />PDF</a>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </main>
    </div>
  )
}
