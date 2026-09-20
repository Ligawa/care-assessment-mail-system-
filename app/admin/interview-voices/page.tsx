import AdminSidebar from '@/components/admin-sidebar'
import AdminVoiceSelector from '@/components/admin-voice-selector'

export default function InterviewVoicesPage() {
  return <main className="min-h-screen bg-background lg:flex"><AdminSidebar /><section className="min-w-0 flex-1"><header className="border-b border-border bg-card/80 px-5 py-5 backdrop-blur lg:px-8"><p className="text-xs font-semibold uppercase tracking-widest text-primary">CARE International</p><h1 className="mt-1 text-2xl font-semibold">Interview voices</h1></header><div className="mx-auto max-w-4xl p-5 lg:p-8"><AdminVoiceSelector /></div></section></main>
}
