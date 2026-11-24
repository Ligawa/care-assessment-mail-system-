'use client'

import { useEffect, useRef, useState } from 'react'

type VoiceOption = { id: string; name: string; language: string }
type Props = { voices: VoiceOption[]; initialVoiceId: string; initialVoiceName: string }

export default function AdminVoiceSelector({ voices, initialVoiceId, initialVoiceName }: Props) {
  const [selected, setSelected] = useState(initialVoiceId)
  const [status, setStatus] = useState('')
  const [statusIsError, setStatusIsError] = useState(false)
  const [busy, setBusy] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const objectUrlRef = useRef<string | null>(null)
  const selectedVoice = voices.find(voice => voice.id === selected)

  function clearPreview() {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.onended = null
      audioRef.current.onerror = null
      audioRef.current.src = ''
      audioRef.current = null
    }
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current)
      objectUrlRef.current = null
    }
  }

  useEffect(() => () => clearPreview(), [])

  async function preview() {
    if (!selectedVoice) return
    setBusy(true)
    setStatusIsError(false)
    setStatus('Generating an ElevenLabs sample…')
    clearPreview()
    try {
      const response = await fetch('/api/interview/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voiceId: selectedVoice.id, text: 'Hello, I am George. Welcome to your CARE International interview.' }),
      })
      if (!response.ok) {
        const result = await response.json().catch(() => ({}))
        throw new Error(result.error || 'Could not generate the voice sample.')
      }
      const objectUrl = URL.createObjectURL(await response.blob())
      objectUrlRef.current = objectUrl
      const player = new Audio(objectUrl)
      audioRef.current = player
      player.onended = () => { clearPreview(); setBusy(false); setStatusIsError(false); setStatus('Preview finished.') }
      player.onerror = () => { clearPreview(); setBusy(false); setStatusIsError(true); setStatus('The voice sample could not be played.') }
      await player.play()
      setStatus(`Previewing ${selectedVoice.name}.`)
    } catch (cause) {
      setBusy(false)
      setStatusIsError(true)
      setStatus(cause instanceof Error ? cause.message : 'Could not generate the voice sample.')
    }
  }

  async function save() {
    if (!selectedVoice) return
    setBusy(true)
    setStatusIsError(false)
    setStatus('Saving voice…')
    try {
      const response = await fetch('/api/interview/voice', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voiceId: selectedVoice.id, name: selectedVoice.name, lang: selectedVoice.language }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || `Request failed (${response.status})`)
      setStatus(`${selectedVoice.name} is saved for all interview devices.`)
    } catch (cause) {
      setStatusIsError(true)
      setStatus(cause instanceof Error ? cause.message : 'Could not save the voice selection.')
    } finally {
      setBusy(false)
    }
  }

  return <main className="min-h-screen bg-[#f7f8f6] p-8 text-[#173f35]"><div className="mx-auto max-w-2xl rounded-3xl bg-white p-8 shadow-lg"><p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#e87518]">Interview settings</p><h1 className="mt-2 text-3xl font-semibold">ElevenLabs interviewer voice</h1><p className="mt-3 text-[#5d7169]">Choose an English voice from the connected ElevenLabs account. The default interviewer is George.</p><label className="mt-8 grid gap-2 text-sm font-semibold" htmlFor="interview-voice">Voice used for live interviews</label><select id="interview-voice" value={selected} onChange={event => setSelected(event.target.value)} className="h-12 w-full rounded-xl border px-4" disabled={!voices.length || busy}><option value="">Select an ElevenLabs voice</option>{voices.map(voice => <option key={voice.id} value={voice.id}>{voice.name} — {voice.language}</option>)}</select><p className="mt-2 text-sm text-[#6b7f77]">Selected voice: {selectedVoice?.name || initialVoiceName}</p><p className="mt-2 text-sm text-[#6b7f77]">An authenticated staff session is required to preview or save voice changes.</p><div className="mt-4 flex flex-wrap gap-3"><button type="button" onClick={preview} disabled={!selectedVoice || busy} className="rounded-xl bg-[#e87518] px-5 py-3 font-semibold text-white disabled:opacity-40">Preview voice</button><button type="button" onClick={save} disabled={!selectedVoice || busy} className="rounded-xl border border-[#173f35] px-5 py-3 font-semibold text-[#173f35] disabled:opacity-40">Save for all interviews</button></div>{!voices.length && <p className="mt-4 text-sm text-amber-800">The ElevenLabs voice library could not be loaded. Check that ElevenLabs is configured.</p>}{status && <p role="status" className={`mt-4 text-sm font-semibold ${statusIsError ? 'text-red-700' : 'text-[#36835d]'}`}>{status}</p>}</div></main>
}
