'use client'

import { useEffect, useRef, useTransition } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Re-requests the session-bound dashboard aggregates while the tab is visible.
 * It deliberately does not claim a successful-data timestamp: router.refresh()
 * exposes request state, not proof that every RPC returned fresh data.
 */
export function LiveRefresh({ intervalMs = 30_000 }: { intervalMs?: number }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const refreshing = useRef(false)

  useEffect(() => {
    const refresh = () => {
      if (refreshing.current || document.hidden) return
      refreshing.current = true
      startTransition(() => {
        router.refresh()
        refreshing.current = false
      })
    }

    const onVisible = () => { if (!document.hidden) refresh() }
    const poll = window.setInterval(refresh, intervalMs)
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      window.clearInterval(poll)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [router, intervalMs])

  return (
    <span
      className="text-[12px] inline-flex items-center gap-2 print:hidden"
      style={{ color: 'var(--fg-3)' }}
      aria-live="off"
      title={`Requests fresh dashboard data every ${Math.round(intervalMs / 1000)} seconds while this tab is visible`}
    >
      <span className="inline-block w-1.5 h-1.5 rounded-full shrink-0" style={{ background: isPending ? 'var(--color-alert)' : 'var(--color-accent)' }} aria-hidden />
      {isPending ? 'Updating…' : 'Auto-refresh on'}
    </span>
  )
}
