import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AdminDashboard from '@/components/admin-dashboard'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email?.toLowerCase().endsWith('@care-intrenational.org')) redirect('/admin/login')
  const { data: assessments } = await supabase.from('assessment_roles').select('*').order('created_at', { ascending:false })
  const { data: submissions } = await supabase.from('assessment_submissions').select('id,reference_number,full_name,email,submitted_at,assessment_id').order('created_at', { ascending:false }).limit(100)
  return <AdminDashboard assessments={assessments ?? []} submissions={submissions ?? []} email={user.email} />
}
