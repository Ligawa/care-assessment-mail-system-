import Link from 'next/link'
import { ArrowRight, AlertTriangle, CheckCircle2, FileCheck2, FileText, Mic2, Send } from 'lucide-react'
import type { PipelineStats } from '@/lib/pipeline-stats'

function Stat({ label, value, tone = 'default', href }: { label: string; value: number; tone?: 'default' | 'good' | 'warn' | 'bad'; href?: string }) {
  const color = tone === 'good' ? 'text-primary' : tone === 'warn' ? 'text-amber-600' : tone === 'bad' ? 'text-destructive' : 'text-foreground'
  const body = <><p className={`text-2xl font-semibold tabular-nums ${color}`}>{value}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{label}</p></>
  const className = 'rounded-2xl border border-border bg-background p-4'
  return href ? <Link href={href} className={`${className} transition hover:border-primary/50`}>{body}</Link> : <div className={className}>{body}</div>
}

function StageCard({ icon: Icon, title, href, linkLabel, children }: { icon: typeof FileText; title: string; href?: string; linkLabel?: string; children: React.ReactNode }) {
  return <section className="rounded-3xl border border-border bg-card p-6">
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-3"><span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon className="size-4" /></span><h2 className="font-semibold">{title}</h2></div>
      {href && <Link href={href} className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">{linkLabel}<ArrowRight className="size-3.5" /></Link>}
    </div>
    <div className="mt-5 grid grid-cols-2 gap-3">{children}</div>
  </section>
}

export default function PipelineOverview({ stats, onOpenCandidates }: { stats: PipelineStats; onOpenCandidates: () => void }) {
  const top = Math.max(stats.funnel[0]?.value ?? 0, 1)
  const formatDate = (value: string) => new Date(value).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
  return <div className="flex flex-col gap-5">
    <section className="rounded-3xl border border-border bg-card p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><p className="text-xs font-semibold uppercase tracking-widest text-primary">Hiring pipeline</p><h2 className="mt-1 text-xl font-semibold">Applicants at every stage</h2></div>
        <p className="text-sm text-muted-foreground">Bars are scaled against total document invites.</p>
      </div>
      <ol className="mt-6 flex flex-col gap-4">
        {stats.funnel.map((stage, index) => {
          const width = Math.max((stage.value / top) * 100, stage.value > 0 ? 2 : 0)
          return <li key={stage.label}>
            <div className="flex items-baseline justify-between gap-3 text-sm"><span className="font-medium"><span className="mr-2 text-muted-foreground tabular-nums">{index + 1}.</span>{stage.label}</span><span className="font-semibold tabular-nums">{stage.value}</span></div>
            <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-muted" role="img" aria-label={`${stage.label}: ${stage.value}`}><div className="h-full rounded-full bg-primary" style={{ width: `${width}%` }} /></div>
            <p className="mt-1 text-xs text-muted-foreground">{stage.hint}</p>
          </li>
        })}
      </ol>
    </section>

    <div className="grid gap-5 xl:grid-cols-3">
      <StageCard icon={FileText} title="Documents" href="/admin/documents" linkLabel="Open documents">
        <Stat label="Invites sent" value={stats.documents.invited} />
        <Stat label="Awaiting upload" value={stats.documents.awaiting} tone="warn" />
        <Stat label="Partially received" value={stats.documents.partial} tone="warn" />
        <Stat label="Fully received" value={stats.documents.received} tone="good" />
        <Stat label="Overdue" value={stats.documents.overdue} tone={stats.documents.overdue ? 'bad' : 'default'} />
        <Stat label="Ready for interview invite" value={stats.documents.readyForInterview} tone="good" />
      </StageCard>
      <StageCard icon={Mic2} title="AI interviews" href="/admin/interviews" linkLabel="Review interviews">
        <Stat label="Invited" value={stats.interviews.invited} />
        <Stat label="Completed" value={stats.interviews.completed} tone="good" />
        <Stat label="Awaiting HR decision" value={stats.interviews.awaitingDecision} tone="warn" />
        <Stat label="Passed" value={stats.interviews.passed} tone="good" />
        <Stat label="Not passed" value={stats.interviews.failed} />
        <Stat label="Link expired, not completed" value={stats.interviews.overdue} tone={stats.interviews.overdue ? 'bad' : 'default'} />
      </StageCard>
      <section className="rounded-3xl border border-border bg-card p-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3"><span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary"><Send className="size-4" /></span><h2 className="font-semibold">Offers</h2></div>
          <button type="button" onClick={onOpenCandidates} className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">Open candidates<ArrowRight className="size-3.5" /></button>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <Stat label="Assessed candidates" value={stats.offers.assessed} />
          <Stat label="Passed" value={stats.offers.passed} tone="good" />
          <Stat label="Ready for offer letter" value={stats.offers.readyForOffer} tone={stats.offers.readyForOffer ? 'warn' : 'default'} />
          <Stat label="Offers issued" value={stats.offers.issued} tone="good" />
          <Stat label="Offer sending failed" value={stats.offers.failed} tone={stats.offers.failed ? 'bad' : 'default'} />
          <Stat label="Not passed" value={stats.offers.notPassed} />
        </div>
      </section>
    </div>

    <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
      <section className="rounded-3xl border border-border bg-card p-6">
        <div className="flex items-center gap-3"><AlertTriangle className="size-5 text-amber-600" /><h2 className="font-semibold">Needs your attention</h2></div>
        <ul className="mt-4 flex flex-col gap-3 text-sm">
          <li className="flex items-center justify-between gap-3 rounded-2xl border border-border p-3"><span>{stats.documents.readyForInterview} applicants with documents are not yet invited to interview</span><Link href="/admin/documents" className="shrink-0 font-semibold text-primary hover:underline">Invite</Link></li>
          <li className="flex items-center justify-between gap-3 rounded-2xl border border-border p-3"><span>{stats.documents.awaiting + stats.documents.partial} applicants still owe documents</span><Link href="/admin/documents" className="shrink-0 font-semibold text-primary hover:underline">Send reminders</Link></li>
          <li className="flex items-center justify-between gap-3 rounded-2xl border border-border p-3"><span>{stats.interviews.awaitingDecision} completed interviews await a decision</span><Link href="/admin/interviews" className="shrink-0 font-semibold text-primary hover:underline">Review</Link></li>
          <li className="flex items-center justify-between gap-3 rounded-2xl border border-border p-3"><span>{stats.offers.readyForOffer} passed candidates have no offer letter yet</span><button type="button" onClick={onOpenCandidates} className="shrink-0 font-semibold text-primary hover:underline">Issue offers</button></li>
        </ul>
      </section>
      <section className="rounded-3xl border border-border bg-card p-6">
        <div className="flex items-center gap-3"><FileCheck2 className="size-5 text-primary" /><h2 className="font-semibold">Latest document submissions</h2></div>
        {stats.recentSubmissions.length === 0 ? <p className="mt-4 rounded-2xl border border-dashed border-border p-5 text-sm text-muted-foreground">No documents have been submitted yet.</p> : <ul className="mt-4 flex flex-col gap-3">
          {stats.recentSubmissions.map(item => <li key={item.id} className="flex items-center justify-between gap-3 rounded-2xl border border-border p-3 text-sm">
            <div className="min-w-0"><p className="truncate font-medium">{item.name}</p><p className="truncate text-xs text-muted-foreground">{item.email}</p></div>
            <div className="shrink-0 text-right"><span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${item.status === 'documents_received' ? 'bg-primary/10 text-primary' : 'bg-amber-100 text-amber-800'}`}><CheckCircle2 className="size-3" />{item.status === 'documents_received' ? 'Received' : 'Partial'}</span><p className="mt-1 text-xs text-muted-foreground">{formatDate(item.submittedAt)}</p></div>
          </li>)}
        </ul>}
      </section>
    </div>
  </div>
}
