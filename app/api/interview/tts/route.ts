import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { DEFAULT_INTERVIEW_VOICE, isElevenLabsVoiceId } from '@/lib/interview-voice'

const inputSchema = z.object({
  text: z.string().trim().min(1).max(4000),
  accessCode: z.string().trim().min(1).max(200).optional(),
  voiceId: z.string().optional(),
})

export async function POST(request: Request) {
  const parsed = inputSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success || (parsed.data.voiceId !== undefined && !isElevenLabsVoiceId(parsed.data.voiceId))) {
    return Response.json({ error: 'Invalid voice request.' }, { status: 400 })
  }

  if (!process.env.ELEVENLABS_API_KEY) {
    return Response.json({ error: 'ElevenLabs voice is not configured.' }, { status: 503 })
  }

  const supabase = createAdminClient()
  let voiceId: string = DEFAULT_INTERVIEW_VOICE.id

  if (parsed.data.accessCode) {
    const accessCode = parsed.data.accessCode.toUpperCase()
    const [{ data: interview }, { data: assessment }] = await Promise.all([
      supabase.from('interview_sessions').select('access_code').eq('access_code', accessCode).maybeSingle(),
      supabase.from('assessment_roles').select('access_code').eq('access_code', accessCode).eq('status', 'published').maybeSingle(),
    ])
    if (!interview && !assessment) return Response.json({ error: 'This interview link is invalid.' }, { status: 404 })

    const { data: settings } = await supabase.from('interview_settings').select('voice_uri').eq('id', 1).maybeSingle()
    if (isElevenLabsVoiceId(settings?.voice_uri)) voiceId = settings.voice_uri
  } else {
    const { data: { user } } = await (await createClient()).auth.getUser()
    if (!user) return Response.json({ error: 'You must be signed in to preview interview voices.' }, { status: 401 })
    if (isElevenLabsVoiceId(parsed.data.voiceId)) voiceId = parsed.data.voiceId
  }

  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`, {
    method: 'POST',
    headers: {
      'xi-api-key': process.env.ELEVENLABS_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text: parsed.data.text, model_id: 'eleven_multilingual_v2' }),
    cache: 'no-store',
  })

  if (!response.ok || !response.body) {
    return Response.json({ error: 'ElevenLabs could not generate the interviewer voice. Please try again.' }, { status: 502 })
  }

  return new Response(response.body, {
    headers: {
      'Content-Type': 'audio/mpeg',
      'Cache-Control': 'no-store, private',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
