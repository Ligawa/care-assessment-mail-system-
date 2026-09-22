'use client'

import Link from 'next/link'

export default function GlobalError() {
  return <html lang="en"><body className="bg-[#f8f8f4] text-[#173f35]"><main className="grid min-h-screen place-items-center px-6 text-center"><div><img src="/care-logo.png" alt="CARE International" className="mx-auto h-14 w-auto" /><p className="mt-10 text-sm font-bold uppercase tracking-[0.24em] text-[#f07818]">Service unavailable</p><h1 className="mt-4 text-4xl font-semibold">We&apos;re restoring this page.</h1><p className="mx-auto mt-4 max-w-md leading-7 text-[#5d7169]">Please try again shortly or return to the CARE International portal.</p><Link href="/" className="mt-8 inline-flex rounded-full bg-[#f07818] px-5 py-3 font-semibold text-white">Go to home</Link></div></main></body></html>
}
