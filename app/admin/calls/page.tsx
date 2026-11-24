import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { CALL_AGENT_FIRST_MESSAGE, CALL_AGENT_ID, CALL_GUARDRAILS_MARKER, CALL_REFERENCE_TOOL_NAME } from '@/lib/call-agent-guardrails'
import CallCenter from '@/components/call-center'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Call centre | CARE International', description: 'Manage AI-assisted inbound and outbound recruitment calls and review transcripts.' }

export default async function CallCenterPage() {
  const session = await createClient()
  const { data: { user } } = await session.auth.getUser()
  const email = user?.email?.toLowerCase() ?? ''
  if (!email.endsWith('@care-intrenational.org') && !email.endsWith('@care-international.org')) redirect('/admin/login')

  const admin = createAdminClient()
  const [{ data: calls }, { data: candidates }] = await Promise.all([
    admin.from('interview_phone_calls').select('id,conversation_id,interview_session_id,direction,status,candidate_name,candidate_email,phone_number,role,transcript,summary,outcome,duration_seconds,started_at,ended_at,created_at,error_message').order('started_at', { ascending: false, nullsFirst: false }).order('created_at', { ascending: false }).limit(100),
    admin.from('interview_sessions').select('id,candidate_name,candidate_email,role,status,created_at').not('candidate_email', 'is', null).order('created_at', { ascending: false }).limit(300),
  ])

  let providerConfigured = Boolean(process.env.ELEVENLABS_API_KEY)
  let guardrailsApplied = false
  let retentionDays: number | null = null
  let recordingEnabled = false
  if (providerConfigured) {
    try {
      const response = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${CALL_AGENT_ID}`, { headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY! }, cache: 'no-store' })
      const agent = await response.json()
      const agentConfig = agent.conversation_config?.agent
      const prompt = agentConfig?.prompt?.prompt
      providerConfigured = response.ok
      recordingEnabled = agent.platform_settings?.privacy?.record_voice === true
      guardrailsApplied = response.ok && typeof prompt === 'string' && prompt.includes(CALL_GUARDRAILS_MARKER) && prompt.includes(CALL_REFERENCE_TOOL_NAME) && agentConfig?.first_message === CALL_AGENT_FIRST_MESSAGE && recordingEnabled
      const configuredRetention = agent.platform_settings?.privacy?.retention_days
      retentionDays = typeof configuredRetention === 'number' ? configuredRetention : null
    } catch {
      providerConfigured = false
    }
  }

  return <CallCenter initialCalls={calls ?? []} candidates={candidates ?? []} initialGuardrailsApplied={guardrailsApplied} providerConfigured={providerConfigured} retentionDays={retentionDays} recordingEnabled={recordingEnabled} />
}
