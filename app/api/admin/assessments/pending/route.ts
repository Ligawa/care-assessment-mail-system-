import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const schema = z.object({ interviewIds: z.array(z.string().uuid()).min(1).max(300) })

export async function DELETE(request: Request) {
  const session = await createClient()
  const { data: { user } } = await session.auth.getUser()
  if (!user?.email?.toLowerCase().endsWith('@care-intrenational.org')) return NextResponse.json({ error: 'Admin sign-in required.' }, { status: 401 })
  const parsed = schema.safeParse(await request.json().catch(() => ({})))
  if (!parsed.success) return NextResponse.json({ error: 'Choose at least one applicant to remove.' }, { status: 400 })

  const admin = createAdminClient()
  const { data, error } = await admin.from('interview_sessions').update({ assessment_removed_at: new Date().toISOString() }).in('id', parsed.data.interviewIds).is('assessment_removed_at', null).select('id')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ removed: data?.length ?? 0 })
}
