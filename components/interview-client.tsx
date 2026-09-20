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
  const [transcript, setTranscript] = useState<Utterance[]>([])
  const spoken = useRef('')
  const recognition = useRef<Recognition | null>(null)
  const stream = useRef<MediaStream | null>(null)
  const video = useRef<HTMLVideoElement | null>(null)

  function speak(text: string) {
    window.speechSynthesis.cancel()
    const voices = window.speechSynthesis.getVoices()
    const voice = voices.find(item => voiceUri && item.voiceURI === voiceUri) || voices.find(item => /Microsoft (Jenny|Aria|Sonia)|Google UK English Female|Samantha|Karen|Moira|Zira/i.test(item.name)) || voices.find(item => /^en(-|_)/i.test(item.lang))
    const utterance = new SpeechSynthesisUtterance(text)
    if (voice) utterance.voice = voice
    utterance.lang = 'en-US'; utterance.rate = 0.9; utterance.pitch = 1.02
    utterance.onend = () => startListening()
    window.speechSynthesis.speak(utterance)
  }

  async function askEmmy(next: Utterance[]) {
    setBusy(true); setError('')
    try {
      const response = await fetch('/api/interview/respond', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role, candidateName: name, transcript: next }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'The interview could not continue.')
      setTranscript(current => [...current, { speaker: 'Emmy Nana', text: data.text }])
      speak(data.text)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'The interview could not continue.') } finally { setBusy(false) }
  }

  function startListening() {
    const Constructor = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!Constructor || done) return setError('Voice input is not supported. Please use Chrome or Edge.')
    const current = new Constructor(); current.continuous = false; current.interimResults = false; current.lang = 'en-US'
    current.onresult = event => { spoken.current = event.results[0]?.[0]?.transcript?.trim() || ''; setHeardSomething(Boolean(spoken.current)) }
    current.onend = () => setListening(false)
    current.onerror = () => { setListening(false); setError('Please try again when you are ready.') }
    recognition.current = current; current.start(); setListening(true); setHeardSomething(false)
  }

  function submitAnswer() {
    const answer = spoken.current.trim(); if (!answer || busy) return
    const next = [...transcript, { speaker: 'Candidate' as const, text: answer }]
    spoken.current = ''; setHeardSomething(false); setTranscript(next); void askEmmy(next)
  }

  async function finish() { setDone(true); recognition.current?.stop(); window.speechSynthesis.cancel(); await fetch('/api/interview/complete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ accessCode, role, candidateName: name, candidateEmail: email, transcript }) }); stream.current?.getTracks().forEach(track => track.stop()) }

  async function begin() {
    if (!name.trim()) return setError('Please enter your name before starting.')
    if (!email.trim() || !/^\S+@\S+\.\S+$/.test(email.trim())) return setError('Please enter a valid email address before starting.')
    try { const media = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: true }); stream.current = media; setStarted(true); requestAnimationFrame(() => { if (video.current) { video.current.srcObject = media; video.current.onloadeddata = () => setCameraReady(true); void video.current.play().catch(() => setError('Your camera opened, but the preview could not start. Please check browser camera permissions and reload.')) } }); void askEmmy([]) } catch { setError('Please allow camera and microphone access to join the interview.') }
  }

  useEffect(() => () => { recognition.current?.stop(); window.speechSynthesis.cancel(); stream.current?.getTracks().forEach(track => track.stop()) }, [])

  if (!started) return <main className="min-h-screen bg-[#f7f8f6] p-6 text-[#173f35]"><div className="mx-auto max-w-xl rounded-[2rem] bg-white p-8 shadow-xl"><img src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Care%20Intl%20logo-8dXiV9R7mb3d8yCbmDLtahqHcQJ2Xm.png" alt="CARE International" className="h-10" /><p className="mt-12 text-sm font-semibold uppercase tracking-[0.2em] text-[#e87518]">Live interview</p><h1 className="mt-3 text-4xl font-semibold">Meet Emmy Nana</h1><p className="mt-4 leading-7 text-[#5d7169]">This interview is for the <strong className="font-semibold text-[#173f35]">{role}</strong> position at CARE International.</p><p className="mt-4 text-sm leading-6 text-[#5d7169]">Enter your details below to begin your live interview with Emmy Nana.</p><label className="mt-8 grid gap-2 text-sm font-semibold">Your full name<input required value={name} onChange={event => setName(event.target.value)} className="h-12 rounded-xl border px-4 font-normal" placeholder="Enter your name" /></label><label className="mt-4 grid gap-2 text-sm font-semibold">Email address<input required type="email" value={email} onChange={event => setEmail(event.target.value)} className="h-12 rounded-xl border px-4 font-normal" placeholder="you@example.com" /></label>{error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}<button onClick={begin} className="mt-6 w-full rounded-xl bg-[#e87518] px-5 py-3 font-semibold text-white">Join interview</button><p className="mt-4 text-sm text-[#6b7f77]">Your browser will request camera and microphone access.</p></div></main>

  return <main className="min-h-screen bg-[#f7f8f6] p-6 text-[#173f35]"><div className="mx-auto max-w-4xl"><header className="flex items-center justify-between"><img src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Care%20Intl%20logo-8dXiV9R7mb3d8yCbmDLtahqHcQJ2Xm.png" alt="CARE International" className="h-9" /><span className="text-sm text-[#6b7f77]">{role}</span></header><section className="mt-8 grid gap-6 lg:grid-cols-[0.8fr_1.2fr]"><div className="rounded-3xl bg-white p-6 text-center shadow-lg"><div className="relative overflow-hidden rounded-2xl bg-[#173f35]"><video ref={video} muted autoPlay playsInline className={`aspect-video w-full object-cover ${cameraReady ? 'opacity-100' : 'opacity-0'}`} aria-label="Your live camera preview" />{!cameraReady && <div className="absolute inset-0 grid place-items-center p-6 text-center text-white"><div><Camera className="mx-auto size-10 text-[#f5a15c]" /><p className="mt-3 font-semibold">Camera preview loading</p><p className="mt-1 text-sm text-white/75">Allow camera access to see your live video here.</p></div></div>}<span className="absolute bottom-3 left-3 rounded-full bg-black/50 px-3 py-1 text-xs font-semibold text-white">{cameraReady ? 'Live camera' : 'Camera starting'}</span></div><div className="mx-auto mt-6 grid size-24 place-items-center rounded-full bg-[#e87518] text-3xl font-semibold text-white">EN</div><h2 className="mt-4 text-xl font-semibold">Emmy Nana</h2><p className="text-sm text-[#6b7f77]">Professional interviewer</p></div><div className="rounded-3xl bg-white p-6 shadow-lg"><div className="flex items-center gap-3"><div className={`grid size-12 place-items-center rounded-full ${listening ? 'bg-[#e87518] text-white' : 'bg-[#e9f2ec] text-[#173f35]'}`}><Volume2 className="size-5" /></div><div><p className="font-semibold">{busy ? 'Emmy Nana is preparing the next question' : listening ? 'Your turn to speak' : done ? 'Interview complete' : 'Emmy Nana is listening'}</p><p className="text-sm text-[#6b7f77]">{listening ? 'Speak naturally, then select Done speaking.' : 'The conversation is private and voice-led.'}</p></div></div>{done ? <div className="mt-10 rounded-2xl bg-[#e9f2ec] p-6 text-center"><CheckCircle2 className="mx-auto size-10 text-[#36835d]" /><h2 className="mt-3 text-xl font-semibold">Thank you, {name}</h2><p className="mt-2 text-[#5d7169]">Your interview has been submitted for review.</p></div> : <div className="mt-10 flex flex-wrap gap-3"><button onClick={submitAnswer} disabled={!heardSomething || busy} className="rounded-xl bg-[#e87518] px-5 py-3 font-semibold text-white disabled:opacity-40">Done speaking</button><button onClick={() => listening ? recognition.current?.stop() : startListening()} disabled={busy} className="rounded-xl border border-[#cbd9d1] px-5 py-3 font-semibold">{listening ? <MicOff className="mr-2 inline size-4" /> : <Mic className="mr-2 inline size-4" />}{listening ? 'Pause' : 'Speak'}</button><button onClick={finish} disabled={busy || transcript.length < 2} className="ml-auto rounded-xl border border-red-200 px-5 py-3 font-semibold text-red-700"><Phone className="mr-2 inline size-4" />End interview</button></div>}{error && <p className="mt-5 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}</div></section></div></main>
}
