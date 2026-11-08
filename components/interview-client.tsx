'use client'

import { useEffect, useRef, useState } from 'react'
import { Camera, CheckCircle2, Mic, MicOff, Phone, Volume2 } from 'lucide-react'

type Utterance = { speaker: 'Emmy Nana' | 'Candidate'; text: string }
type Props = { role: string; accessCode: string; voiceUri: string }
type Recognition = { continuous: boolean; interimResults: boolean; lang: string; start: () => void; stop: () => void; onresult: ((event: { results: ArrayLike<{ 0: { transcript: string } }> }) => void) | null; onend: (() => void) | null; onerror: (() => void) | null }
type RecognitionConstructor = new () => Recognition

declare global { interface Window { SpeechRecognition?: RecognitionConstructor; webkitSpeechRecognition?: RecognitionConstructor } }

export default function InterviewClient({ role, accessCode, voiceUri }: Props) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [started, setStarted] = useState(false)
  const [listening, setListening] = useState(false)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [heardSomething, setHeardSomething] = useState(false)
  const [cameraReady, setCameraReady] = useState(false)
  const [microphoneMuted, setMicrophoneMuted] = useState(false)
  const [transcript, setTranscript] = useState<Utterance[]>([])
  const spoken = useRef('')
  const committed = useRef('')
  const wantListening = useRef(false)
  const recorder = useRef<MediaRecorder | null>(null)
  const chunks = useRef<Blob[]>([])
  const recognition = useRef<Recognition | null>(null)
  const stream = useRef<MediaStream | null>(null)
  const video = useRef<HTMLVideoElement | null>(null)
  const chosenVoice = useRef<SpeechSynthesisVoice | null>(null)

  function pickVoice() {
    const voices = window.speechSynthesis.getVoices()
    if (!voices.length) return null
    return voices.find(item => voiceUri && item.voiceURI === voiceUri) || voices.find(item => /Microsoft (Natasha|Jenny|Aria|Sonia)/i.test(item.name)) || voices.find(item => /Google UK English Female|Samantha|Karen|Moira|Zira/i.test(item.name)) || voices.find(item => /^en(-|_)/i.test(item.lang)) || voices[0]
  }

  useEffect(() => {
    const load = () => { chosenVoice.current = pickVoice() }
    load()
    window.speechSynthesis.addEventListener('voiceschanged', load)
    return () => window.speechSynthesis.removeEventListener('voiceschanged', load)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voiceUri])

  function speak(text: string) {
    window.speechSynthesis.cancel()
    if (!chosenVoice.current) chosenVoice.current = pickVoice()
    const utterance = new SpeechSynthesisUtterance(text)
    if (chosenVoice.current) { utterance.voice = chosenVoice.current; utterance.lang = chosenVoice.current.lang }
    else utterance.lang = 'en-US'
    utterance.rate = 0.9; utterance.pitch = 1.02
    utterance.onend = () => startListening()
    window.speechSynthesis.speak(utterance)
  }

  async function askEmmy(next: Utterance[]) {
    setBusy(true); setError('')
    try {
      const response = await fetch('/api/interview/respond', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role, candidateName: name, accessCode, transcript: next }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'The interview could not continue.')
      setTranscript(current => [...current, { speaker: 'Emmy Nana', text: data.text }])
      if (data.completed) { setDone(true); recognition.current?.stop(); window.speechSynthesis.cancel(); await fetch('/api/interview/complete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ accessCode, role, candidateName: name, candidateEmail: email, transcript: [...next, { speaker: 'Emmy Nana', text: data.text }] }) }); stream.current?.getTracks().forEach(track => track.stop()); return }
      speak(data.text)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'The interview could not continue.') } finally { setBusy(false) }
  }

  function startRecording() {
    if (!stream.current || typeof MediaRecorder === 'undefined') return
    if (recorder.current && recorder.current.state !== 'inactive') return
    const audioTracks = stream.current.getAudioTracks()
    if (!audioTracks.length) return
    try {
      const mimeType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find(type => MediaRecorder.isTypeSupported(type))
      const next = new MediaRecorder(new MediaStream(audioTracks), mimeType ? { mimeType } : undefined)
      chunks.current = []
      next.ondataavailable = event => { if (event.data.size > 0) chunks.current.push(event.data) }
      next.start(1000)
      recorder.current = next
    } catch { recorder.current = null }
  }

  function stopRecording(): Promise<Blob | null> {
    const active = recorder.current
    recorder.current = null
    const collect = (type: string) => chunks.current.length ? new Blob(chunks.current, { type: type || 'audio/webm' }) : null
    if (!active || active.state === 'inactive') return Promise.resolve(collect(active?.mimeType || ''))
    return new Promise(resolve => { active.onstop = () => resolve(collect(active.mimeType)); active.stop() })
  }

  async function toWav(blob: Blob): Promise<Blob | null> {
    const sampleRate = 11025
    const maxSamples = sampleRate * 120
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const context = new AudioContextClass()
    try {
      const decoded = await context.decodeAudioData(await blob.arrayBuffer())
      const offline = new OfflineAudioContext(1, Math.max(1, Math.ceil(decoded.duration * sampleRate)), sampleRate)
      const source = offline.createBufferSource(); source.buffer = decoded; source.connect(offline.destination); source.start()
      const rendered = await offline.startRendering()
      const all = rendered.getChannelData(0)
      const samples = all.length > maxSamples ? all.subarray(all.length - maxSamples) : all
      const view = new DataView(new ArrayBuffer(44 + samples.length * 2))
      const write = (offset: number, text: string) => { for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i)) }
      write(0, 'RIFF'); view.setUint32(4, 36 + samples.length * 2, true); write(8, 'WAVE'); write(12, 'fmt ')
      view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true); view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true)
      write(36, 'data'); view.setUint32(40, samples.length * 2, true)
      samples.forEach((value, index) => { const clamped = Math.max(-1, Math.min(1, value)); view.setInt16(44 + index * 2, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true) })
      return new Blob([view], { type: 'audio/wav' })
    } catch { return null } finally { void context.close() }
  }

  async function transcribeRecording(blob: Blob | null) {
    if (!blob || blob.size < 1500) return ''
    const wav = await toWav(blob)
    if (!wav) return ''
    const response = await fetch('/api/interview/transcribe', { method: 'POST', headers: { 'Content-Type': 'audio/wav' }, body: wav })
    if (!response.ok) return ''
    const data = await response.json()
    return typeof data.text === 'string' ? data.text.trim() : ''
  }

  function startListening() {
    if (done) return
    wantListening.current = true; committed.current = ''; spoken.current = ''; setHeardSomething(false); setError('')
    startRecording(); setListening(true)
    const Constructor = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!Constructor) return
    const begin = () => {
      const current = new Constructor(); current.continuous = true; current.interimResults = true; current.lang = 'en-US'
      current.onresult = event => {
        const text = Array.from(event.results).map(result => result[0]?.transcript || '').join(' ').trim()
        spoken.current = [committed.current, text].filter(Boolean).join(' ').trim(); setHeardSomething(Boolean(spoken.current))
      }
      current.onend = () => {
        committed.current = spoken.current
        if (wantListening.current) { try { begin() } catch { /* recorder still captures the answer */ } }
      }
      current.onerror = () => {}
      recognition.current = current; current.start()
    }
    try { begin() } catch { /* recorder still captures the answer */ }
  }

  function stopListening() { wantListening.current = false; recognition.current?.stop(); setListening(false) }

  function toggleMicrophone() { const muted = !microphoneMuted; stream.current?.getAudioTracks().forEach(track => { track.enabled = !muted }); setMicrophoneMuted(muted); if (muted) stopListening() }

  async function submitAnswer() {
    if (busy) return
    setBusy(true); setError('')
    wantListening.current = false; recognition.current?.stop(); setListening(false)
    const blob = await stopRecording()
    await new Promise(resolve => setTimeout(resolve, 250))
    let answer = spoken.current.trim()
    if (!answer) answer = await transcribeRecording(blob)
    if (!answer) { setBusy(false); setError('I did not catch that. Please speak again, then select Done speaking.'); startListening(); return }
    const next = [...transcript, { speaker: 'Candidate' as const, text: answer }]
    spoken.current = ''; committed.current = ''; setHeardSomething(false); setTranscript(next); void askEmmy(next)
  }

  async function finish() { setDone(true); recognition.current?.stop(); window.speechSynthesis.cancel(); await fetch('/api/interview/complete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ accessCode, role, candidateName: name, candidateEmail: email, transcript }) }); stream.current?.getTracks().forEach(track => track.stop()) }

  async function begin() {
    if (!name.trim()) return setError('Please enter your name before starting.')
    if (!email.trim() || !/^\S+@\S+\.\S+$/.test(email.trim())) return setError('Please enter a valid email address before starting.')
    try { const media = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: true }); stream.current = media; setStarted(true); void askEmmy([]) } catch { setError('Please allow camera and microphone access to join the interview.') }
  }

  useEffect(() => {
    if (!started) return
    const element = video.current
    if (!element || !stream.current) return
    element.srcObject = stream.current
    const markReady = () => setCameraReady(true)
    element.addEventListener('loadedmetadata', markReady)
    element.addEventListener('playing', markReady)
    void element.play().then(markReady).catch(() => {})
    if (element.readyState >= 2) markReady()
    return () => { element.removeEventListener('loadedmetadata', markReady); element.removeEventListener('playing', markReady) }
  }, [started])

  useEffect(() => () => { recognition.current?.stop(); window.speechSynthesis.cancel(); stream.current?.getTracks().forEach(track => track.stop()) }, [])

  if (!started) return <main className="min-h-screen bg-[#f7f8f6] p-6 text-[#173f35]"><div className="mx-auto max-w-xl rounded-[2rem] bg-white p-8 shadow-xl"><img src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Care%20Intl%20logo-8dXiV9R7mb3d8yCbmDLtahqHcQJ2Xm.png" alt="CARE International" className="h-10" /><p className="mt-12 text-sm font-semibold uppercase tracking-[0.2em] text-[#e87518]">Live interview</p><h1 className="mt-3 text-4xl font-semibold">Meet Emmy Nana</h1><p className="mt-4 leading-7 text-[#5d7169]">This interview is for the <strong className="font-semibold text-[#173f35]">{role}</strong> position at CARE International.</p><p className="mt-4 text-sm leading-6 text-[#5d7169]">Enter your details below to begin your live interview with Emmy Nana.</p><p className="mt-4 text-sm text-[#6b7f77]">Emmy Nana will explain the role, compensation, locations, and documentation requirements aloud before the interview begins.</p><label className="mt-8 grid gap-2 text-sm font-semibold">Your full name<input required value={name} onChange={event => setName(event.target.value)} className="h-12 rounded-xl border px-4 font-normal" placeholder="Enter your name" /></label><label className="mt-4 grid gap-2 text-sm font-semibold">Email address<input required type="email" value={email} onChange={event => setEmail(event.target.value)} className="h-12 rounded-xl border px-4 font-normal" placeholder="you@example.com" /></label>{error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}<button onClick={begin} className="mt-6 w-full rounded-xl bg-[#e87518] px-5 py-3 font-semibold text-white">Join interview</button><p className="mt-4 text-sm text-[#6b7f77]">Your browser will request camera and microphone access.</p></div></main>

  return <main className="min-h-screen bg-[#f7f8f6] p-4 text-[#173f35] sm:p-6"><div className="mx-auto max-w-7xl"><header className="flex items-center justify-between"><img src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Care%20Intl%20logo-8dXiV9R7mb3d8yCbmDLtahqHcQJ2Xm.png" alt="CARE International" className="h-9" /><span className="text-sm text-[#6b7f77]">{role}</span></header><section className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(360px,0.9fr)]"><div className="rounded-3xl bg-white p-4 text-center shadow-lg sm:p-6"><div className="relative flex min-h-[55vh] items-center justify-center overflow-hidden rounded-2xl bg-[#173f35]"><video ref={video} muted autoPlay playsInline className={`max-h-[72vh] w-full object-contain ${cameraReady ? 'opacity-100' : 'opacity-0'}`} aria-label="Your live camera preview" />{!cameraReady && <div className="absolute inset-0 grid place-items-center p-6 text-center text-white"><div><Camera className="mx-auto size-10 text-[#f5a15c]" /><p className="mt-3 font-semibold">Camera preview loading</p><p className="mt-1 text-sm text-white/75">Allow camera access to see your live video here.</p></div></div>}<span className="absolute bottom-3 left-3 rounded-full bg-black/50 px-3 py-1 text-xs font-semibold text-white">{cameraReady ? 'Live camera' : 'Camera starting'}</span></div><div className="mx-auto mt-6 grid size-24 place-items-center rounded-full bg-[#e87518] text-3xl font-semibold text-white">EN</div><h2 className="mt-4 text-xl font-semibold">Emmy Nana</h2><p className="text-sm text-[#6b7f77]">Professional interviewer</p></div><div className="rounded-3xl bg-white p-6 pb-24 shadow-lg sm:pb-6"><div className="flex items-center gap-3"><div className={`grid size-12 place-items-center rounded-full ${listening ? 'bg-[#e87518] text-white' : 'bg-[#e9f2ec] text-[#173f35]'}`}><Volume2 className="size-5" /></div><div><p className="font-semibold">{busy ? 'Emmy Nana is preparing the next question' : listening ? 'Your turn to speak' : done ? 'Interview complete' : 'Emmy Nana is listening'}</p><p className="text-sm text-[#6b7f77]">{listening ? 'Speak naturally, then select Done speaking.' : 'The conversation is private and voice-led.'}</p></div></div>{done ? <div className="mt-10 rounded-2xl bg-[#e9f2ec] p-6 text-center"><CheckCircle2 className="mx-auto size-10 text-[#36835d]" /><h2 className="mt-3 text-xl font-semibold">Thank you, {name}</h2><p className="mt-2 text-[#5d7169]">Your interview has been submitted for review.</p></div> : <div className="fixed inset-x-0 bottom-0 z-20 flex flex-wrap gap-2 border-t border-[#dbe5df] bg-white/95 p-3 shadow-[0_-8px_24px_rgba(23,63,53,0.12)] backdrop-blur sm:static sm:mt-10 sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none sm:backdrop-blur-0"><button type="button" onClick={submitAnswer} disabled={busy} className="rounded-xl bg-[#e87518] px-5 py-3 font-semibold text-white disabled:opacity-40">Done speaking</button><button type="button" onClick={() => listening ? stopListening() : startListening()} disabled={busy} className="rounded-xl border border-[#cbd9d1] px-5 py-3 font-semibold">{listening ? <MicOff className="mr-2 inline size-4" /> : <Mic className="mr-2 inline size-4" />}{listening ? 'Pause' : 'Speak'}</button><button type="button" onClick={toggleMicrophone} disabled={busy} className="rounded-xl border border-[#cbd9d1] px-4 py-3 font-semibold" aria-pressed={microphoneMuted}>{microphoneMuted ? <MicOff className="mr-2 inline size-4" /> : <Mic className="mr-2 inline size-4" />}{microphoneMuted ? 'Unmute' : 'Mute'}</button><button type="button" onClick={finish} disabled={busy} className="ml-auto rounded-xl border border-red-200 px-5 py-3 font-semibold text-red-700"><Phone className="mr-2 inline size-4" />End interview</button></div>}{error && <p className="mt-5 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}</div></section></div></main>
}
