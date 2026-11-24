
import AdminSidebar from '@/components/admin-sidebar'
import AdminVoiceSelector from '@/components/admin-voice-selector'
import { DEFAULT_INTERVIEW_VOICE, isElevenLabsVoiceId } from '@/lib/interview-voice'
import { createAdminClient } from '@/lib/supabase/admin'

type ElevenLabsVoice = { voice_id?: unknown; name?: unknown; labels?: Record<string, unknown> }

async function loadElevenLabsVoices() {
  if (!process.env.ELEVENLABS_API_KEY) return []
  try {
    const response = await fetch('https://api.elevenlabs.io/v1/voices', {
      headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY },
      cache: 'no-store',
    })
    if (!response.ok) return []
    const result = await response.json() as { voices?: ElevenLabsVoice[] }
    return (result.voices || []).flatMap(voice => {
      if (!isElevenLabsVoiceId(voice.voice_id) || typeof voice.name !== 'string') return []
      const language = typeof voice.labels?.language === 'string' ? voice.labels.language : 'en'
      if (!/^en(?:-|$)/i.test(language)) return []
      return [{ id: voice.voice_id, name: voice.name, language }]
    })
  } catch {
    return []
  }
}

export default async function InterviewVoicesPage() {
  const supabase = createAdminClient()
  const [{ data: setting }, availableVoices] = await Promise.all([
    supabase.from('interview_settings').select('voice_uri,voice_name,voice_lang').eq('id', 1).maybeSingle(),
    loadElevenLabsVoices(),
  ])
  const voiceIsValid = isElevenLabsVoiceId(setting?.voice_uri)
  const initialVoiceId = voiceIsValid ? setting.voice_uri : DEFAULT_INTERVIEW_VOICE.id
  const initialVoiceName = voiceIsValid ? setting?.voice_name || initialVoiceId : DEFAULT_INTERVIEW_VOICE.name
  const voices = availableVoices.some(voice => voice.id === DEFAULT_INTERVIEW_VOICE.id)
    ? availableVoices
    : [...availableVoices, { id: DEFAULT_INTERVIEW_VOICE.id, name: DEFAULT_INTERVIEW_VOICE.name, language: DEFAULT_INTERVIEW_VOICE.language }]
  if (voiceIsValid && !voices.some(voice => voice.id === initialVoiceId)) {
    voices.push({ id: initialVoiceId, name: initialVoiceName, language: setting?.voice_lang || 'en' })
  }

  return <main className="min-h-screen bg-background lg:flex"><AdminSidebar /><section className="min-w-0 flex-1"><header className="border-b border-border bg-card/80 px-5 py-5 backdrop-blur lg:px-8"><p className="text-xs font-semibold uppercase tracking-widest text-primary">CARE International</p><h1 className="mt-1 text-2xl font-semibold">Interview voices</h1></header><div className="mx-auto max-w-4xl p-5 lg:p-8"><AdminVoiceSelector voices={voices} initialVoiceId={initialVoiceId} initialVoiceName={initialVoiceName} /></div></section></main>
}
