'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useTransition, useEffect } from 'react'

const SOURCES = [
  ['', 'All sources'],
  ['portal_99acres', '99acres'],
  ['portal_magicbricks', 'MagicBricks'],
  ['portal_housing', 'Housing.com'],
  ['meta_ads', 'Meta ads'],
  ['google_ads', 'Google ads'],
  ['website', 'Website'],
  ['referral', 'Referral'],
]

const STATUSES = [
  ['', 'Any status'],
  ['qualified', 'Qualified'],
  ['appointment_booked', 'Visit booked'],
  ['contacted', 'Contacted'],
  ['contact_attempted', 'Not reached'],
  ['lost', 'Lost'],
]

export function LeadFilters() {
  const router = useRouter()
  const params = useSearchParams()
  const [pending, start] = useTransition()
  const [q, setQ] = useState(params.get('q') ?? '')

  useEffect(() => {
    setQ(params.get('q') ?? '')
  }, [params])

  function apply(patch: Record<string, string>) {
    const next = new URLSearchParams(params.toString())
    Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)))
    next.delete('page')
    start(() => router.push(`/leads?${next.toString()}`, { scroll: false }))
  }

  const followup = params.get('followup') === '1'

  return (
    <div
      className="flex flex-wrap items-center gap-2 mb-4"
      style={{ opacity: pending ? 0.6 : 1, transition: 'opacity 120ms' }}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault()
          apply({ q })
        }}
        className="flex-1 min-w-[220px]"
      >
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search names, numbers, or what was said on the call…"
          aria-label="Search leads and call transcripts"
          className="focusable w-full px-3 py-2 text-[13px] rounded-[4px] border outline-none"
          style={{ background: 'var(--bg)', borderColor: 'var(--line)', color: 'var(--fg)' }}
        />
      </form>

      <select
        value={params.get('source') ?? ''}
        onChange={(e) => apply({ source: e.target.value })}
        aria-label="Filter by source"
        className="focusable px-2.5 py-2 text-[13px] rounded-[4px] border outline-none"
        style={{ background: 'var(--bg)', borderColor: 'var(--line)', color: 'var(--fg)' }}
      >
        {SOURCES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>

      <select
        value={params.get('status') ?? ''}
        onChange={(e) => apply({ status: e.target.value })}
        aria-label="Filter by status"
        className="focusable px-2.5 py-2 text-[13px] rounded-[4px] border outline-none"
        style={{ background: 'var(--bg)', borderColor: 'var(--line)', color: 'var(--fg)' }}
      >
        {STATUSES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>

      <button
        onClick={() => apply({ followup: followup ? '' : '1' })}
        aria-pressed={followup}
        className="focusable px-2.5 py-2 text-[13px] font-medium rounded-[4px] border whitespace-nowrap"
        style={{
          background: followup ? 'var(--color-alert)' : 'var(--bg)',
          color: followup ? '#fff' : 'var(--fg-2)',
          borderColor: followup ? 'var(--color-alert)' : 'var(--line)',
        }}
      >
        Needs follow-up
      </button>
    </div>
  )
}
