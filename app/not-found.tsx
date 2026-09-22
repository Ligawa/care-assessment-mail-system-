'use client'

import Link from 'next/link'
import { ArrowLeft, Compass, Home, Search } from 'lucide-react'

export default function NotFound() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f8f8f4] px-6 py-8 text-[#173f35] sm:px-10 sm:py-10">
      <div className="pointer-events-none absolute -right-24 -top-24 size-80 rounded-full bg-[#f07818]/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -left-24 size-96 rounded-full bg-[#173f35]/10 blur-3xl" />
      <div className="relative mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl flex-col">
        <header className="flex items-center justify-between">
          <Link href="/" aria-label="CARE International home" className="rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#f07818]">
            <img src="/care-logo.png" alt="CARE International" className="h-12 w-auto sm:h-14" />
          </Link>
          <span className="hidden text-sm font-medium text-[#5d7169] sm:block">Candidate portal</span>
        </header>
        <section className="flex flex-1 items-center py-16">
          <div className="grid w-full items-center gap-12 lg:grid-cols-[1fr_0.85fr]">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.24em] text-[#f07818]">Error 404</p>
              <h1 className="mt-5 max-w-xl text-5xl font-semibold tracking-[-0.04em] text-[#173f35] sm:text-7xl">This page took a wrong turn.</h1>
              <p className="mt-6 max-w-lg text-lg leading-8 text-[#5d7169]">The page you are looking for may have moved, expired, or never existed. Let&apos;s get you back to the CARE International portal.</p>
              <div className="mt-9 flex flex-wrap gap-3">
                <Link href="/" className="inline-flex items-center gap-2 rounded-full bg-[#f07818] px-5 py-3 font-semibold text-white shadow-lg shadow-[#f07818]/20 transition hover:bg-[#d9660b] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#173f35]"><Home className="size-4" /> Go to home</Link>
                <button type="button" onClick={() => window.history.back()} className="inline-flex items-center gap-2 rounded-full border border-[#d9ded8] bg-white px-5 py-3 font-semibold text-[#173f35] transition hover:border-[#173f35] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#f07818]"><ArrowLeft className="size-4" /> Go back</button>
              </div>
            </div>
            <div className="relative mx-auto w-full max-w-md">
              <div className="rounded-[2rem] border border-[#dfe5df] bg-white p-6 shadow-[0_24px_70px_rgba(23,63,53,0.12)] sm:p-8">
                <div className="flex items-center justify-between border-b border-[#edf0eb] pb-5"><div className="grid size-12 place-items-center rounded-2xl bg-[#173f35] text-white"><Compass className="size-6" /></div><span className="text-8xl font-semibold tracking-[-0.08em] text-[#f07818]/20">404</span></div>
                <div className="mt-8"><Search className="size-7 text-[#f07818]" /><h2 className="mt-4 text-2xl font-semibold">Need a fresh start?</h2><p className="mt-2 leading-7 text-[#5d7169]">Return to the portal to continue an assessment, interview, or application.</p></div>
              </div>
            </div>
          </div>
        </section>
        <footer className="border-t border-[#dfe5df] pt-5 text-sm text-[#78908a]">CARE International · Recruitment and assessment portal</footer>
      </div>
    </main>
  )
}
