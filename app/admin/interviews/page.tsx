import AdminSidebar from '@/components/admin-sidebar'

export default function InterviewsPage() {
  return (
    <div className="min-h-screen bg-[#faf8f2] lg:flex">
      <AdminSidebar />
      <main className="flex-1 p-6 lg:p-12">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#f47700]">CARE International</p>
        <h1 className="mt-3 text-4xl font-semibold text-[#101b30]">Interviews</h1>
        <section className="mt-10 rounded-[28px] border border-[#ded8ca] bg-white p-8">
          <h2 className="text-2xl font-semibold text-[#101b30]">Live interviews</h2>
          <p className="mt-3 max-w-2xl text-lg leading-8 text-[#455c7d]">Review candidate interview sessions and access the live interview experience from the links sent to applicants.</p>
        </section>
      </main>
    </div>
  )
}
