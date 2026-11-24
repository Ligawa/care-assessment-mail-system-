import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const voiceUpdateSchema = z.object({
  voiceId: z.string().regex(/^[A-Za-z0-9_-]{8,64}$/),
  name: z.string().trim().min(1).max(200),
  lang: z.string().trim().min(1).max(30),
})

export async function GET() {
  const supabase = await createClient()
  const { data, error } = await supabase.from('interview_settings').select('voice_uri,voice_name,voice_lang').eq('id', 1).single()
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}

export async function PUT(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'You must be signed in to update interview voice settings.' }, { status: 401 })
  const parsed = voiceUpdateSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return Response.json({ error: 'Invalid ElevenLabs voice selection' }, { status: 400 })
  const { voiceId, name, lang } = parsed.data
  const { data, error } = await supabase.from('interview_settings').update({ voice_uri: voiceId, voice_name: name, voice_lang: lang, updated_at: new Date().toISOString() }).eq('id', 1).select('voice_uri, voice_name, voice_lang').maybeSingle()
  if (error) return Response.json({ error: error.message }, { status: 500 })
  if (!data) return Response.json({ error: 'Interview voice settings could not be updated. Check the interview_settings row and RLS policy.' }, { status: 500 })
  return Response.json({ ok: true, voice: data })
}
