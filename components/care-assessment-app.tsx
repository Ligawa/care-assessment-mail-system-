'use client'

import { useMemo, useState } from 'react'
import {
  ArrowRight,
  Bell,
  BriefcaseBusiness,
  Check,
  ChevronLeft,
  Clock3,
  Copy,
  FileText,
  Globe2,
  LayoutDashboard,
  Link2,
  ListChecks,
  Menu,
  MoreHorizontal,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  TimerReset,
  Upload,
  Users,
  X,
} from 'lucide-react'

const logoUrl = 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Care%20Intl%20logo-8dXiV9R7mb3d8yCbmDLtahqHcQJ2Xm.png'

type View = 'home' | 'candidate' | 'admin'
type CandidateStep = 'intro' | 'profile' | 'assessment' | 'complete'

const questions = [
  {
    number: 1,
    competency: 'Program leadership',
    prompt: 'You are leading a multi-country response after severe flooding. Local partners report that funding is delayed, while field teams are asking for an immediate scale-up. What is your first 48-hour approach?',
    options: [
      'Pause all activities until funding is formally released.',
      'Map critical risks, agree decision thresholds with partners, and activate a transparent interim plan.',
      'Ask the field teams to proceed and document the decisions later.',
      'Escalate the delay to headquarters and wait for direction.',
    ],
  },
  {
    number: 2,
    competency: 'Safeguarding & accountability',
    prompt: 'A community committee asks your team to share the names of people who received assistance so they can “verify” the distribution. How do you respond?',
    options: [
      'Share the full list because community oversight is always required.',
      'Share only the names of committee members involved in distribution.',
      'Explain the data protection limits and offer a safe, aggregate verification process.',
      'Refuse without explaining the reason to avoid delaying the activity.',
    ],
  },
  {
    number: 3,
    competency: 'People management',
    prompt: 'Two high-performing team members are in sustained conflict and the wider team is becoming less collaborative. What would you do?',
    options: [
      'Move one person to another team immediately.',
      'Hold separate listening conversations, then facilitate a structured resolution conversation.',
      'Ignore the conflict while delivery targets are being met.',
      'Ask the team to vote on who is causing the problem.',
    ],
  },
]

const roles = [
  { title: 'Country Director — Kenya', status: 'Published', applicants: 42, questions: 12, duration: '45 min', updated: 'Today' },
  { title: 'Emergency Response Manager — Somalia', status: 'Draft', applicants: 0, questions: 10, duration: '40 min', updated: 'Yesterday' },
  { title: 'Partnerships & Advocacy Lead — Rwanda', status: 'Published', applicants: 18, questions: 8, duration: '30 min', updated: 'Jun 12, 2025' },
]

function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <img src={logoUrl} alt="Care International" className={compact ? 'h-9 w-auto' : 'h-11 w-auto'} />
      {!compact && <span className="hidden text-xs font-semibold tracking-[0.16em] text-muted-foreground sm:block">INTERNATIONAL</span>}
    </div>
  )
}

function Pill({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: 'neutral' | 'success' | 'orange' }) {
  return <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${tone === 'success' ? 'bg-success/12 text-success' : tone === 'orange' ? 'bg-primary/12 text-primary' : 'bg-muted text-muted-foreground'}`}>{children}</span>
}

function HomeView({ onStart, onAdmin }: { onStart: () => void; onAdmin: () => void }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/80 bg-background/90">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 lg:px-8">
          <Logo />
          <div className="flex items-center gap-3">
            <button onClick={onAdmin} className="hidden rounded-full px-4 py-2 text-sm font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground sm:block">Admin sign in</button>
            <button onClick={onStart} className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90">Enter assessment</button>
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-7xl gap-12 px-5 pb-16 pt-12 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:px-8 lg:pb-24 lg:pt-20">
          <div>
            <Pill tone="orange">CARE International · Talent assessment</Pill>
            <h1 className="mt-6 max-w-2xl text-balance text-5xl font-semibold leading-[1.02] tracking-[-0.055em] text-foreground sm:text-6xl lg:text-7xl">Show us how you make a difference.</h1>
            <p className="mt-6 max-w-xl text-pretty text-lg leading-8 text-muted-foreground">A fair, scenario-based assessment for people who want to help build a world free from poverty and inequality.</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button onClick={onStart} className="group flex items-center justify-center gap-3 rounded-full bg-primary px-6 py-3.5 font-semibold text-primary-foreground transition hover:gap-4 hover:opacity-90">Start with an access code <ArrowRight className="size-4" /></button>
              <button onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })} className="rounded-full border border-border bg-background px-6 py-3.5 font-semibold text-foreground transition hover:bg-muted">How it works</button>
            </div>
            <div className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-2"><ShieldCheck className="size-4 text-success" /> Secure & confidential</span>
              <span className="flex items-center gap-2"><Clock3 className="size-4 text-success" /> Timed assessment</span>
              <span className="flex items-center gap-2"><Globe2 className="size-4 text-success" /> Global opportunities</span>
            </div>
          </div>
          <div className="relative overflow-hidden rounded-[2rem] bg-primary p-6 text-primary-foreground shadow-2xl shadow-primary/15 sm:p-8">
            <div className="absolute -right-16 -top-16 size-48 rounded-full border-[24px] border-primary-foreground/10" />
            <div className="absolute -bottom-20 -left-16 size-56 rounded-full border-[28px] border-primary-foreground/10" />
            <div className="relative flex min-h-[370px] flex-col justify-between">
              <div className="flex items-center justify-between"><span className="text-sm font-semibold tracking-wide text-primary-foreground/80">ASSESSMENT PREVIEW</span><span className="rounded-full bg-primary-foreground/15 px-3 py-1 text-xs font-semibold">45:00</span></div>
              <div className="rounded-2xl bg-background p-5 text-foreground shadow-xl sm:p-6">
                <div className="flex items-center justify-between"><Pill tone="orange">Scenario 01</Pill><span className="text-xs font-medium text-muted-foreground">1 of 12</span></div>
                <p className="mt-5 text-lg font-semibold leading-7">A partner organisation reports that a project target is no longer realistic due to changing local conditions. What is your next step?</p>
                <div className="mt-5 flex flex-col gap-2">
                  {['Review the evidence with the partner and agree an adaptive plan.', 'Continue with the existing target to protect accountability.', 'Wait for the next quarterly review.'].map((item, index) => <div key={item} className={`flex items-center gap-3 rounded-xl border p-3 text-sm ${index === 0 ? 'border-primary bg-primary/8' : 'border-border'}`}><span className={`flex size-5 items-center justify-center rounded-full border text-[10px] font-bold ${index === 0 ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-muted-foreground'}`}>{index === 0 ? <Check className="size-3" /> : String.fromCharCode(66 + index)}</span>{item}</div>)}
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm text-primary-foreground/75"><TimerReset className="size-4" /> Your time and progress are always visible.</div>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="border-y border-border bg-card">
          <div className="mx-auto max-w-7xl px-5 py-16 lg:px-8 lg:py-20">
            <div className="max-w-xl"><p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">Designed for clarity</p><h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">A simple process, built around your best work.</h2></div>
            <div className="mt-10 grid gap-8 md:grid-cols-3">
              {[{ icon: Link2, title: 'Use your access code', body: 'Open the secure assessment link shared by the hiring team and enter your unique code.' }, { icon: Users, title: 'Tell us about you', body: 'Complete your candidate profile and upload a passport-size photo before you begin.' }, { icon: ListChecks, title: 'Think in scenarios', body: 'Work through complex, role-relevant situations at your own pace within the time limit.' }].map(({ icon: Icon, title, body }, index) => <div key={title} className="border-t-2 border-primary pt-5"><div className="flex items-center gap-3"><span className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">0{index + 1}</span><Icon className="size-5 text-primary" /></div><h3 className="mt-5 text-lg font-semibold">{title}</h3><p className="mt-2 leading-7 text-muted-foreground">{body}</p></div>)}
            </div>
          </div>
        </section>
      </main>
      <footer className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between lg:px-8"><Logo compact /><p>We will get back to you within 24 hours after review.</p></footer>
    </div>
  )
}

function CandidateFlow({ onBack }: { onBack: () => void }) {
  const [step, setStep] = useState<CandidateStep>('intro')
  const [code, setCode] = useState('CARE-KENYA-7X4P')
  const [selected, setSelected] = useState<Record<number, number>>({})
  const [profile, setProfile] = useState({ name: '', location: '', experience: '', email: '', photo: '' })
  const [deployment, setDeployment] = useState('Yes, I am available')
  const [availability, setAvailability] = useState('Within 1 month')
  const [salary, setSalary] = useState('')
  const [seconds, setSeconds] = useState(2700)
  const progress = step === 'assessment' ? Math.round((Object.keys(selected).length / questions.length) * 100) : step === 'complete' ? 100 : 0

  const timeLabel = useMemo(() => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`, [seconds])

  if (step === 'complete') return <div className="min-h-screen bg-background"><header className="border-b border-border bg-card"><div className="mx-auto max-w-5xl px-5 py-5"><Logo /></div></header><main className="mx-auto flex max-w-2xl flex-col items-center px-5 py-16 text-center"><div className="flex size-16 items-center justify-center rounded-full bg-success/12 text-success"><Check className="size-8" /></div><p className="mt-7 text-sm font-semibold uppercase tracking-[0.16em] text-primary">Assessment submitted</p><h1 className="mt-3 text-4xl font-semibold tracking-tight">Thank you, {profile.name || 'candidate'}.</h1><p className="mt-4 leading-7 text-muted-foreground">Your assessment has been received. Share this reference number with the hiring team so they can locate your submission.</p><div className="mt-8 flex w-full items-center justify-between rounded-2xl border border-border bg-card p-5 text-left"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Reference number</p><p className="mt-2 font-mono text-xl font-bold">CARE-2025-08421</p></div><button className="rounded-full border border-border p-3 text-muted-foreground hover:bg-muted" aria-label="Copy reference number"><Copy className="size-4" /></button></div><div className="mt-6 w-full rounded-2xl bg-primary/8 p-5 text-left"><p className="font-semibold">Country Director — Kenya</p><p className="mt-1 text-sm text-muted-foreground">Indicative salary range: <span className="font-semibold text-foreground">USD 72,000 – 84,000 annually</span></p></div><button onClick={() => window.print()} className="mt-8 flex items-center gap-2 rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground"><FileText className="size-4" /> Print reference</button><p className="mt-6 text-sm text-muted-foreground">The hiring team will get back to you within 24 hours.</p></main></div>

  return <div className="min-h-screen bg-background"><header className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur"><div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4"><Logo compact /><div className="flex items-center gap-4 text-sm"><span className="hidden text-muted-foreground sm:block">Country Director — Kenya</span>{step === 'assessment' && <span className="flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 font-mono font-semibold text-primary"><Clock3 className="size-4" /> {timeLabel}</span>}</div></div></header><main className="mx-auto max-w-3xl px-5 py-10">
    {step === 'intro' && <div><button onClick={onBack} className="mb-10 flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground"><ChevronLeft className="size-4" /> Back to overview</button><Pill tone="orange">Secure candidate portal</Pill><h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">Enter your access code to begin.</h1><p className="mt-4 max-w-xl leading-7 text-muted-foreground">You will have 45 minutes to complete 12 scenario-based questions. Please have your details and a passport-size photo ready.</p><div className="mt-8 rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8"><label className="text-sm font-semibold" htmlFor="code">Assessment access code</label><div className="mt-3 flex flex-col gap-3 sm:flex-row"><input id="code" value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} className="h-12 flex-1 rounded-xl border border-input bg-background px-4 font-mono text-sm uppercase outline-none ring-primary/20 focus:ring-4" /><button onClick={() => setStep('profile')} className="flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-6 font-semibold text-primary-foreground">Continue <ArrowRight className="size-4" /></button></div><div className="mt-6 flex gap-3 rounded-xl bg-primary/8 p-4 text-sm leading-6 text-muted-foreground"><ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" /> Your responses are confidential and will only be used for this recruitment process.</div></div></div>}
    {step === 'profile' && <div><Pill tone="orange">Step 1 of 2</Pill><h1 className="mt-5 text-4xl font-semibold tracking-tight">Before you begin</h1><p className="mt-4 leading-7 text-muted-foreground">Please complete your candidate profile. All fields are required to start the assessment.</p><div className="mt-8 rounded-3xl border border-border bg-card p-6 sm:p-8"><div className="grid gap-5 sm:grid-cols-2"><label className="flex flex-col gap-2 text-sm font-semibold">Full name<input value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} placeholder="e.g. Amina Hassan" className="h-12 rounded-xl border border-input bg-background px-4 font-normal outline-none focus:ring-4 focus:ring-primary/15" /></label><label className="flex flex-col gap-2 text-sm font-semibold">Email address<input type="email" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} placeholder="you@example.org" className="h-12 rounded-xl border border-input bg-background px-4 font-normal outline-none focus:ring-4 focus:ring-primary/15" /></label><label className="flex flex-col gap-2 text-sm font-semibold">Current location<input value={profile.location} onChange={(e) => setProfile({ ...profile, location: e.target.value })} placeholder="City, Country" className="h-12 rounded-xl border border-input bg-background px-4 font-normal outline-none focus:ring-4 focus:ring-primary/15" /></label><label className="flex flex-col gap-2 text-sm font-semibold">Years of experience<select value={profile.experience} onChange={(e) => setProfile({ ...profile, experience: e.target.value })} className="h-12 rounded-xl border border-input bg-background px-4 font-normal outline-none focus:ring-4 focus:ring-primary/15"><option value="">Select experience</option><option>1–3 years</option><option>4–6 years</option><option>7–10 years</option><option>10+ years</option></select></label></div><div className="mt-6"><p className="text-sm font-semibold">Passport-size photo</p><label className="mt-2 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-primary/40 bg-primary/5 px-6 py-8 text-center"><Upload className="size-6 text-primary" /><span className="text-sm font-semibold">Upload a clear photo</span><span className="text-xs text-muted-foreground">JPG or PNG · Maximum 5 MB</span><input type="file" accept="image/png,image/jpeg" className="sr-only" onChange={(e) => setProfile({ ...profile, photo: e.target.files?.[0]?.name || '' })} />{profile.photo && <Pill tone="success">{profile.photo}</Pill>}</label></div><button onClick={() => setStep('assessment')} className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 font-semibold text-primary-foreground">Save profile & start assessment <ArrowRight className="size-4" /></button></div></div>}
    {step === 'assessment' && <div><div className="flex items-center justify-between"><div><Pill tone="orange">Question {Object.keys(selected).length + 1} of {questions.length}</Pill><p className="mt-3 text-sm font-medium text-muted-foreground">{questions[Math.min(Object.keys(selected).length, questions.length - 1)].competency}</p></div><span className="text-sm font-semibold text-primary">{progress}% complete</span></div><div className="mt-4 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary transition-all" style={{ width: `${Math.max(8, progress)}%` }} /></div><div className="mt-8 rounded-3xl border border-border bg-card p-6 sm:p-8"><h1 className="text-2xl font-semibold leading-9 sm:text-3xl">{questions[Math.min(Object.keys(selected).length, questions.length - 1)].prompt}</h1><div className="mt-8 flex flex-col gap-3">{questions[Math.min(Object.keys(selected).length, questions.length - 1)].options.map((option, index) => <button key={option} onClick={() => setSelected({ ...selected, [Math.min(Object.keys(selected).length, questions.length - 1)]: index })} className={`flex items-start gap-4 rounded-2xl border p-4 text-left transition ${selected[Math.min(Object.keys(selected).length, questions.length - 1)] === index ? 'border-primary bg-primary/8' : 'border-border hover:border-primary/50'}`}><span className={`flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${selected[Math.min(Object.keys(selected).length, questions.length - 1)] === index ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-muted-foreground'}`}>{String.fromCharCode(65 + index)}</span><span className="text-sm leading-6">{option}</span></button>)}</div><div className="mt-8 flex justify-between border-t border-border pt-6"><button className="rounded-full px-4 py-2 text-sm font-semibold text-muted-foreground hover:bg-muted">Flag question</button><button onClick={() => Object.keys(selected).length >= questions.length ? setStep('complete') : setSelected({ ...selected, [Object.keys(selected).length]: selected[Object.keys(selected).length] ?? 0 })} className="flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">{Object.keys(selected).length >= questions.length ? 'Submit assessment' : 'Save & continue'} <ArrowRight className="size-4" /></button></div></div></div>}
  </main></div>
}

function AdminView({ onBack }: { onBack: () => void }) {
  const [active, setActive] = useState('Overview')
  const [showCreate, setShowCreate] = useState(false)
  const [copied, setCopied] = useState(false)
  const nav = [{ label: 'Overview', icon: LayoutDashboard }, { label: 'Assessments', icon: ListChecks }, { label: 'Candidates', icon: Users }, { label: 'Settings', icon: Settings2 }]
  return <div className="min-h-screen bg-muted/45"><aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-border bg-card lg:block"><div className="p-6"><Logo compact /><div className="mt-10 flex flex-col gap-1">{nav.map(({ label, icon: Icon }) => <button key={label} onClick={() => setActive(label)} className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold ${active === label ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}><Icon className="size-4" /> {label}</button>)}</div></div><div className="absolute bottom-6 left-6 right-6 rounded-2xl bg-primary/8 p-4"><p className="text-xs font-bold uppercase tracking-[0.13em] text-primary">Admin access</p><p className="mt-2 text-xs leading-5 text-muted-foreground">Only verified @care-intrenational.org accounts can manage assessments.</p></div></aside><div className="lg:pl-64"><header className="border-b border-border bg-card"><div className="flex items-center justify-between px-5 py-4 lg:px-8"><div className="flex items-center gap-3"><button onClick={onBack} className="rounded-full p-2 text-muted-foreground hover:bg-muted lg:hidden"><Menu className="size-5" /></button><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Care assessment hub</p><h1 className="mt-1 text-xl font-semibold">{active}</h1></div></div><div className="flex items-center gap-3"><button className="rounded-full p-2 text-muted-foreground hover:bg-muted"><Bell className="size-5" /></button><div className="flex size-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">AM</div></div></div></header><main className="mx-auto max-w-7xl p-5 lg:p-8">{active === 'Overview' ? <><div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><Pill tone="orange">Wednesday, 18 June 2025</Pill><h2 className="mt-3 text-3xl font-semibold tracking-tight">Good morning, Amina.</h2><p className="mt-2 text-muted-foreground">Here is how your assessment programme is performing.</p></div><button onClick={() => setShowCreate(true)} className="flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"><Plus className="size-4" /> Create assessment</button></div><div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[{ label: 'Active assessments', value: '08', change: '+2 this month', icon: BriefcaseBusiness }, { label: 'Candidate submissions', value: '127', change: '+18.4% vs last month', icon: Users }, { label: 'Average completion', value: '84%', change: '+6.2% this month', icon: ListChecks }, { label: 'Avg. review time', value: '1.8d', change: 'Within target', icon: TimerReset }].map(({ label, value, change, icon: Icon }) => <div key={label} className="rounded-2xl border border-border bg-card p-5"><div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">{label}</span><Icon className="size-4 text-primary" /></div><p className="mt-5 text-3xl font-semibold tracking-tight">{value}</p><p className="mt-2 text-xs font-semibold text-success">{change}</p></div>)}</div><div className="mt-8 grid gap-6 xl:grid-cols-[1.4fr_1fr]"><div className="rounded-2xl border border-border bg-card"><div className="flex items-center justify-between border-b border-border p-5"><div><h3 className="font-semibold">Recent assessments</h3><p className="mt-1 text-sm text-muted-foreground">Manage role-specific assessment links.</p></div><button onClick={() => setActive('Assessments')} className="text-sm font-semibold text-primary">View all</button></div><div className="divide-y divide-border">{roles.map((role) => <div key={role.title} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-3"><div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><BriefcaseBusiness className="size-5" /></div><div><p className="font-semibold">{role.title}</p><div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground"><Pill tone={role.status === 'Published' ? 'success' : 'neutral'}>{role.status}</Pill><span>{role.questions} questions</span><span>·</span><span>{role.duration}</span></div></div></div><div className="flex items-center gap-4 text-sm"><div className="hidden text-right sm:block"><p className="font-semibold">{role.applicants}</p><p className="text-xs text-muted-foreground">applicants</p></div><button className="rounded-full p-2 text-muted-foreground hover:bg-muted"><MoreHorizontal className="size-4" /></button></div></div>)}</div></div><div className="rounded-2xl border border-border bg-card p-5"><div className="flex items-center justify-between"><div><h3 className="font-semibold">Assessment link</h3><p className="mt-1 text-sm text-muted-foreground">Country Director — Kenya</p></div><Link2 className="size-5 text-primary" /></div><div className="mt-6 rounded-xl border border-border bg-muted/50 p-4"><p className="break-all font-mono text-xs text-muted-foreground">assess.care.org/start/CARE-KENYA-7X4P</p></div><button onClick={() => { setCopied(true); setTimeout(() => setCopied(false), 1500) }} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-border py-3 text-sm font-semibold hover:bg-muted"><Copy className="size-4" /> {copied ? 'Copied to clipboard' : 'Copy assessment link'}</button><div className="mt-7 border-t border-border pt-5"><p className="text-xs font-semibold uppercase tracking-[0.13em] text-muted-foreground">AI assistant</p><div className="mt-3 flex gap-3"><div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary"><Sparkles className="size-4" /></div><p className="text-sm leading-6 text-muted-foreground">Generate complex, role-relevant scenarios with Gemini, then review and edit before publishing.</p></div></div></div></div></> : <div className="rounded-2xl border border-border bg-card p-8"><div className="flex items-center justify-between"><div><h2 className="text-2xl font-semibold">{active}</h2><p className="mt-2 text-muted-foreground">This workspace is ready for your assessment programme.</p></div><button onClick={() => setShowCreate(true)} className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"><Plus className="size-4" /> Create assessment</button></div><div className="mt-8 grid gap-4">{roles.map((role) => <div key={role.title} className="flex items-center justify-between rounded-xl border border-border p-4"><div><p className="font-semibold">{role.title}</p><p className="mt-1 text-sm text-muted-foreground">{role.questions} questions · {role.duration} · {role.applicants} applicants</p></div><Pill tone={role.status === 'Published' ? 'success' : 'neutral'}>{role.status}</Pill></div>)}</div></div>}{showCreate && <div className="fixed inset-0 z-20 flex items-center justify-center bg-foreground/30 p-5"><div className="w-full max-w-xl rounded-3xl border border-border bg-card p-6 shadow-2xl sm:p-8"><div className="flex items-start justify-between"><div><Pill tone="orange">New assessment</Pill><h2 className="mt-4 text-2xl font-semibold">Set up a role assessment</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Create the brief first. You can generate and edit questions before publishing.</p></div><button onClick={() => setShowCreate(false)} className="rounded-full p-2 text-muted-foreground hover:bg-muted"><X className="size-5" /></button></div><div className="mt-6 flex flex-col gap-4"><label className="flex flex-col gap-2 text-sm font-semibold">Role or open position<input placeholder="e.g. Emergency Response Manager — Somalia" className="h-12 rounded-xl border border-input bg-background px-4 font-normal outline-none focus:ring-4 focus:ring-primary/15" /></label><div className="grid gap-4 sm:grid-cols-2"><label className="flex flex-col gap-2 text-sm font-semibold">Number of questions<select className="h-12 rounded-xl border border-input bg-background px-4 font-normal"><option>10 questions</option><option>12 questions</option><option>15 questions</option></select></label><label className="flex flex-col gap-2 text-sm font-semibold">Time limit<select className="h-12 rounded-xl border border-input bg-background px-4 font-normal"><option>30 minutes</option><option>45 minutes</option><option>60 minutes</option></select></label></div><label className="flex flex-col gap-2 text-sm font-semibold">Salary range<input placeholder="e.g. USD 72,000 – 84,000 annually" className="h-12 rounded-xl border border-input bg-background px-4 font-normal outline-none focus:ring-4 focus:ring-primary/15" /></label></div><div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button onClick={() => setShowCreate(false)} className="rounded-xl px-5 py-3 text-sm font-semibold text-muted-foreground hover:bg-muted">Save as draft</button><button onClick={() => setShowCreate(false)} className="flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"><Sparkles className="size-4" /> Generate questions</button></div></div></div>}</main></div></div>
}

export default function CareAssessmentApp() {
  const [view, setView] = useState<View>('home')
  return view === 'home' ? <HomeView onStart={() => setView('candidate')} onAdmin={() => setView('admin')} /> : view === 'candidate' ? <CandidateFlow onBack={() => setView('home')} /> : <AdminView onBack={() => setView('home')} />
}
