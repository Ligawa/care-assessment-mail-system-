import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function staffSignedIn() {
  const session = await createClient()
  const { data: { user } } = await session.auth.getUser()
  const email = user?.email?.toLowerCase() ?? ''
  return email.endsWith('@care-intrenational.org') || email.endsWith('@care-international.org')
}

export async function GET(_request: Request, { params }: { params: Promise<{ conversationId: string }> }) {
  if (!(await staffSignedIn())) return NextResponse.json({ error: 'Staff sign-in required.' }, { status: 401 })
  const { conversationId } = await params
  const admin = createAdminClient()
  const { data: call, error } = await admin.from('interview_phone_calls').select('*').eq('conversation_id', conversationId).maybeSingle()
  if (error) return NextResponse.json({ error: 'Unable to load this call record.' }, { status: 500 })
  if (!call) return NextResponse.json({ error: 'Call not found.' }, { status: 404 })
  if (!process.env.ELEVENLABS_API_KEY) return NextResponse.json({ call })

  const response = await fetch(`https://api.elevenlabs.io/v1/convai/conversations/${encodeURIComponent(conversationId)}`, { headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY }, cache: 'no-store' })
  const detail = await response.json().catch(() => ({}))
  if (!response.ok) return NextResponse.json({ error: detail.detail?.[0]?.msg || detail.detail || 'Unable to retrieve the transcript.' }, { status: 502 })

  const startedAt = Number(detail.metadata?.start_time_unix_secs)
  const patch = {
    status: ['initiated', 'in-progress', 'processing', 'done', 'failed'].includes(detail.status) ? detail.status : call.status,
    transcript: Array.isArray(detail.transcript) ? detail.transcript : [],
    summary: detail.analysis?.transcript_summary || call.summary,
    outcome: detail.analysis?.call_successful || call.outcome,
    duration_seconds: Number.isFinite(Number(detail.metadata?.call_duration_secs)) ? Number(detail.metadata.call_duration_secs) : call.duration_seconds,
    started_at: Number.isFinite(startedAt) ? new Date(startedAt * 1000).toISOString() : call.started_at,
    ended_at: Number.isFinite(startedAt) && Number.isFinite(Number(detail.metadata?.call_duration_secs)) ? new Date((startedAt + Number(detail.metadata.call_duration_secs)) * 1000).toISOString() : call.ended_at,
    direction: detail.metadata?.phone_call?.direction === 'outbound' ? 'outbound' : call.direction,
    phone_number: detail.metadata?.phone_call?.external_number || call.phone_number,
    updated_at: new Date().toISOString(),
  }
  const { data: updated, error: updateError } = await admin.from('interview_phone_calls').update(patch).eq('id', call.id).select('*').single()
  if (updateError) return NextResponse.json({ error: 'Unable to save the refreshed call details.' }, { status: 500 })
  return NextResponse.json({ call: updated })
}
