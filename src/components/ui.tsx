import Link from 'next/link'
import { delta as calcDelta } from '@/lib/format'

/* ------------------------------------------------------------------ surfaces */

export function Card({
  children, className = '', as: As = 'section', style,
}: {
  children: React.ReactNode
  className?: string
  as?: 'section' | 'div' | 'article'
  style?: React.CSSProperties
}) {
  return <As className={`card ${className}`} style={style}>{children}</As>
}

export function SectionHead({
  title, hint, right,
}: { title: string; hint?: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 px-4 sm:px-5 pt-4 pb-3">
      <div className="min-w-0">
        <h2 className="text-[14px] font-semibold tracking-tight">{title}</h2>
        {hint && (
          <p className="mt-0.5 text-[12px] leading-snug" style={{ color: 'var(--fg-3)' }}>
            {hint}
          </p>
        )}
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </div>
  )
}

/* ---------------------------------------------------------------- the figure */

/**
 * A number with its comparison. There is no variant without one: a bare figure
 * teaches the owner nothing, which is the whole failure mode of the dashboards
 * he has abandoned before.
 */
export function Stat({
  label, value, unit, current, previous, lowerIsBetter = false,
  comparisonLabel, note, size = 'md', href,
}: {
  label: string
  value: React.ReactNode
  unit?: string
  current?: number | null
  previous?: number | null
  lowerIsBetter?: boolean
  comparisonLabel?: string
  note?: string
  size?: 'sm' | 'md' | 'lg' | 'hero'
  href?: string
}) {
  const d = calcDelta(current, previous, lowerIsBetter)
  const sizes = {
    sm: 'text-[20px]', md: 'text-[26px]', lg: 'text-[34px]',
    hero: 'text-[46px] sm:text-[58px]',
  } as const

  const body = (
    <>
      <div className="text-[12px] font-medium uppercase tracking-[0.06em]" style={{ color: 'var(--fg-3)' }}>
        {label}
      </div>
      <div className="mt-1.5 flex items-baseline gap-1.5 flex-wrap">
        <span className={`num font-semibold leading-none ${sizes[size]}`}>{value}</span>
        {unit && (
          <span className="text-[14px] font-medium" style={{ color: 'var(--fg-3)' }}>
            {unit}
          </span>
        )}
      </div>
      {d && (
        <div className="mt-2 flex items-center gap-1.5 text-[12px]">
          <span
            className="num font-medium tabular-nums"
            style={{ color: d.improved ? 'var(--color-accent)' : 'var(--color-alert)' }}
          >
            {d.improved ? '↓' : '↑'}
            {d.magnitude < 0.5 ? '<1' : Math.round(d.magnitude)}%
          </span>
          <span style={{ color: 'var(--fg-3)' }}>{comparisonLabel ?? 'vs previous period'}</span>
        </div>
      )}
      {!d && comparisonLabel && (
        <div className="mt-2 text-[12px]" style={{ color: 'var(--fg-4)' }}>
          {comparisonLabel}
        </div>
      )}
      {note && (
        <p className="mt-2 text-[12px] leading-snug" style={{ color: 'var(--fg-3)' }}>
          {note}
        </p>
      )}
    </>
  )

  if (href) {
    return (
      <Link href={href} className="focusable block group -m-1 p-1 rounded-[4px]">
        {body}
        <span className="mt-1.5 inline-block text-[12px] opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ color: 'var(--color-accent)' }}>
          See the calls →
        </span>
      </Link>
    )
  }
  return <div>{body}</div>
}

/* -------------------------------------------------------------------- badges */

const TONES = {
  neutral: { bg: 'var(--bg-2)',                fg: 'var(--fg-2)',            bd: 'var(--line)' },
  good:    { bg: 'var(--color-accent-wash)',   fg: '#1a5c4c',                bd: '#bcd9d0' },
  alert:   { bg: 'var(--color-alert-wash)',    fg: '#8c4318',                bd: '#eccbb2' },
  bad:     { bg: 'var(--color-danger-wash)',   fg: '#8a2727',                bd: '#e8c3c3' },
} as const

export function Badge({
  children, tone = 'neutral',
}: { children: React.ReactNode; tone?: keyof typeof TONES }) {
  const t = TONES[tone]
  return (
    <span
      className="inline-flex items-center px-1.5 py-0.5 text-[11px] font-medium rounded-[3px] border whitespace-nowrap"
      style={{ background: t.bg, color: t.fg, borderColor: t.bd }}
    >
      {children}
    </span>
  )
}

export function outcomeTone(outcome?: string | null): keyof typeof TONES {
  if (!outcome) return 'neutral'
  if (outcome === 'answered_qualified' || outcome === 'appointment_booked') return 'good'
  if (outcome === 'declined' || outcome === 'invalid_number' || outcome === 'failed') return 'bad'
  if (outcome === 'answered_callback_requested') return 'alert'
  return 'neutral'
}

/* --------------------------------------------------------------- empty state */

/**
 * Empty states teach. A new tenant has nothing on day one, and a chart frame
 * with no bars in it reads as a broken product rather than a new one.
 */
export function Empty({
  title, children, tone = 'neutral',
}: { title: string; children?: React.ReactNode; tone?: 'neutral' | 'blocked' }) {
  const blocked = tone === 'blocked'
  return (
    <div
      className="px-4 py-6 text-center border border-dashed rounded-[4px] m-4 mt-0"
      style={{
        borderColor: blocked ? '#e0c4ab' : 'var(--line)',
        background: blocked ? 'var(--color-alert-wash)' : 'var(--bg-2)',
      }}
    >
      <p className="text-[13px] font-medium" style={{ color: blocked ? '#8c4318' : 'var(--fg-2)' }}>
        {title}
      </p>
      {children && (
        <div
          className="mt-1.5 text-[12px] leading-relaxed max-w-[46ch] mx-auto"
          style={{ color: blocked ? '#96502a' : 'var(--fg-3)' }}
        >
          {children}
        </div>
      )}
    </div>
  )
}

/* ---------------------------------------------------------------- demo banner */

/**
 * Unmissable, non-dismissable, and rendered above everything. The rule is that
 * seeded data must be impossible to mistake for a real tenant - so this is a
 * full-width bar in alert colour, not a subtle chip.
 */
export function DemoBanner({ orgName }: { orgName: string }) {
  return (
    <div
      className="w-full px-4 py-2 text-center border-b"
      style={{ background: 'var(--color-alert)', borderColor: '#8c4318' }}
      role="status"
    >
      <p className="text-[12px] font-semibold text-white tracking-wide">
        DEMO TENANT — {orgName}. Every figure below is generated sample data, not real calls.
      </p>
    </div>
  )
}

/* -------------------------------------------------------------------- skeleton */

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`} aria-hidden />
}

export function StatSkeleton() {
  return (
    <div className="p-4">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-8 w-32 mt-3" />
      <Skeleton className="h-3 w-28 mt-3" />
    </div>
  )
}
