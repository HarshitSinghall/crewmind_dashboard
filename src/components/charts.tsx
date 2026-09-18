import { n, pct, dur } from '@/lib/format'

/**
 * Charts are hand-drawn SVG rather than a library, for three reasons: the
 * default palette of every chart library is banned here, a 40kb dependency is
 * real money on patchy 4G, and these render on the server with no client JS at
 * all. No donuts, no dual axes, no 3D. Each chart answers one question.
 */

export const RAMP = [
  'var(--color-c1)', 'var(--color-c2)', 'var(--color-c3)',
  'var(--color-c4)', 'var(--color-c5)', 'var(--color-c6)',
]

/* ---------------------------------------------------------------- sparkline */

export function Sparkline({
  data, height = 40, label,
}: { data: { day: string; leads: number }[]; height?: number; label: string }) {
  if (!data?.length) return null
  const w = 100
  const max = Math.max(...data.map((d) => d.leads), 1)
  const step = data.length > 1 ? w / (data.length - 1) : w
  const pts = data.map((d, i) => `${(i * step).toFixed(2)},${(height - (d.leads / max) * height).toFixed(2)}`)
  const area = `M0,${height} L${pts.join(' L')} L${w},${height} Z`

  return (
    <svg
      viewBox={`0 0 ${w} ${height}`}
      preserveAspectRatio="none"
      className="w-full"
      style={{ height }}
      role="img"
      aria-label={label}
    >
      <path d={area} fill="var(--color-accent)" opacity="0.10" />
      <polyline
        points={pts.join(' ')}
        fill="none"
        stroke="var(--color-accent)"
        strokeWidth="1.4"
        vectorEffect="non-scaling-stroke"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  )
}

/* ------------------------------------------------------------------- funnel */

/**
 * Horizontal funnel with the drop-off spelled out between steps. The drop is
 * the information; the bars are just how you see it quickly.
 */
export function Funnel({
  steps, hrefBase,
}: {
  steps: { label: string; value: number; hint?: string }[]
  hrefBase?: string
}) {
  const top = steps[0]?.value || 1
  return (
    <div className="px-4 pb-4">
      {steps.map((s, i) => {
        const width = Math.max((s.value / top) * 100, s.value > 0 ? 1.5 : 0)
        const prev = i > 0 ? steps[i - 1].value : null
        const dropped = prev !== null ? prev - s.value : null
        const keptPct = prev ? (s.value / prev) * 100 : 100

        return (
          <div key={s.label}>
            {i > 0 && dropped !== null && (
              <div className="flex items-center gap-2 py-1 pl-1">
                <span className="text-[11px]" style={{ color: 'var(--fg-4)' }} aria-hidden>
                  ↓
                </span>
                <span
                  className="num text-[11px]"
                  style={{ color: dropped > 0 ? 'var(--color-alert)' : 'var(--fg-4)' }}
                >
                  {dropped > 0 ? `${n(dropped)} lost · ${pct(keptPct)} carried through` : 'no drop-off'}
                </span>
              </div>
            )}
            <div className="flex items-center gap-3">
              <div className="w-[86px] shrink-0 text-[12px] font-medium" style={{ color: 'var(--fg-2)' }}>
                {s.label}
              </div>
              <div className="flex-1 h-7 relative rounded-[3px]" style={{ background: 'var(--bg-2)' }}>
                <div
                  className="h-full rounded-[3px]"
                  style={{
                    width: `${width}%`,
                    background: i === steps.length - 1 ? 'var(--color-accent)' : 'var(--color-accent-2)',
                    opacity: i === steps.length - 1 ? 1 : 0.34 + i * 0.2,
                  }}
                />
                <span className="num absolute inset-y-0 left-2.5 flex items-center text-[12px] font-semibold">
                  {n(s.value)}
                </span>
              </div>
            </div>
          </div>
        )
      })}
      {hrefBase && (
        <p className="mt-3 text-[11px]" style={{ color: 'var(--fg-4)' }}>
          Every step links through to the leads that make it up.
        </p>
      )}
    </div>
  )
}

/* --------------------------------------------------------------- bar series */

export function Bars({
  data, valueFormat = (v: number) => n(v), color = 'var(--color-c1)', highlightIndex,
}: {
  data: { label: string; value: number; sub?: string }[]
  valueFormat?: (v: number) => string
  color?: string
  highlightIndex?: number
}) {
  if (!data?.length) return null
  const max = Math.max(...data.map((d) => d.value), 1)
  return (
    <div className="px-4 pb-4 space-y-1.5">
      {data.map((d, i) => (
        <div key={d.label} className="flex items-center gap-3">
          <div
            className="w-[92px] shrink-0 text-[12px] truncate"
            style={{ color: 'var(--fg-2)' }}
            title={d.label}
          >
            {d.label}
          </div>
          <div className="flex-1 h-5 rounded-[3px]" style={{ background: 'var(--bg-2)' }}>
            <div
              className="h-full rounded-[3px]"
              style={{
                width: `${Math.max((d.value / max) * 100, d.value > 0 ? 1.5 : 0)}%`,
                background: highlightIndex === i ? 'var(--color-alert)' : color,
              }}
            />
          </div>
          <div className="num w-[62px] shrink-0 text-right text-[12px] font-medium">
            {valueFormat(d.value)}
          </div>
        </div>
      ))}
    </div>
  )
}

/* ------------------------------------------------------- latency histogram */

/**
 * Speed-to-lead distribution. The buckets are uneven on purpose: the difference
 * between 20s and 40s matters enormously and the difference between 3h and 5h
 * does not, so linear buckets would waste the whole axis on the tail.
 */
export function Distribution({
  data, medianSec, p90Sec,
}: {
  data: { bucket: string; n: number }[]
  medianSec?: number | null
  p90Sec?: number | null
}) {
  if (!data?.length) return null
  const max = Math.max(...data.map((d) => d.n), 1)
  const total = data.reduce((a, b) => a + b.n, 0)

  return (
    <div className="px-4 pb-4">
      <div className="flex items-end gap-1.5 h-[124px]">
        {data.map((d, i) => (
          <div key={d.bucket} className="flex-1 flex flex-col items-center justify-end h-full gap-1.5">
            <span className="num text-[11px] font-medium" style={{ color: 'var(--fg-3)' }}>
              {d.n > 0 ? d.n : ''}
            </span>
            <div
              className="w-full rounded-t-[2px]"
              style={{
                height: `${(d.n / max) * 100}%`,
                minHeight: d.n > 0 ? 3 : 0,
                background: i <= 1 ? 'var(--color-accent)' : i <= 3 ? 'var(--color-c4)' : 'var(--color-alert)',
              }}
            />
          </div>
        ))}
      </div>
      <div className="flex gap-1.5 mt-1.5">
        {data.map((d) => (
          <div
            key={d.bucket}
            className="flex-1 text-center text-[10px] leading-tight"
            style={{ color: 'var(--fg-3)' }}
          >
            {d.bucket}
          </div>
        ))}
      </div>
      <div className="flex gap-5 mt-3 pt-3 hairline-t text-[12px]">
        <span>
          <span style={{ color: 'var(--fg-3)' }}>Median </span>
          <span className="num font-semibold">{dur(medianSec)}</span>
        </span>
        <span>
          <span style={{ color: 'var(--fg-3)' }}>90th percentile </span>
          <span className="num font-semibold">{dur(p90Sec)}</span>
        </span>
        <span className="ml-auto num" style={{ color: 'var(--fg-4)' }}>
          {n(total)} leads
        </span>
      </div>
      <p className="mt-2 text-[11px] leading-snug" style={{ color: 'var(--fg-4)' }}>
        Median, not average — one call that failed and retried at 4am destroys an average.
      </p>
    </div>
  )
}

/* ------------------------------------------------------------ hour coverage */

/**
 * Response by hour of day. This is the chart that proves the system covers
 * nights, Sundays and lunch hours when the team does not.
 */
export function HourCoverage({
  data, workStart = 10, workEnd = 19,
}: {
  data: { hour: number; n: number; median_sec: number | null }[]
  workStart?: number
  workEnd?: number
}) {
  const byHour = new Map(data.map((d) => [d.hour, d]))
  const hours = Array.from({ length: 24 }, (_, h) => byHour.get(h) ?? { hour: h, n: 0, median_sec: null })
  const max = Math.max(...hours.map((h) => h.n), 1)

  return (
    <div className="px-4 pb-4">
      <div className="scroll-x">
        <div className="flex items-end gap-[3px] h-[96px] min-w-[420px]">
          {hours.map((h) => {
            const outside = h.hour < workStart || h.hour >= workEnd
            return (
              <div
                key={h.hour}
                className="flex-1 h-full flex flex-col justify-end"
                title={`${String(h.hour).padStart(2, '0')}:00 IST — ${h.n} leads${
                  h.median_sec ? `, median ${dur(h.median_sec)}` : ''
                }`}
              >
                <div
                  className="w-full rounded-t-[2px]"
                  style={{
                    height: `${(h.n / max) * 100}%`,
                    minHeight: h.n > 0 ? 3 : 0,
                    background: outside ? 'var(--color-alert)' : 'var(--color-accent)',
                  }}
                />
              </div>
            )
          })}
        </div>
        <div className="flex gap-[3px] mt-1.5 min-w-[420px]">
          {hours.map((h) => (
            <div
              key={h.hour}
              className="num flex-1 text-center text-[9px]"
              style={{ color: 'var(--fg-4)' }}
            >
              {h.hour % 3 === 0 ? String(h.hour).padStart(2, '0') : ''}
            </div>
          ))}
        </div>
      </div>
      <div className="flex gap-4 mt-3 text-[11px]" style={{ color: 'var(--fg-3)' }}>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-[2px]" style={{ background: 'var(--color-accent)' }} />
          Inside working hours
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-[2px]" style={{ background: 'var(--color-alert)' }} />
          Outside — your team is not at a desk
        </span>
      </div>
    </div>
  )
}
