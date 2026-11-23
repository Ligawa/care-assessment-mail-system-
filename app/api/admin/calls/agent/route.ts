import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { CALL_AGENT_FIRST_MESSAGE, CALL_AGENT_GUARDRAILS, CALL_AGENT_ID, CALL_AGENT_NAME, CALL_GUARDRAILS_MARKER } from '@/lib/call-agent-guardrails'

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
  const guardrailsApplied = typeof prompt === 'string' && prompt.includes(CALL_GUARDRAILS_MARKER) && agentConfig?.first_message === CALL_AGENT_FIRST_MESSAGE
  return NextResponse.json({ name: agent.name || CALL_AGENT_NAME, guardrailsApplied, phoneNumber: '+15722124506' })
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
  const prompt = currentPrompt.prompt.includes(CALL_GUARDRAILS_MARKER) ? currentPrompt.prompt : `${currentPrompt.prompt.trim()}\n\n${CALL_AGENT_GUARDRAILS}`
  if (prompt !== currentPrompt.prompt || currentAgent.first_message !== CALL_AGENT_FIRST_MESSAGE) {
    const updateResponse = await fetch(url, {
      method: 'PATCH',
      headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversation_config: {
          agent: { ...currentAgent, first_message: CALL_AGENT_FIRST_MESSAGE, prompt: { ...currentPrompt, prompt } },
        },
      }),
      cache: 'no-store',
    })
    if (!updateResponse.ok) {
      const error = await updateResponse.json().catch(() => ({}))
      return NextResponse.json({ error: error.detail?.[0]?.msg || error.detail || 'Unable to update the ElevenLabs agent.' }, { status: 502 })
    }
  }
  return NextResponse.json({ guardrailsApplied: true, message: 'AI interview guardrails are active.' })
}
