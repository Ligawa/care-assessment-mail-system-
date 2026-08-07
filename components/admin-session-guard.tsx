'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { AuthChangeEvent } from '@supabase/supabase-js'

const IDLE_TIMEOUT_MS = 3 * 60 * 1000
const WARNING_MS = 30 * 1000

export default function AdminSessionGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const lastActivity = useRef(Date.now())
  const [warningSeconds, setWarningSeconds] = useState<number | null>(null)
  const isLoginPage = pathname === '/admin/login'

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setWarningSeconds(null)
    router.replace('/admin/login?reason=timeout')
    router.refresh()
  }, [router, supabase])

  const recordActivity = useCallback(() => {
    if (isLoginPage) return
    lastActivity.current = Date.now()
    setWarningSeconds(null)
  }, [isLoginPage])

  useEffect(() => {
    if (isLoginPage) return
    const events = ['pointerdown', 'keydown', 'scroll', 'touchstart'] as const
    events.forEach((event) => window.addEventListener(event, recordActivity, { passive: true }))
    const interval = window.setInterval(() => {
      const idleFor = Date.now() - lastActivity.current
      const remaining = IDLE_TIMEOUT_MS - idleFor
      if (remaining <= 0) {
        void signOut()
      } else if (remaining <= WARNING_MS) {
        setWarningSeconds(Math.ceil(remaining / 1000))
      }
    }, 1000)
    return () => {
      events.forEach((event) => window.removeEventListener(event, recordActivity))
      window.clearInterval(interval)
    }
  }, [isLoginPage, recordActivity, signOut])

  useEffect(() => {
    if (isLoginPage) return
    const { data } = supabase.auth.onAuthStateChange((event: AuthChangeEvent) => {
      if (event === 'SIGNED_OUT') router.replace('/admin/login')
    })
    return () => data.subscription.unsubscribe()
  }, [isLoginPage, router, supabase])

  return <>
    {children}
    {!isLoginPage && warningSeconds !== null && (
      <div className="fixed inset-x-4 bottom-4 z-50 flex items-center justify-between gap-4 rounded-2xl border border-primary/30 bg-card p-4 text-sm shadow-xl sm:left-auto sm:max-w-md">
        <p>Your session will expire in {Math.floor(warningSeconds / 60)}:{String(warningSeconds % 60).padStart(2, '0')} due to inactivity.</p>
        <button type="button" onClick={recordActivity} className="shrink-0 rounded-lg bg-primary px-3 py-2 font-semibold text-primary-foreground">Stay signed in</button>
      </div>
    )}
  </>
}
