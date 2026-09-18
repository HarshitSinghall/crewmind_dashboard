/**
 * Formatting. Every display rule the owner will notice lives here.
 *
 * Two hard rules:
 *   - Times display in IST. Storage is UTC. Nothing renders a raw timestamp.
 *   - Money displays in Indian units. 1,25,00,000 is "1.25 Cr", never "12.5M"
 *     and never "12,500,000".
 */

export const IST = 'Asia/Kolkata'

/* ------------------------------------------------------------------ numbers */

export function n(value: number | null | undefined, digits = 0): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value)
}

/**
 * Indian money. Crore above 1,00,00,000; lakh above 1,00,000; grouped rupees
 * below that. He thinks in lakh and crore and reads nothing else fluently.
 */
export function inr(value: number | null | undefined, opts: { compact?: boolean } = {}): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  const compact = opts.compact ?? true
  const abs = Math.abs(value)
  if (compact && abs >= 1e7) return `₹${trimZeros(value / 1e7)} Cr`
  if (compact && abs >= 1e5) return `₹${trimZeros(value / 1e5)} L`
  return `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(value)}`
}

function trimZeros(v: number): string {
  const s = v.toFixed(2)
  return s.replace(/\.00$/, '').replace(/(\.\d)0$/, '$1')
}

export function pct(value: number | null | undefined, digits = 0): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  return `${value.toFixed(digits)}%`
}

/* ---------------------------------------------------------------- durations */

/**
 * Human duration. Chooses its own unit so "51s" and "4h 15m" can sit in the
 * same column without the reader doing arithmetic.
 */
export function dur(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined || Number.isNaN(seconds)) return '—'
  const s = Math.round(seconds)
  if (s < 60) return `${s}s`
  if (s < 3600) {
    const m = Math.floor(s / 60)
    const r = s % 60
    return r === 0 ? `${m}m` : `${m}m ${r}s`
  }
  if (s < 86400) {
    const h = Math.floor(s / 3600)
    const m = Math.round((s % 3600) / 60)
    return m === 0 ? `${h}h` : `${h}h ${m}m`
  }
  const d = Math.floor(s / 86400)
  const h = Math.round((s % 86400) / 3600)
  return h === 0 ? `${d}d` : `${d}d ${h}h`
}

/** Compact call length for table cells: 2:14 rather than "2m 14s". */
export function clock(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined) return '—'
  const s = Math.round(seconds)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

/* -------------------------------------------------------------------- dates */

export function ist(iso: string | Date | null | undefined, style: 'full' | 'date' | 'time' | 'short' = 'full'): string {
  if (!iso) return '—'
  const d = typeof iso === 'string' ? new Date(iso) : iso
  if (Number.isNaN(d.getTime())) return '—'
  const base: Intl.DateTimeFormatOptions = { timeZone: IST }
  const opts: Intl.DateTimeFormatOptions =
    style === 'date'  ? { ...base, day: '2-digit', month: 'short', year: 'numeric' } :
    style === 'time'  ? { ...base, hour: '2-digit', minute: '2-digit', hour12: true } :
    style === 'short' ? { ...base, day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true } :
                        { ...base, day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }
  return new Intl.DateTimeFormat('en-IN', opts).format(d)
}

/**
 * Relative time for anything recent, absolute IST beyond a week. "14 min ago"
 * is what he wants for a lead that just landed; "12 Jun" is what he wants for
 * one that did not.
 */
export function ago(iso: string | Date | null | undefined): string {
  if (!iso) return '—'
  const d = typeof iso === 'string' ? new Date(iso) : iso
  if (Number.isNaN(d.getTime())) return '—'
  const secs = (Date.now() - d.getTime()) / 1000
  if (secs < 45) return 'just now'
  if (secs < 5400) return `${Math.round(secs / 60)} min ago`
  if (secs < 86400) return `${Math.round(secs / 3600)} hr ago`
  if (secs < 604800) return `${Math.round(secs / 86400)}d ago`
  return ist(d, 'date')
}

/* ------------------------------------------------------------------- labels */

const OUTCOME_LABELS: Record<string, string> = {
  answered_qualified: 'Qualified',
  answered_not_qualified: 'Not qualified',
  answered_callback_requested: 'Callback asked',
  appointment_booked: 'Visit booked',
  transferred: 'Transferred',
  voicemail: 'Voicemail',
  no_answer: 'No answer',
  busy: 'Busy',
  failed: 'Failed',
  invalid_number: 'Invalid number',
  declined: 'Declined',
}
export const outcomeLabel = (o?: string | null) =>
  !o ? 'In progress' : OUTCOME_LABELS[o] ?? o.replace(/_/g, ' ')

const BUDGET_LABELS: Record<string, string> = {
  under_50L: 'Under ₹50 L',
  '50L_1Cr': '₹50 L – 1 Cr',
  '1Cr_2Cr': '₹1 – 2 Cr',
  '2Cr_plus': '₹2 Cr +',
}
export const budgetLabel = (b?: string | null) =>
  !b ? '—' : BUDGET_LABELS[b] ?? b.replace(/_/g, ' ')

const TIMELINE_LABELS: Record<string, string> = {
  immediate: 'Immediate',
  '1_3_months': '1–3 months',
  '3_6_months': '3–6 months',
  '6_plus_months': '6+ months',
  just_browsing: 'Just browsing',
}
export const timelineLabel = (t?: string | null) =>
  !t ? '—' : TIMELINE_LABELS[t] ?? t.replace(/_/g, ' ')

const FINANCE_LABELS: Record<string, string> = {
  pre_approved: 'Loan pre-approved',
  cash: 'Cash buyer',
  needs_loan: 'Needs loan',
  unknown: 'Not established',
}
export const financeLabel = (f?: string | null) =>
  !f ? '—' : FINANCE_LABELS[f] ?? f.replace(/_/g, ' ')

const SOURCE_LABELS: Record<string, string> = {
  portal_99acres: '99acres',
  portal_magicbricks: 'MagicBricks',
  portal_housing: 'Housing.com',
  meta_ads: 'Meta ads',
  google_ads: 'Google ads',
  website: 'Website',
  whatsapp_inbound: 'WhatsApp',
  referral: 'Referral',
  manual: 'Manual entry',
}
export const sourceLabel = (s?: string | null) =>
  !s ? '—' : SOURCE_LABELS[s] ?? s.replace(/_/g, ' ')

export const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/**
 * Direction of change, where "good" is not always "up". Speed-to-lead falling
 * is a win; qualified leads falling is not. Callers state which they mean.
 */
export function delta(current?: number | null, previous?: number | null, lowerIsBetter = false) {
  if (current == null || previous == null || previous === 0) return null
  const change = ((current - previous) / previous) * 100
  const improved = lowerIsBetter ? change < 0 : change > 0
  return { change, improved, magnitude: Math.abs(change) }
}
