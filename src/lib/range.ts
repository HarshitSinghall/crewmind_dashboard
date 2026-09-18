/**
 * The global date range. Every screen reads it from the URL, so a range is
 * shareable, survives a refresh, and the back button does what he expects.
 *
 * Boundaries are computed on IST calendar days. Using UTC would shift every
 * "today" by 5h30m and quietly put this morning's leads in yesterday.
 */

import { IST } from './format'

export type RangeKey = '7d' | '30d' | '90d' | 'mtd' | 'all'

export const RANGES: { key: RangeKey; label: string; short: string }[] = [
  { key: '7d',  label: 'Last 7 days',  short: '7d' },
  { key: '30d', label: 'Last 30 days', short: '30d' },
  { key: '90d', label: 'Last 90 days', short: '90d' },
  { key: 'mtd', label: 'This month',   short: 'MTD' },
  { key: 'all', label: 'Since you started', short: 'All' },
]

/** Start of the IST calendar day containing `d`, returned as a UTC instant. */
function istDayStart(d: Date): Date {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: IST, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(d)
  const get = (t: string) => parts.find((p) => p.type === t)!.value
  // IST is UTC+5:30 year-round - no DST to handle.
  return new Date(`${get('year')}-${get('month')}-${get('day')}T00:00:00+05:30`)
}

export function resolveRange(key: RangeKey, onboardedAt?: string | null): { from: Date; to: Date; key: RangeKey } {
  const now = new Date()
  const todayStart = istDayStart(now)
  const tomorrow = new Date(todayStart.getTime() + 86400000)

  switch (key) {
    case '7d':
      return { from: new Date(todayStart.getTime() - 6 * 86400000), to: tomorrow, key }
    case '90d':
      return { from: new Date(todayStart.getTime() - 89 * 86400000), to: tomorrow, key }
    case 'mtd': {
      const p = new Intl.DateTimeFormat('en-CA', { timeZone: IST, year: 'numeric', month: '2-digit' })
        .formatToParts(now)
      const y = p.find((x) => x.type === 'year')!.value
      const m = p.find((x) => x.type === 'month')!.value
      return { from: new Date(`${y}-${m}-01T00:00:00+05:30`), to: tomorrow, key }
    }
    case 'all':
      return { from: onboardedAt ? new Date(onboardedAt) : new Date('2020-01-01T00:00:00Z'), to: tomorrow, key }
    case '30d':
    default:
      return { from: new Date(todayStart.getTime() - 29 * 86400000), to: tomorrow, key: '30d' }
  }
}

export function parseRange(v: string | undefined | null): RangeKey {
  return (RANGES.find((r) => r.key === v)?.key ?? '30d') as RangeKey
}

export function rangeLabel(key: RangeKey): string {
  return RANGES.find((r) => r.key === key)?.label ?? 'Last 30 days'
}

/** What the comparison figure is measured against, in words. */
export function comparisonLabel(key: RangeKey): string {
  switch (key) {
    case '7d':  return 'vs previous 7 days'
    case '90d': return 'vs previous 90 days'
    case 'mtd': return 'vs same length before'
    case 'all': return 'vs equal period before'
    default:    return 'vs previous 30 days'
  }
}
