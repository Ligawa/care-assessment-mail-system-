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
  const { data: submissions } = await supabase.from('assessment_submissions').select('id,reference_number,full_name,email,submitted_at,assessment_id').order('created_at', { ascending:false }).limit(100)
  const { data: campaigns } = await supabase.from('email_campaigns').select('id,subject,html_body,text_body,recipients,recipient_count,sent_count,failed_count,status,error_details,created_at').order('created_at', { ascending:false }).limit(20)
  return <AdminDashboard departments={departments ?? []} positions={positions ?? []} assessments={assessments ?? []} submissions={submissions ?? []} campaigns={campaigns ?? []} email={user.email} />
}
