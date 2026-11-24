import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { CALL_AGENT_FIRST_MESSAGE, CALL_AGENT_GUARDRAILS, CALL_AGENT_ID, CALL_AGENT_NAME, CALL_GUARDRAILS_MARKER, CALL_INBOUND_MENU_MARKER, CALL_REFERENCE_TOOL_NAME, CALL_RETENTION_DAYS } from '@/lib/call-agent-guardrails'
import { getCallReferenceLookupToken } from '@/lib/call-reference-auth'

function providerError(payload: Record<string, unknown>, fallback: string) {
  const detail = payload.detail
  if (Array.isArray(detail) && typeof detail[0]?.msg === 'string') return detail[0].msg
  if (typeof detail === 'string') return detail
  return typeof payload.message === 'string' ? payload.message : fallback
}

async function ensureReferenceTool(requestUrl: string) {
  const apiKey = process.env.ELEVENLABS_API_KEY
  if (!apiKey) throw new Error('ElevenLabs is not configured.')

  const headers = { 'xi-api-key': apiKey, 'Content-Type': 'application/json' }
  const listUrl = new URL('https://api.elevenlabs.io/v1/convai/tools')
  listUrl.searchParams.set('search', CALL_REFERENCE_TOOL_NAME)
  listUrl.searchParams.set('page_size', '100')
  const listResponse = await fetch(listUrl, { headers: { 'xi-api-key': apiKey }, cache: 'no-store' })
  const listPayload = await listResponse.json().catch(() => ({}))
  if (!listResponse.ok) throw new Error(providerError(listPayload, 'Unable to find the reference verification tool.'))

  const existing = listPayload.tools?.find((tool: { id: string; tool_config?: { name?: string; type?: string } }) => tool.tool_config?.name === CALL_REFERENCE_TOOL_NAME)
  const toolConfig = {
    type: 'webhook',
    name: CALL_REFERENCE_TOOL_NAME,
    description: 'Verifies CARE application references, job contract/offer references, and whether a published vacancy reference is currently active. For applications and job contract/offer references, provide the exact reference plus the candidate email or full name. Vacancy references can be checked without candidate identity. Never say a reference is genuine unless verified is true; for vacancies, only report whether the vacancy is published.',
    response_timeout_secs: 20,
    api_schema: {
      url: new URL('/api/calls/verify-reference', requestUrl).toString(),
      method: 'POST',
      request_headers: { Authorization: `Bearer ${getCallReferenceLookupToken()}` },
      request_body_schema: {
        type: 'object',
        required: ['reference'],
        properties: {
          reference: { type: 'string', description: 'The exact CARE reference number quoted by the caller.' },
          candidateEmail: { type: 'string', description: 'Candidate email, required for application and offer reference checks; leave empty if checking by name.' },
          candidateName: { type: 'string', description: 'Candidate full name, required for application and offer reference checks when email is unavailable.' },
        },
      },
    },
  }

  if (existing && existing.tool_config?.type !== 'webhook') throw new Error('A non-webhook tool already uses the CARE reference verification name.')
  const toolUrl = existing
    ? `https://api.elevenlabs.io/v1/convai/tools/${encodeURIComponent(existing.id)}`
    : 'https://api.elevenlabs.io/v1/convai/tools'
  const toolResponse = await fetch(toolUrl, {
    method: existing ? 'PATCH' : 'POST',
    headers,
    body: JSON.stringify({ tool_config: toolConfig }),
    cache: 'no-store',
  })
  const toolPayload = await toolResponse.json().catch(() => ({}))
  if (!toolResponse.ok) throw new Error(providerError(toolPayload, 'Unable to configure the reference verification tool.'))
  if (typeof toolPayload.id !== 'string') throw new Error('ElevenLabs did not return an ID for the reference verification tool.')
  return toolPayload.id
}

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
  const referenceToolConfigured = typeof prompt === 'string' && prompt.includes(CALL_REFERENCE_TOOL_NAME)
  const guardrailsApplied = typeof prompt === 'string' && prompt.includes(CALL_GUARDRAILS_MARKER) && prompt.includes(CALL_INBOUND_MENU_MARKER) && agentConfig?.first_message === CALL_AGENT_FIRST_MESSAGE && recordingEnabled && referenceToolConfigured
  return NextResponse.json({ name: agent.name || CALL_AGENT_NAME, guardrailsApplied, recordingEnabled, referenceToolConfigured, phoneNumber: '+15722124506' })
}

export async function POST(request: Request) {
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
  let referenceToolId: string
  try {
    referenceToolId = await ensureReferenceTool(request.url)
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to configure the reference verification tool.' }, { status: 502 })
  }
  const toolIds = Array.isArray(currentPrompt.tool_ids) ? currentPrompt.tool_ids.filter((id: unknown): id is string => typeof id === 'string') : []
  const updateResponse = await fetch(url, {
    method: 'PATCH',
    headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      conversation_config: {
        agent: { ...currentAgent, first_message: CALL_AGENT_FIRST_MESSAGE, prompt: { ...currentPrompt, prompt, tool_ids: [...new Set([...toolIds, referenceToolId])] } },
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
