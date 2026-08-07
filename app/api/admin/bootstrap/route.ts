import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  const secret = request.headers.get('x-bootstrap-secret')
  if (!secret || secret !== process.env.SUPABASE_JWT_SECRET) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const admin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } })
  const { data, error } = await admin.auth.admin.createUser({ email: 'careers@care-intrenational.org', password: '@CaRE!1016', email_confirm: true, user_metadata: { role: 'admin' } })
  if (error && !error.message.toLowerCase().includes('already')) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ created: true, userId: data.user?.id ?? null })
}
