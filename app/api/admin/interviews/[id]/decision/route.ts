import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const form = await request.formData()
  const decision = form.get('decision')
  if (decision !== 'passed' && decision !== 'failed') return Response.json({ error: 'Invalid decision' }, { status: 400 })
  const { error } = await supabase.from('interview_sessions').update({ decision_status: decision, decision_at: new Date().toISOString() }).eq('id', id)
  if (error) return Response.json({ error: error.message }, { status: 500 })
  redirect(`/admin/interviews/${id}`)
}
