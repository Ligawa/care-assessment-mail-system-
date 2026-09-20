import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const schema = z.object({ role: z.string().trim().min(2).max(160) })

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 })
  const parsed = schema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: 'Enter a valid role.' }, { status: 400 })
  const accessCode = `INT-${crypto.randomUUID().slice(0, 10).toUpperCase()}`
  const { error } = await supabase.from('interview_sessions').insert({ access_code: accessCode, candidate_name: null, candidate_email: null, role: parsed.data.role, status: 'invited', decision_status: 'pending', transcript: [], assessment: null, completed_at: null })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const origin = request.headers.get('origin') || new URL(request.url).origin
  return NextResponse.json({ url: `${origin}/interview/${accessCode}` })
}
