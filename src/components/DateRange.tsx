'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useTransition } from 'react'
import { RANGES, type RangeKey } from '@/lib/range'

/**
 * One date range, in the URL, respected by every screen. Putting it in the URL
 * rather than in React state means a range survives a refresh, the back button
 * behaves, and he can send a link to his partner showing what he is looking at.
 */
export function DateRange({ value }: { value: RangeKey }) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [pending, start] = useTransition()

  function set(key: RangeKey) {
    const next = new URLSearchParams(params.toString())
    next.set('range', key)
    start(() => router.push(`${pathname}?${next.toString()}`, { scroll: false }))
  }

  return (
    <div
      className="scroll-x -mx-1 px-1"
      style={{ opacity: pending ? 0.55 : 1, transition: 'opacity 120ms' }}
    >
      <div
        className="inline-flex rounded-[4px] border p-0.5 gap-0.5"
        style={{ borderColor: 'var(--line)', background: 'var(--bg-2)' }}
        role="group"
        aria-label="Date range"
      >
        {RANGES.map((r) => {
          const active = r.key === value
          return (
            <button
              key={r.key}
              onClick={() => set(r.key)}
              aria-pressed={active}
              className="focusable px-2.5 py-1 text-[12px] font-medium rounded-[3px] whitespace-nowrap transition-colors"
              style={{
                background: active ? 'var(--bg)' : 'transparent',
                color: active ? 'var(--fg)' : 'var(--fg-3)',
                border: active ? '1px solid var(--line)' : '1px solid transparent',
              }}
            >
              <span className="sm:hidden">{r.short}</span>
              <span className="hidden sm:inline">{r.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
