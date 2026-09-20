'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Mic, MicOff, Phone, ShieldCheck, Volume2 } from 'lucide-react'

type Utterance = { speaker: 'Emmy Nana' | 'Candidate'; text: string }
type Props = { role: string; accessCode: string }

type SpeechRecognitionInstance = { continuous: boolean; interimResults: boolean; lang: string; start: () => void; stop: () => void; onresult: ((event: { results: ArrayLike<{ 0: { transcript: string } }> }) => void) | null; onend: (() => void) | null; onerror: (() => void) | null }
type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance

declare global { interface Window { SpeechRecognition?: SpeechRecognitionConstructor; webkitSpeechRecognition?: SpeechRecognitionConstructor } }

export default function InterviewClient({ role, accessCode }: Props) {
  const [candidateName, setCandidateName] = useState('')
  const [started, setStarted] = useState(false)
  const [listening, setListening] = useState(false)
  const [busy, setBusy] = useState(false)
  const [transcript, setTranscript] = useState<Utterance[]>([])
  const [error, setError] = useState('')
  const recognition = useRef<SpeechRecognitionInstance | null>(null)
  const spoken = useRef('')
  const lastResponse = useMemo(() => [...transcript].reverse().find(item => item.speaker === 'Emmy Nana')?.text, [transcript])

  function speak(text: string) {
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    const voice = window.speechSynthesis.getVoices().find(item => /female|samantha|zira|google uk english female/i.test(item.name))
    if (voice) utterance.voice = voice
    utterance.rate = 0.96
    utterance.pitch = 1.03
    utterance.onend = () => startListening()
    window.speechSynthesis.speak(utterance)
  }

  async function askEmmy(nextTranscript: Utterance[]) {
    setBusy(true); setError('')
    try {
      const response = await fetch('/api/interview/respond', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role, candidateName, transcript: nextTranscript }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Emmy Nana is unavailable right now.')
      const message: Utterance = { speaker: 'Emmy Nana', text: data.text }
      setTranscript(items => [...items, message]); speak(data.text)
    } catch (interviewError) { setError(interviewError instanceof Error ? interviewError.message : 'Interview could not continue.') } finally { setBusy(false) }
  }

  function startListening() {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!Recognition) { setError('Voice input is not supported in this browser. Please use Chrome or Edge.'); return }
    const instance = new Recognition(); instance.continuous = false; instance.interimResults = false; instance.lang = 'en-US'
    instance.onresult = event => { const text = event.results[0]?.[0]?.transcript?.trim(); if (!text) return; const next = [...transcript, { speaker: 'Candidate' as const, text }]; setTranscript(next); void askEmmy(next) }
    instance.onend = () => setListening(false); instance.onerror = () => { setListening(false); setError('I could not hear that clearly. Please try again.') }
    recognition.current = instance; instance.start(); setListening(true)
  }

  function begin() { if (!candidateName.trim()) { setError('Please enter your name before starting.'); return } setStarted(true); void askEmmy([]) }
  function stop() { recognition.current?.stop(); window.speechSynthesis.cancel(); setListening(false) }

  useEffect(() => () => stop(), [])

  if (!started) return <main className="min-h-screen bg-[#f7f8f6] text-[#173f35]"><header className="border-b border-[#dce5df] bg-white"><div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5"><img src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Care%20Intl%20logo-8dXiV9R7mb3d8yCbmDLtahqHcQJ2Xm.png" alt="CARE International" className="h-11 w-auto" /><span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6b7f77]">Live interview</span></div></header><section className="mx-auto grid max-w-5xl gap-10 px-5 py-14 lg:grid-cols-[1fr_0.8fr] lg:items-center"><div><p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#e87518]">CARE International candidate portal</p><h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-6xl">Meet Emmy Nana.</h1><p className="mt-5 max-w-xl text-lg leading-8 text-[#5d7169]">A focused, voice-led interview for the <strong className="text-[#173f35]">{role}</strong> position. Emmy will ask one question at a time and keep the conversation professional.</p><label className="mt-9 grid max-w-md gap-2 text-sm font-semibold">Your full name<input value={candidateName} onChange={event => setCandidateName(event.target.value)} placeholder="Enter your name" className="h-12 rounded-xl border border-[#cbd9d1] bg-white px-4 font-normal outline-none focus:border-[#e87518] focus:ring-2 focus:ring-[#e87518]/20" /></label>{error && <p className="mt-4 max-w-md rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}<button onClick={begin} className="mt-6 inline-flex h-12 items-center gap-2 rounded-full bg-[#173f35] px-6 font-semibold text-white shadow-lg shadow-[#173f35]/15 transition hover:-translate-y-0.5"><Phone className="size-4" />Start interview</button></div><div className="rounded-[2rem] border border-[#dce5df] bg-white p-8 shadow-[0_24px_70px_rgba(23,63,53,0.08)]"><div className="flex items-center gap-4"><div className="grid size-16 place-items-center rounded-full bg-[#e87518] text-2xl font-semibold text-white">EN</div><div><p className="text-xl font-semibold">Emmy Nana</p><p className="text-sm text-[#6b7f77]">AI interviewer · CARE International</p></div></div><div className="mt-8 space-y-4 text-sm leading-6 text-[#5d7169]"><p className="flex gap-3"><ShieldCheck className="mt-1 size-4 shrink-0 text-[#e87518]" />Your interview stays focused on the role and your experience.</p><p className="flex gap-3"><Volume2 className="mt-1 size-4 shrink-0 text-[#e87518]" />Use headphones and speak naturally in a quiet space.</p></div></div></section></main>

  return <main className="min-h-screen bg-[#f7f8f6] text-[#173f35]"><header className="border-b border-[#dce5df] bg-white"><div className="mx-auto flex max-w-4xl items-center justify-between px-5 py-5"><div className="flex items-center gap-3"><img src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Care%20Intl%20logo-8dXiV9R7mb3d8yCbmDLtahqHcQJ2Xm.png" alt="CARE International" className="h-9 w-auto" /><div className="hidden border-l border-[#dce5df] pl-3 text-sm sm:block">Live interview</div></div><span className="flex items-center gap-2 text-sm text-[#6b7f77]"><span className="size-2 rounded-full bg-[#44a56f]" />Secure session</span></div></header><section className="mx-auto max-w-4xl px-5 py-10"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#e87518]">{role}</p><h1 className="mt-2 text-4xl font-semibold tracking-tight">Interview with Emmy Nana</h1></div><p className="font-mono text-xs text-[#6b7f77]">Session {accessCode}</p></div><div className="mt-8 grid gap-6 lg:grid-cols-[0.8fr_1.2fr]"><div className="rounded-[2rem] border border-[#dce5df] bg-white p-8 text-center shadow-[0_24px_70px_rgba(23,63,53,0.08)]"><div className="mx-auto grid size-32 place-items-center rounded-full bg-[#e87518] text-4xl font-semibold text-white shadow-[0_0_0_14px_rgba(232,117,24,0.1)]">EN</div><p className="mt-6 text-xl font-semibold">Emmy Nana</p><p className="mt-1 text-sm text-[#6b7f77]">Professional AI interviewer</p><div className={`mx-auto mt-8 flex size-20 items-center justify-center rounded-full border-4 ${listening ? 'border-[#e87518] bg-[#fff4e9]' : 'border-[#dce5df] bg-[#f7f8f6]'}`}><Mic className={`size-7 ${listening ? 'text-[#e87518]' : 'text-[#6b7f77]'}`} /></div><p className="mt-4 text-sm text-[#6b7f77]">{busy ? 'Emmy is preparing the next question…' : listening ? 'Listening to you…' : lastResponse ? 'Your turn when ready' : 'Starting your interview…'}</p>{listening && <button onClick={stop} className="mt-5 inline-flex items-center gap-2 rounded-full border border-[#dce5df] px-4 py-2 text-sm font-semibold"><MicOff className="size-4" />Stop listening</button>}</div><div className="rounded-[2rem] border border-[#dce5df] bg-white p-6"><div className="flex items-center justify-between border-b border-[#edf1ee] pb-4"><p className="font-semibold">Interview conversation</p><p className="text-xs text-[#6b7f77]">One question at a time</p></div><div className="mt-5 min-h-[300px] space-y-4">{transcript.length === 0 && <p className="rounded-2xl bg-[#f7f8f6] p-4 text-sm leading-6 text-[#6b7f77]">Emmy Nana will welcome you and begin shortly.</p>}{transcript.map((item, index) => <div key={`${item.speaker}-${index}`} className={`rounded-2xl p-4 text-sm leading-6 ${item.speaker === 'Emmy Nana' ? 'bg-[#eef5f1]' : 'ml-8 bg-[#fff4e9]'}`}><p className="mb-1 text-xs font-semibold uppercase tracking-wider text-[#6b7f77]">{item.speaker}</p>{item.text}</div>)}</div>{error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}{!busy && !listening && transcript.length > 0 && <button onClick={startListening} className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#173f35] font-semibold text-white"><Mic className="size-4" />Answer Emmy</button>}</div></div><p className="mt-6 text-center text-xs leading-5 text-[#6b7f77]">Please keep your answers relevant to the role. Emmy Nana will not engage in unrelated conversation.</p></section></main>
}
