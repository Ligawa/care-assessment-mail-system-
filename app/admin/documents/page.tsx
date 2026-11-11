import DocumentPortalManager from '@/components/document-portal-manager'
import DocumentSubmissionsList, { type PortalRow } from '@/components/document-submissions-list'
import AdminSidebar from '@/components/admin-sidebar'
import InterviewInvitePanel from '@/components/interview-invite-panel'
import ReminderPanel from '@/components/reminder-panel'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export default async function DocumentsAdminPage() {
  const sessionClient = await createClient()
  const { data: { user } } = await sessionClient.auth.getUser()
  if (!user?.email?.toLowerCase().endsWith('@care-intrenational.org')) redirect('/admin/login')
  const supabase = createAdminClient()
  const { data: portals, error: portalsError } = await supabase.from('applicant_document_portals').select('id,applicant_name,applicant_email,role,application_reference,status,deadline_at,submitted_at,last_reminder_at,reminder_count,updated_at,applicant_documents(id,document_type,original_filename,status,pathname)').order('submitted_at', { ascending: false, nullsFirst: false }).order('updated_at', { ascending: false })
  if (portalsError) console.error('[v0] Document portal query failed:', portalsError.message)
  const { data: interviewRows } = await supabase.from('interview_sessions').select('id,candidate_name,candidate_email,role,status,deadline_at,completed_at,last_reminder_at,reminder_count')
  const invitedEmails = new Set((interviewRows || []).map(row => row.candidate_email?.toLowerCase()))
  const formatDate = (value?: string | null) => value ? new Date(value).toLocaleDateString('en-GB') : null
  const dueLabel = (value?: string | null) => value ? `Due ${new Date(`${value}T00:00:00`).toLocaleDateString('en-GB')}` : 'Due next day'
  const documentReminders = (portals || []).filter(portal => portal.status !== 'documents_received').map(portal => ({ id: portal.id, name: portal.applicant_name, email: portal.applicant_email, role: portal.role || 'Accounts Payable Clerk', detail: `${portal.status.replaceAll('_', ' ')} · ${dueLabel(portal.deadline_at)}`, lastReminder: formatDate(portal.last_reminder_at), reminders: portal.reminder_count || 0 }))
  const interviewReminders = (interviewRows || []).filter(row => !row.completed_at && row.candidate_email).map(row => ({ id: row.id, name: row.candidate_name, email: row.candidate_email, role: row.role || 'Accounts Payable Clerk', detail: `${row.status} · ${dueLabel(row.deadline_at)}`, lastReminder: formatDate(row.last_reminder_at), reminders: row.reminder_count || 0 }))
  const allPortals = portals || []
  const portalRows: PortalRow[] = allPortals.map(portal => ({ id: portal.id, applicant_name: portal.applicant_name, applicant_email: portal.applicant_email, role: portal.role, application_reference: portal.application_reference, status: portal.status, deadline_at: portal.deadline_at, submitted_at: portal.submitted_at, last_reminder_at: portal.last_reminder_at, updated_at: portal.updated_at, interviewInvited: invitedEmails.has(portal.applicant_email.toLowerCase()), documents: (portal.applicant_documents || []).map(document => ({ id: document.id, document_type: document.document_type, original_filename: document.original_filename, status: document.status, pathname: document.pathname })) }))
  const isSubmitted = (status: string) => status === 'documents_received' || status === 'partially_received'
  const candidates = allPortals.filter(portal => isSubmitted(portal.status) && portal.applicant_documents?.length && !invitedEmails.has(portal.applicant_email.toLowerCase())).map(portal => ({ id: portal.id, name: portal.applicant_name, email: portal.applicant_email, role: portal.role || 'Accounts Payable Clerk', status: portal.status }))
  const counts = { requested: allPortals.length, partial: allPortals.filter(portal => portal.status === 'partially_received').length, received: allPortals.filter(portal => portal.status === 'documents_received').length, interviewed: allPortals.filter(portal => invitedEmails.has(portal.applicant_email.toLowerCase())).length }
  return <div className="min-h-screen bg-[#f7f8f6] lg:flex"><AdminSidebar /><main className="flex-1 p-6"><div className="mx-auto max-w-6xl"><header><p className="text-sm font-bold uppercase tracking-[0.18em] text-[#f47700]">Hiring operations</p><h1 className="mt-2 text-4xl font-semibold text-[#101b30]">Applicant documents</h1><p className="mt-2 text-[#455c7d]">Request, review, and track documents by applicant and application status.</p></header><div className="mt-8"><DocumentPortalManager /></div><InterviewInvitePanel candidates={candidates} counts={counts} /><ReminderPanel documents={documentReminders} interviews={interviewReminders} /><DocumentSubmissionsList portals={portalRows} /></div></main></div>
}
