'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function InterviewCodeForm() {
  const router = useRouter()
  const [code, setCode] = useState('')

  function submit(event: React.FormEvent) {
    event.preventDefault()
    const clean = code.trim().replace(/[^A-Za-z0-9-]/g, '')
    if (clean) router.push(`/interview/${clean}`)
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row">
      <label htmlFor="interview-code" className="sr-only">Interview access code</label>
      <input id="interview-code" value={code} onChange={event => setCode(event.target.value)} placeholder="INT-XXXXXXXX-X" autoComplete="off" autoCapitalize="characters" className="min-w-0 flex-1 rounded-full border border-[#d9ded8] bg-white px-5 py-3 font-mono uppercase tracking-wide outline-none focus-visible:border-[#f07818] focus-visible:ring-2 focus-visible:ring-[#f07818]/30" />
      <button type="submit" className="rounded-full bg-[#f07818] px-6 py-3 font-semibold text-white transition hover:bg-[#d9660b] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#173f35]">Open interview</button>
    </form>
  )
}
