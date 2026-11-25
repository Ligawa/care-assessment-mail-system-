import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { CALL_AGENT_FIRST_MESSAGE, CALL_AGENT_ID, CALL_BACKGROUND_VOICE_DETECTION, CALL_GUARDRAILS_MARKER, CALL_GUARDRAILS_VERSION_MARKER, CALL_PHONE_NUMBER_ID, CALL_REFERENCE_TOOL_NAME, CALL_TURN_EAGERNESS } from '@/lib/call-agent-guardrails'
import { getElevenLabsErrorMessage } from '@/lib/elevenlabs-error'

const outboundCallSchema = z.object({
  phoneNumber: z.string().trim().regex(/^\+[1-9]\d{7,14}$/, 'Enter a valid international phone number, including country code.'),
  callReason: z.string().trim().min(5, 'Enter the reason for this call.').max(500, 'Keep the reason for the call under 500 characters.'),
  consentConfirmed: z.literal(true, { error: 'Confirm that the candidate agreed to an AI-led, recorded call.' }),
  candidateName: z.string().trim().max(160).optional().default(''),
  candidateEmail: z.union([z.string().trim().email().max(254), z.literal('')]).optional().default(''),
  role: z.string().trim().max(180).optional().default(''),
  interviewSessionId: z.union([z.string().uuid(), z.literal('')]).optional().default(''),
})

async function getStaff() {
  const session = await createClient()
  const { data: { user } } = await session.auth.getUser()
  const email = user?.email?.toLowerCase() ?? ''
  const isStaff = email.endsWith('@care-intrenational.org') || email.endsWith('@care-international.org')
  return isStaff ? user : null
}

export async function GET() {
  if (!(await getStaff())) return NextResponse.json({ error: 'Staff sign-in required.' }, { status: 401 })

  const admin = createAdminClient()
  let providerError: string | null = null
  if (process.env.ELEVENLABS_API_KEY) {
    try {
      const url = new URL('https://api.elevenlabs.io/v1/convai/conversations')
      url.searchParams.set('agent_id', CALL_AGENT_ID)
      url.searchParams.set('page_size', '50')
      url.searchParams.set('summary_mode', 'include')
      const response = await fetch(url, { headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY }, cache: 'no-store' })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(getElevenLabsErrorMessage(payload, 'Unable to sync call history from ElevenLabs.'))
      const rows = (payload.conversations ?? []).map((call: Record<string, unknown>) => {
        const start = Number(call.start_time_unix_secs)
        return {
          conversation_id: call.conversation_id,
          direction: call.direction === 'outbound' ? 'outbound' : 'inbound',
          status: ['initiated', 'in-progress', 'processing', 'done', 'failed'].includes(String(call.status)) ? call.status : 'done',
          summary: typeof call.transcript_summary === 'string' ? call.transcript_summary : null,
          duration_seconds: Number.isFinite(Number(call.call_duration_secs)) ? Number(call.call_duration_secs) : null,
          started_at: Number.isFinite(start) ? new Date(start * 1000).toISOString() : null,
          outcome: typeof call.call_successful === 'string' ? call.call_successful : null,
        }
      }).filter((call: { conversation_id?: unknown }) => typeof call.conversation_id === 'string')
      if (rows.length) {
        const { error } = await admin.from('interview_phone_calls').upsert(rows, { onConflict: 'conversation_id', ignoreDuplicates: false })
        if (error) throw new Error(error.message)
      }
    } catch (error) {
      providerError = error instanceof Error ? error.message : 'Unable to sync call history.'
    }
  } else {
    providerError = 'ElevenLabs is not configured.'
  }

  const { data: calls, error } = await admin.from('interview_phone_calls').select('id,conversation_id,interview_session_id,direction,status,candidate_name,candidate_email,phone_number,role,transcript,summary,outcome,duration_seconds,started_at,ended_at,created_at,error_message').order('started_at', { ascending: false, nullsFirst: false }).order('created_at', { ascending: false }).limit(100)
  if (error) return NextResponse.json({ error: 'Unable to load call records.' }, { status: 500 })
  return NextResponse.json({ calls: calls ?? [], providerError })
}

export async function POST(request: Request) {
  const user = await getStaff()
  if (!user) return NextResponse.json({ error: 'Staff sign-in required.' }, { status: 401 })
  const parsed = outboundCallSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Check the call details.' }, { status: 400 })
  if (!process.env.ELEVENLABS_API_KEY) return NextResponse.json({ error: 'ElevenLabs is not configured.' }, { status: 503 })

  const agentResponse = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${CALL_AGENT_ID}`, { headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY }, cache: 'no-store' })
  const agent = await agentResponse.json()
  const agentConfig = agent.conversation_config?.agent
  const prompt = agentConfig?.prompt?.prompt
  const patientTurnTakingEnabled = agent.conversation_config?.turn?.turn_eagerness === CALL_TURN_EAGERNESS
  const backgroundVoiceDetectionEnabled = agent.conversation_config?.vad?.background_voice_detection === CALL_BACKGROUND_VOICE_DETECTION
  if (!agentResponse.ok || typeof prompt !== 'string' || !prompt.includes(CALL_GUARDRAILS_MARKER) || !prompt.includes(CALL_GUARDRAILS_VERSION_MARKER) || !prompt.includes(CALL_REFERENCE_TOOL_NAME) || agentConfig?.first_message !== CALL_AGENT_FIRST_MESSAGE || agent.platform_settings?.privacy?.record_voice !== true || !patientTurnTakingEnabled || !backgroundVoiceDetectionEnabled) {
    return NextResponse.json({ error: 'Apply the required AI interview guardrails, noise filtering, patient turn-taking, and recording settings before placing a call.' }, { status: 409 })
  }

  const input = parsed.data
  const admin = createAdminClient()
  if (input.interviewSessionId) {
    const { data: session, error } = await admin.from('interview_sessions').select('id,candidate_name,candidate_email,role').eq('id', input.interviewSessionId).maybeSingle()
    if (error || !session) return NextResponse.json({ error: 'The selected interview record could not be found.' }, { status: 404 })
    if (input.candidateEmail && session.candidate_email?.toLowerCase() !== input.candidateEmail.toLowerCase()) return NextResponse.json({ error: 'Candidate details do not match the selected interview.' }, { status: 400 })
  }

  const response = await fetch('https://api.elevenlabs.io/v1/convai/twilio/outbound-call', {
    method: 'POST',
    headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      agent_id: CALL_AGENT_ID,
      agent_phone_number_id: CALL_PHONE_NUMBER_ID,
      to_number: input.phoneNumber,
      conversation_initiation_client_data: {
        conversation_config_override: {
          agent: {
            first_message: `Hello, I'm George, an AI Human Resources Assistant with CARE International. I'm calling about a recruitment matter. This call may be recorded and transcribed for recruitment review, with recordings and transcripts retained for up to 90 days. May I speak with ${input.candidateName.trim().split(/\s+/)[0] || 'the person this call is intended for'}?`,
          },
        },
        dynamic_variables: {
          call_direction: 'outbound',
          call_reason: input.callReason.replace(/\s+/g, ' '),
          candidate_name: input.candidateName,
          candidate_role: input.role,
        },
      },
    }),
    cache: 'no-store',
  })
  const result = await response.json().catch(() => ({}))
  if (!response.ok) return NextResponse.json({ error: getElevenLabsErrorMessage(result, 'ElevenLabs could not start the call.') }, { status: response.status >= 500 ? 502 : response.status })

  const conversationId = result.conversation_id
  const { data: call, error } = await admin.from('interview_phone_calls').insert({
    conversation_id: typeof conversationId === 'string' ? conversationId : null,
    interview_session_id: input.interviewSessionId || null,
    direction: 'outbound',
    status: 'initiated',
    candidate_name: input.candidateName || null,
    candidate_email: input.candidateEmail || null,
    phone_number: input.phoneNumber,
    role: input.role || null,
    created_by: user.id,
    started_at: new Date().toISOString(),
  }).select('id,conversation_id,interview_session_id,direction,status,candidate_name,candidate_email,phone_number,role,transcript,summary,outcome,duration_seconds,started_at,ended_at,created_at,error_message').single()
  if (error) return NextResponse.json({ error: 'The call was started, but its record could not be saved. Refresh call history to sync it from ElevenLabs.' }, { status: 502 })
  return NextResponse.json({ call })
}
