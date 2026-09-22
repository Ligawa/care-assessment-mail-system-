'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle, Home, RefreshCw } from 'lucide-react'

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Keep production errors out of the page while allowing Next.js to report them.
  }, [])

  return (
    <main className="min-h-screen bg-[#f8f8f4] px-6 py-8 text-[#173f35] sm:px-10 sm:py-10">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-3xl flex-col">
        <header><Link href="/" aria-label="CARE International home" className="rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#f07818]"><img src="/care-logo.png" alt="CARE International" className="h-12 w-auto sm:h-14" /></Link></header>
        <section className="flex flex-1 items-center justify-center py-16"><div className="w-full rounded-[2rem] border border-[#dfe5df] bg-white p-8 text-center shadow-[0_24px_70px_rgba(23,63,53,0.1)] sm:p-14"><div className="mx-auto grid size-16 place-items-center rounded-2xl bg-[#fff0e5] text-[#f07818]"><AlertTriangle className="size-8" /></div><p className="mt-7 text-sm font-bold uppercase tracking-[0.24em] text-[#f07818]">Something went wrong</p><h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">We couldn&apos;t load this page.</h1><p className="mx-auto mt-5 max-w-xl text-lg leading-8 text-[#5d7169]">There was a temporary problem with the CARE International portal. Try again, or return home and continue when you&apos;re ready.</p><div className="mt-8 flex flex-wrap justify-center gap-3"><button type="button" onClick={() => reset()} className="inline-flex items-center gap-2 rounded-full bg-[#f07818] px-5 py-3 font-semibold text-white shadow-lg shadow-[#f07818]/20 transition hover:bg-[#d9660b] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#173f35]"><RefreshCw className="size-4" /> Try again</button><Link href="/" className="inline-flex items-center gap-2 rounded-full border border-[#d9ded8] px-5 py-3 font-semibold transition hover:border-[#173f35] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#f07818]"><Home className="size-4" /> Go to home</Link></div></div></section>
        <footer className="border-t border-[#dfe5df] pt-5 text-sm text-[#78908a]">CARE International · Recruitment and assessment portal</footer>
      </div>
    </main>
  )
}
