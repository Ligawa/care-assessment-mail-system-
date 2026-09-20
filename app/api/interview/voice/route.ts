import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data, error } = await supabase.from('interview_settings').select('voice_uri,voice_name,voice_lang').eq('id', 1).single()
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}

export async function PUT(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json()
  if (![body.voiceURI, body.name, body.lang].every(value => typeof value === 'string' && value.length > 0) || body.voiceURI.length > 500 || body.name.length > 200 || body.lang.length > 30) return Response.json({ error: 'Invalid voice selection' }, { status: 400 })
  const { error } = await supabase.from('interview_settings').update({ voice_uri: body.voiceURI, voice_name: body.name, voice_lang: body.lang, updated_at: new Date().toISOString() }).eq('id', 1)
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}
