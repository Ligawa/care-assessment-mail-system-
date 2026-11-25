'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BarChart3, BriefcaseBusiness, Building2, ClipboardCheck, FileText, Headphones, LogOut, Mail, Mic2, Users, Video } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const logo = 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Care%20Intl%20logo-8dXiV9R7mb3d8yCbmDLtahqHcQJ2Xm.png'
const items = [
  { label: 'Overview', href: '/admin?section=Overview', section: 'Overview', icon: BarChart3 },
  { label: 'Positions', href: '/admin?section=Positions', section: 'Positions', icon: BriefcaseBusiness },
  { label: 'Departments', href: '/admin?section=Departments', section: 'Departments', icon: Building2 },
  { label: 'Assessments', href: '/admin?section=Assessments', section: 'Assessments', icon: ClipboardCheck },
  { label: 'Candidates', href: '/admin?section=Candidates', section: 'Candidates', activePath: '/admin/candidates', icon: Users },
  { label: 'Documents', detail: 'Applicant upload portals', href: '/admin/documents', icon: FileText },
  { label: 'Emails', href: '/admin?section=Emails', section: 'Emails', icon: Mail },
  { label: 'Interviews', detail: 'Live candidate sessions', href: '/admin/interviews', icon: Video },
  { label: 'Call centre', detail: 'AI-assisted recruitment calls', href: '/admin/calls', icon: Headphones },
  { label: 'Skills invites', detail: 'Final screening assessments', href: '/admin/assessments', icon: ClipboardCheck },
  { label: 'Offers', detail: 'Offer letters and responses', href: '/admin/offers', icon: FileText },
  { label: 'Voices', detail: 'Interview voice settings', href: '/admin/interview-voices', icon: Mic2 },
  { label: 'Templates', detail: 'Recruitment email library', href: '/admin/templates', icon: FileText },
]

type AdminSidebarProps = {
  activeSection?: string
  onSectionChange?: (section: string) => void
  userEmail?: string
}

export default function AdminSidebar({ activeSection, onSectionChange, userEmail }: AdminSidebarProps) {
  const pathname = usePathname()
  const supabase = createClient()
  async function logout() {
    await supabase.auth.signOut()
    window.location.href = '/admin/login'
  }

  const currentSection = activeSection ?? ''
  return <aside className="flex w-full shrink-0 flex-col border-b border-[#ded8ca] bg-white lg:sticky lg:top-0 lg:h-screen lg:w-72 lg:border-b-0 lg:border-r">
    <div className="flex items-center justify-between gap-3 border-b border-[#ded8ca] px-5 py-4 lg:min-h-[92px] lg:px-5"><Link href="/admin" aria-label="CARE International admin overview"><img src={logo} alt="CARE International" className="h-12 w-auto object-contain" /></Link><button type="button" onClick={logout} title="Sign out" aria-label="Sign out" className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#ded8ca] bg-white px-3 text-sm font-semibold text-[#101b30] shadow-sm transition hover:bg-[#faf8f2]"><LogOut className="size-4" /><span>Sign out</span></button></div>
    <nav aria-label="Admin navigation" style={{ scrollbarWidth: 'thin', scrollbarColor: '#b0a99b transparent' }} className="flex max-h-[48vh] min-h-0 flex-col gap-2 overflow-y-auto overscroll-contain px-4 py-4 [scrollbar-gutter:stable] lg:max-h-none lg:flex-1 lg:px-3">
      {items.map(item => {
        const Icon = item.icon
        const section = 'section' in item ? item.section : undefined
        const active = section
          ? (activeSection !== undefined || pathname === '/admin') && currentSection === section || Boolean('activePath' in item && item.activePath && pathname.startsWith(item.activePath))
          : pathname === item.href || pathname.startsWith(`${item.href}/`)
        const className = `group flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-semibold transition-colors ${active ? 'bg-[#f47700] text-white shadow-sm' : 'text-[#455c7d] hover:bg-[#faf8f2] hover:text-[#101b30]'}`
        const content = <><Icon className="size-4 shrink-0" strokeWidth={1.8} aria-hidden="true" /><span className="min-w-0"><span className="block">{item.label}</span>{'detail' in item && <span className={`mt-0.5 block text-xs font-normal leading-4 ${active ? 'text-white/80' : 'text-[#7890ad]'}`}>{item.detail}</span>}</span></>

        if (section && onSectionChange) {
          return <button key={item.label} type="button" onClick={() => onSectionChange(section)} aria-pressed={active} className={className}>{content}</button>
        }
        return <Link key={item.label} href={item.href} aria-current={active ? 'page' : undefined} className={className}>{content}</Link>
      })}
    </nav>
    <div className="border-t border-[#ded8ca] px-5 py-4 text-[#455c7d] lg:min-h-[84px]"><p className="text-xs">Signed in as</p><p className="mt-1 break-all text-sm font-semibold text-[#101b30]">{userEmail ?? 'careers@care-international.org'}</p></div>
  </aside>
}
