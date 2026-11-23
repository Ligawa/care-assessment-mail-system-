import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { CALL_AGENT_FIRST_MESSAGE, CALL_AGENT_GUARDRAILS, CALL_AGENT_ID, CALL_AGENT_NAME, CALL_GUARDRAILS_MARKER, CALL_RETENTION_DAYS } from '@/lib/call-agent-guardrails'

async function staffSignedIn() {
  const session = await createClient()
  const { data: { user } } = await session.auth.getUser()
  const email = user?.email?.toLowerCase() ?? ''
  return email.endsWith('@care-intrenational.org') || email.endsWith('@care-international.org')
}

export async function GET() {
  if (!(await staffSignedIn())) return NextResponse.json({ error: 'Staff sign-in required.' }, { status: 401 })
  if (!process.env.ELEVENLABS_API_KEY) return NextResponse.json({ error: 'ElevenLabs is not configured.' }, { status: 503 })
  const response = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${CALL_AGENT_ID}`, { headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY }, cache: 'no-store' })
  const agent = await response.json().catch(() => ({}))
  if (!response.ok) return NextResponse.json({ error: 'Unable to check the ElevenLabs agent.' }, { status: 502 })
  const agentConfig = agent.conversation_config?.agent
  const prompt = agentConfig?.prompt?.prompt
  const recordingEnabled = agent.platform_settings?.privacy?.record_voice === true
  const guardrailsApplied = typeof prompt === 'string' && prompt.includes(CALL_GUARDRAILS_MARKER) && agentConfig?.first_message === CALL_AGENT_FIRST_MESSAGE && recordingEnabled
  return NextResponse.json({ name: agent.name || CALL_AGENT_NAME, guardrailsApplied, recordingEnabled, phoneNumber: '+15722124506' })
}

export async function POST() {
  if (!(await staffSignedIn())) return NextResponse.json({ error: 'Staff sign-in required.' }, { status: 401 })
  if (!process.env.ELEVENLABS_API_KEY) return NextResponse.json({ error: 'ElevenLabs is not configured.' }, { status: 503 })
  const url = `https://api.elevenlabs.io/v1/convai/agents/${CALL_AGENT_ID}`
  const currentResponse = await fetch(url, { headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY }, cache: 'no-store' })
  const current = await currentResponse.json().catch(() => ({}))
  const currentPrompt = current.conversation_config?.agent?.prompt
  if (!currentResponse.ok || !currentPrompt || typeof currentPrompt.prompt !== 'string') return NextResponse.json({ error: 'The agent prompt could not be read safely.' }, { status: 502 })
  const currentAgent = current.conversation_config?.agent
  const markerIndex = currentPrompt.prompt.indexOf(CALL_GUARDRAILS_MARKER)
  const basePrompt = markerIndex === -1 ? currentPrompt.prompt.trim() : currentPrompt.prompt.slice(0, markerIndex).trimEnd()
  const prompt = `${basePrompt}\n\n${CALL_AGENT_GUARDRAILS}`
  const privacy = current.platform_settings?.privacy ?? {}
  const updateResponse = await fetch(url, {
    method: 'PATCH',
    headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      conversation_config: {
        agent: { ...currentAgent, first_message: CALL_AGENT_FIRST_MESSAGE, prompt: { ...currentPrompt, prompt } },
      },
      platform_settings: {
        ...current.platform_settings,
        privacy: { ...privacy, record_voice: true, retention_days: CALL_RETENTION_DAYS, apply_to_existing_conversations: true },
      },
    }),
    cache: 'no-store',
  })
  if (!updateResponse.ok) {
    const error = await updateResponse.json().catch(() => ({}))
    return NextResponse.json({ error: error.detail?.[0]?.msg || error.detail || 'Unable to update the ElevenLabs agent and retention policy.' }, { status: 502 })
  }
  return NextResponse.json({ guardrailsApplied: true, recordingEnabled: true, retentionDays: CALL_RETENTION_DAYS, message: `AI interview guardrails are active, call recording is enabled, and call retention is set to ${CALL_RETENTION_DAYS} days.` })
}
