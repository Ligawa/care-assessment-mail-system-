import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { calculateAssessmentScore } from '@/lib/assessment-score'

type SearchParams = Promise<{ sort?: string }>

export default async function AssessmentResponsesPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: SearchParams }) {
  const { id } = await params
  const { sort = 'newest' } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email?.toLowerCase().endsWith('@care-intrenational.org')) redirect('/admin/login')

  const { data: assessment } = await supabase.from('assessment_roles').select('id,title').eq('id', id).maybeSingle()
  if (!assessment) notFound()

  const [{ data: questions }, { data: submissions }] = await Promise.all([
    supabase.from('assessment_questions').select('id,position,competency,prompt,options,answer_key').eq('assessment_id', id).order('position'),
    supabase.from('assessment_submissions').select('id,full_name,email,reference_number,answers,submitted_at,decision_status').eq('assessment_id', id),
  ])

  const rows = (submissions ?? []).map(submission => ({
    ...submission,
    score: calculateAssessmentScore(questions ?? [], submission.answers as Record<string, unknown> | null),
  }))
  rows.sort((a, b) => {
    if (sort === 'score') return b.score.percentage - a.score.percentage
    if (sort === 'name') return (a.full_name ?? '').localeCompare(b.full_name ?? '')
    return new Date(b.submitted_at ?? 0).getTime() - new Date(a.submitted_at ?? 0).getTime()
  })

  const average = rows.length ? Math.round(rows.reduce((sum, row) => sum + row.score.percentage, 0) / rows.length) : 0
  const questionStats = (questions ?? []).map((question, index) => {
    const correct = rows.filter(row => question.answer_key !== null && String((row.answers as Record<string, unknown> | null)?.[question.id] ?? '') === String(question.answer_key)).length
    return { id: question.id, number: index + 1, competency: question.competency, prompt: question.prompt, correct, percentage: rows.length ? Math.round((correct / rows.length) * 100) : 0 }
  })

  const sorts = [{ key: 'newest', label: 'Newest' }, { key: 'score', label: 'Highest score' }, { key: 'name', label: 'Name' }]

  return (
    <main className="min-h-screen bg-background px-4 py-8 text-foreground sm:px-6">
      <div className="mx-auto max-w-6xl">
        <Link href="/admin?section=Assessments" className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" />Back to assessments
        </Link>
        <header className="mt-6 flex flex-col justify-between gap-4 border-b border-border pb-6 md:flex-row md:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">Assessment responses</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">{assessment.title}</h1>
          </div>
          <dl className="flex gap-3 text-sm">
            <div className="rounded-2xl border border-border bg-card px-4 py-3"><dt className="text-muted-foreground">Responses</dt><dd className="text-2xl font-semibold">{rows.length}</dd></div>
            <div className="rounded-2xl border border-border bg-card px-4 py-3"><dt className="text-muted-foreground">Average score</dt><dd className="text-2xl font-semibold">{average}%</dd></div>
            <div className="rounded-2xl border border-border bg-card px-4 py-3"><dt className="text-muted-foreground">Questions</dt><dd className="text-2xl font-semibold">{questions?.length ?? 0}</dd></div>
          </dl>
        </header>

        <section className="mt-8 rounded-3xl border border-border bg-card p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-semibold">Submissions</h2>
            <nav aria-label="Sort submissions" className="flex gap-2">
              {sorts.map(item => (
                <Link key={item.key} href={`?sort=${item.key}`} className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${sort === item.key ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}>{item.label}</Link>
              ))}
            </nav>
          </div>
          {rows.length === 0 ? (
            <p className="mt-6 text-sm text-muted-foreground">No one has submitted this assessment yet.</p>
          ) : (
            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="text-muted-foreground"><tr><th className="py-2 pr-3">Applicant</th><th className="py-2 pr-3">Reference</th><th className="py-2 pr-3">Submitted</th><th className="py-2 pr-3">Score</th><th className="py-2 pr-3">Decision</th><th className="py-2">Responses</th></tr></thead>
                <tbody>
                  {rows.map(row => (
                    <tr key={row.id} className="border-t border-border">
                      <td className="py-3 pr-3"><p className="font-semibold">{row.full_name}</p><p className="text-muted-foreground">{row.email}</p></td>
                      <td className="py-3 pr-3">{row.reference_number}</td>
                      <td className="py-3 pr-3">{row.submitted_at ? new Date(row.submitted_at).toLocaleString() : '-'}</td>
                      <td className="py-3 pr-3 font-semibold">{row.score.percentage}% <span className="font-normal text-muted-foreground">({row.score.correct}/{row.score.total})</span></td>
                      <td className="py-3 pr-3 capitalize">{row.decision_status ?? 'pending'}</td>
                      <td className="py-3"><Link href={`/admin/candidates/${row.id}`} className="inline-flex h-9 items-center rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground">View answers</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {questionStats.length > 0 && rows.length > 0 && (
          <section className="mt-6 rounded-3xl border border-border bg-card p-6">
            <h2 className="text-xl font-semibold">Question performance</h2>
            <p className="mt-1 text-sm text-muted-foreground">Share of applicants who answered each question correctly.</p>
            <ul className="mt-5 flex flex-col gap-4">
              {questionStats.map(stat => (
                <li key={stat.id}>
                  <div className="flex items-start justify-between gap-4 text-sm">
                    <p className="min-w-0"><span className="font-semibold">Q{stat.number}</span>{stat.competency ? <span className="text-muted-foreground"> · {stat.competency}</span> : null}<span className="mt-1 block text-muted-foreground">{stat.prompt}</span></p>
                    <p className="shrink-0 font-semibold">{stat.percentage}% <span className="font-normal text-muted-foreground">({stat.correct}/{rows.length})</span></p>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${stat.percentage}%` }} /></div>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </main>
  )
}
