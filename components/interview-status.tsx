import type { ReactNode } from 'react'
import Link from 'next/link'
import { CheckCircle2, KeyRound } from 'lucide-react'

export default function InterviewStatus({ variant, title, message, children }: { variant: 'completed' | 'invalid'; title: string; message: string; children?: ReactNode }) {
  const Icon = variant === 'completed' ? CheckCircle2 : KeyRound
  return (
    <main className="min-h-screen bg-[#f8f8f4] px-6 py-8 text-[#173f35] sm:px-10">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-3xl flex-col">
        <header className="flex items-center justify-between">
          <Link href="/" aria-label="CARE International home" className="rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#f07818]">
            <img src="/care-logo.png" alt="CARE International" className="h-12 w-auto" />
          </Link>
          <span className="text-sm font-medium text-[#5d7169]">Interview portal</span>
        </header>
        <section className="flex flex-1 items-center py-12">
          <div className="w-full rounded-[2rem] border border-[#dfe5df] bg-white p-6 shadow-[0_24px_70px_rgba(23,63,53,0.12)] sm:p-10">
            <div className={`grid size-12 place-items-center rounded-2xl text-white ${variant === 'completed' ? 'bg-[#173f35]' : 'bg-[#f07818]'}`}><Icon className="size-6" aria-hidden="true" /></div>
            <h1 className="mt-6 text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
            <p className="mt-4 text-lg leading-8 text-[#5d7169]">{message}</p>
            {children ? <div className="mt-8">{children}</div> : null}
            <p className="mt-8 border-t border-[#edf0eb] pt-5 text-sm leading-6 text-[#78908a]">Need help? Reply to your invitation email or write to careers@care-intrenational.org and include your full name.</p>
          </div>
        </section>
      </div>
    </main>
  )
}
