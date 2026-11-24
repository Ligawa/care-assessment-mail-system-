import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getStaleInterviewInviteCutoff } from '@/lib/interview-invite-cleanup'

async function getStaff() {
  const session = await createClient()
  const { data: { user } } = await session.auth.getUser()
  const email = user?.email?.toLowerCase() ?? ''
  return email.endsWith('@care-intrenational.org') || email.endsWith('@care-international.org')
}

export async function POST() {
  if (!(await getStaff())) return NextResponse.json({ error: 'Staff sign-in required.' }, { status: 401 })

  const cutoff = getStaleInterviewInviteCutoff()
  const admin = createAdminClient()
  const { data: deleted, error } = await admin.from('interview_sessions')
    .delete()
    .eq('status', 'invited')
    .is('started_at', null)
    .is('completed_at', null)
    .lt('created_at', cutoff)
    .select('id')

  if (error) return NextResponse.json({ error: 'Unable to delete old interview invites.' }, { status: 500 })
  return NextResponse.json({ deletedCount: deleted?.length ?? 0 })
}
