import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AdminDashboard from '@/components/admin-dashboard'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email?.toLowerCase().endsWith('@care-intrenational.org')) redirect('/admin/login')
  const { data: departments } = await supabase.from('departments').select('*').order('name', { ascending: true })
  const { data: positions } = await supabase.from('positions').select('*').order('created_at', { ascending:false })
  const { data: assessments } = await supabase.from('assessment_roles').select('*').order('created_at', { ascending:false })
  const { data: submissions, error: submissionsError } = await supabase.from('assessment_submissions').select('id,reference_number,full_name,email,submitted_at,assessment_id,answers,decision_status,decision_at,notification_status,notification_error').order('created_at', { ascending:false }).limit(100)
  if (submissionsError) console.error('[v0] Candidate query failed:', submissionsError.message)
  const [{ data: campaigns }, { data: templates }] = await Promise.all([
    supabase.from('email_campaigns').select('id,subject,html_body,text_body,recipients,recipient_count,sent_count,failed_count,status,error_details,created_at').order('created_at', { ascending:false }).limit(20),
    supabase.from('email_templates').select('id,slug,name,subject,html').order('name')
  ])
  const savedTemplates = templates?.length ? templates : [{ id: 'document-request-default', slug: 'document-request', name: 'Applicant document request', subject: 'Request for supporting documents', html: '<p>Dear {{applicant_name}},</p><p>Please use the secure link below to upload the supporting documents requested for your application.</p><p><a href="{{portal_url}}">Upload documents securely</a></p><p>Kind regards,<br>CARE International Recruitment Team</p>' }]
  return <AdminDashboard departments={departments ?? []} positions={positions ?? []} assessments={assessments ?? []} submissions={submissions ?? []} campaigns={campaigns ?? []} templates={savedTemplates} email={user.email} />
}
