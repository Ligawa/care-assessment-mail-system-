'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BarChart3, BriefcaseBusiness, Building2, ClipboardCheck, LogOut, Mail, Mic2, Users, Video } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const logo = 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Care%20Intl%20logo-8dXiV9R7mb3d8yCbmDLtahqHcQJ2Xm.png'
const items = [
  { label: 'Overview', href: '/admin', icon: BarChart3 },
  { label: 'Positions', href: '/admin?section=Positions', icon: BriefcaseBusiness },
  { label: 'Departments', href: '/admin?section=Departments', icon: Building2 },
  { label: 'Assessments', href: '/admin?section=Assessments', icon: ClipboardCheck },
  { label: 'Candidates', href: '/admin?section=Candidates', icon: Users },
  { label: 'Emails', href: '/admin?section=Emails', icon: Mail },
  { label: 'Interviews', detail: 'Live candidate sessions', href: '/admin/interviews', icon: Video },
  { label: 'Voices', detail: 'Select Emmy Nana voice', href: '/admin/interview-voices', icon: Mic2 },
]

export default function AdminSidebar() {
  const pathname = usePathname()
  const supabase = createClient()
  async function logout() { await supabase.auth.signOut(); window.location.href = '/admin/login' }
  return <aside className="flex w-full shrink-0 flex-col border-b border-[#ded8ca] bg-white lg:sticky lg:top-0 lg:h-screen lg:w-[378px] lg:border-b-0 lg:border-r">
    <div className="flex items-center justify-between gap-4 border-b border-[#ded8ca] px-6 py-7 lg:h-[205px] lg:px-7"><Link href="/admin"><img src={logo} alt="CARE International" className="h-16 w-auto object-contain" /></Link><button type="button" onClick={logout} title="Sign out" aria-label="Sign out" className="inline-flex min-h-[54px] items-center gap-3 rounded-[20px] border border-[#ded8ca] bg-white px-5 text-[18px] font-semibold text-[#101b30] shadow-[0_2px_5px_rgba(16,27,48,0.12)] transition hover:bg-[#faf8f2]"><LogOut className="size-5" /><span>Sign out</span></button></div>
    <nav className="flex flex-1 gap-2 overflow-x-auto px-5 py-6 lg:flex-col lg:gap-2 lg:px-5 lg:py-6">{items.map(item => { const Icon = item.icon; const active = item.href === '/admin/interview-voices' || item.href === '/admin/interviews' ? pathname === item.href : pathname === '/admin' && item.href.includes('section=') ? false : item.href === '/admin' && pathname === '/admin'; return <Link key={item.label} href={item.href} aria-current={active ? 'page' : undefined} className={`group flex min-h-[68px] items-center gap-5 rounded-[27px] px-5 text-left text-[20px] font-semibold transition-all ${active ? 'bg-[#f47700] text-white shadow-[0_10px_18px_rgba(244,119,0,0.2)]' : 'text-[#455c7d] hover:bg-[#faf8f2] hover:text-[#101b30]'}`}><Icon className="size-6 shrink-0" strokeWidth={1.8} /><span className="min-w-0"><span className="block">{item.label}</span>{'detail' in item && <span className={`mt-0.5 block text-xs font-normal leading-4 ${active ? 'text-white/80' : 'text-[#7890ad]'}`}>{item.detail}</span>}</span></Link> })}</nav>
    <div className="border-t border-[#ded8ca] px-6 py-7 text-[#455c7d] lg:min-h-[118px]"><p className="text-[17px]">Signed in as</p><p className="mt-2 break-all text-[18px] font-bold text-[#101b30]">careers@care-international.org</p></div>
  </aside>
}
