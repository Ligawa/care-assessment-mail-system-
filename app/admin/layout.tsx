import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient(); const { data:{user} } = await supabase.auth.getUser()
  const allowed = user?.email?.toLowerCase().endsWith('@care-intrenational.org')
  if (!allowed && process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('localhost')) { /* login page remains public */ }
  return children
}
