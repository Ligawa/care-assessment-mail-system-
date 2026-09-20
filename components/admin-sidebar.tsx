'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BarChart3, BriefcaseBusiness, Building2, ClipboardCheck, LogOut, Mail, Mic2, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const logo = 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Care%20Intl%20logo-8dXiV9R7mb3d8yCbmDLtahqHcQJ2Xm.png'
const items = [
  { label: 'Overview', href: '/admin', icon: BarChart3 },
  { label: 'Positions', href: '/admin?section=Positions', icon: BriefcaseBusiness },
  { label: 'Departments', href: '/admin?section=Departments', icon: Building2 },
  { label: 'Assessments', href: '/admin?section=Assessments', icon: ClipboardCheck },
  { label: 'Candidates', href: '/admin?section=Candidates', icon: Users },
  { label: 'Emails', href: '/admin?section=Emails', icon: Mail },
  { label: 'Interview voices', href: '/admin/interview-voices', icon: Mic2 },
]

export default function AdminSidebar() {
  const pathname = usePathname()
  const supabase = createClient()
  async function logout() { await supabase.auth.signOut(); window.location.href = '/admin/login' }
  return <aside className="flex w-full shrink-0 flex-col border-b border-border bg-card lg:sticky lg:top-0 lg:h-screen lg:w-64 lg:border-b-0 lg:border-r">
    <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-5"><Link href="/admin"><img src={logo} alt="CARE International" className="h-10 w-auto" /></Link><button type="button" onClick={logout} title="Sign out" aria-label="Sign out" className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-background px-3 text-sm font-semibold text-foreground shadow-sm hover:bg-muted"><LogOut className="size-4" /><span className="hidden sm:inline">Sign out</span></button></div>
    <nav className="flex gap-2 overflow-x-auto p-4 lg:flex-col">{items.map(item => { const Icon = item.icon; const active = item.href === '/admin/interview-voices' ? pathname === item.href : pathname === '/admin' && item.href.includes('section=') ? false : item.href === '/admin' && pathname === '/admin'; return <Link key={item.label} href={item.href} aria-current={active ? 'page' : undefined} className={`group flex items-center gap-3 rounded-xl border px-3 py-3 text-left text-sm font-semibold transition-all ${active ? 'border-primary/30 bg-primary text-primary-foreground shadow-lg shadow-primary/20' : 'border-transparent text-muted-foreground hover:border-border hover:bg-muted hover:text-foreground'}`}><Icon className="size-4 transition-transform group-hover:scale-110" />{item.label}</Link> })}</nav>
  </aside>
}
