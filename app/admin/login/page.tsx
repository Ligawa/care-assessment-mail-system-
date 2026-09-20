'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function AdminLogin() {
  const router = useRouter(); const supabase = createClient(); const [email,setEmail]=useState(''); const [password,setPassword]=useState(''); const [error,setError]=useState('')
  async function login(e:React.FormEvent) { e.preventDefault(); setError(''); const normalizedEmail = email.trim().toLowerCase(); const isStaffEmail = normalizedEmail.endsWith('@care-intrenational.org') || normalizedEmail.endsWith('@care-international.org'); if (!isStaffEmail) { setError('Use your CARE International staff email.'); return } const {error} = await supabase.auth.signInWithPassword({email: normalizedEmail,password}); if (error) { setError('Invalid email or password.'); return } router.push('/admin') }
  return <main className="flex min-h-screen items-center justify-center bg-background px-5"><form onSubmit={login} className="w-full max-w-md rounded-3xl border border-border bg-card p-8 shadow-sm"><p className="text-sm font-semibold uppercase tracking-widest text-primary">CARE International</p><h1 className="mt-4 text-3xl font-semibold">Admin sign in</h1>{error && <p className="mt-5 rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}<div className="mt-7 flex flex-col gap-4"><label className="flex flex-col gap-2 text-sm font-semibold">Email<input type="email" required value={email} onChange={e=>setEmail(e.target.value)} className="h-12 rounded-xl border border-input bg-background px-3 font-normal"/></label><label className="flex flex-col gap-2 text-sm font-semibold">Password<input type="password" required value={password} onChange={e=>setPassword(e.target.value)} className="h-12 rounded-xl border border-input bg-background px-3 font-normal"/></label><button className="mt-2 rounded-full bg-primary px-5 py-3 font-semibold text-primary-foreground">Sign in</button></div></form></main>
}
