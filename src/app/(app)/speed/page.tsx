import { Suspense } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { parseRange, resolveRange, rangeLabel } from '@/lib/range'
import { dur, n, pct, ago, DOW } from '@/lib/format'
import { Card, SectionHead, Stat, Empty, StatSkeleton } from '@/components/ui'
import { Distribution, HourCoverage, Bars } from '@/components/charts'
import { DateRange } from '@/components/DateRange'

export const dynamic = 'force-dynamic'

export default async function SpeedPage({
  searchParams,
}: { searchParams: Promise<{ range?: string }> }) {
  const sp = await searchParams
  const key = parseRange(sp.range)

  return (
    <>
      <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
        <div>
          <h1 className="text-[19px] font-semibold tracking-tight">Speed and response</h1>
          <p className="text-[13px] mt-0.5" style={{ color: 'var(--fg-3)' }}>{rangeLabel(key)}</p>
        </div>
        <Suspense fallback={<div className="h-8" />}>
          <DateRange value={key} />
        </Suspense>
      </div>

      <Suspense fallback={<div className="card"><StatSkeleton /></div>}>
        <SpeedBody rangeKey={key} />
      </Suspense>
    </>
  )
}

async function SpeedBody({ rangeKey }: { rangeKey: ReturnType<typeof parseRange> }) {
  const supabase = await createClient()
  const { data: session } = await supabase.rpc('dashboard_session')
  const { from, to } = resolveRange(rangeKey, session?.org?.onboarded_at)

  const { data, error } = await supabase.rpc('dashboard_speed', {
    p_from: from.toISOString(),
    p_to: to.toISOString(),
  })

  if (error) {
    return <Card><Empty title="Could not load these figures" tone="blocked">{error.message}</Empty></Card>
  }

  const s = data?.summary ?? {}
  const base = data?.baseline ?? {}
  const hf = data?.human_followup ?? {}
  const dist = data?.distribution ?? []
  const byHour = data?.by_hour ?? []
  const byDow = data?.by_dow ?? []

  if (!s.n) {
    return (
      <Card>
        <Empty title="No leads were dialled in this period">
          This screen fills in as calls complete. Try a wider date range, or check that calling is
          switched on.
        </Empty>
      </Card>
    )
  }

  const speedup = base.median_sec && s.median_sec ? base.median_sec / s.median_sec : null

  return (
    <div className="space-y-4">
      {/* --------------------------------------------------- before / after */}
      <Card>
        <SectionHead
          title="Before and after"
          hint={
            base.median_sec
              ? `Your own “before” figure, ${base.source === 'measured_audit' ? 'measured by us' : 'entered by you'} ${ago(base.recorded_at)}.`
              : 'No baseline recorded yet.'
          }
        />
        <div className="px-4 pb-4">
          {base.median_sec ? (
            <div className="grid gap-4 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
              <div>
                <div className="text-[12px] font-medium uppercase tracking-[0.06em]" style={{ color: 'var(--fg-3)' }}>
                  Before Crewmind
                </div>
                <div className="num text-[32px] font-semibold mt-1" style={{ color: 'var(--fg-3)' }}>
                  {dur(base.median_sec)}
                </div>
              </div>
              <div className="text-[22px] hidden sm:block" style={{ color: 'var(--fg-4)' }} aria-hidden>→</div>
              <div>
                <div className="text-[12px] font-medium uppercase tracking-[0.06em]" style={{ color: 'var(--color-accent)' }}>
                  Now
                </div>
                <div className="num text-[42px] font-semibold mt-1" style={{ color: 'var(--color-accent)' }}>
                  {dur(s.median_sec)}
                </div>
                {speedup && speedup > 1.2 && (
                  <div className="text-[14px] font-medium mt-1" style={{ color: 'var(--color-accent)' }}>
                    {speedup >= 10 ? `${Math.round(speedup)}×` : `${speedup.toFixed(1)}×`} faster
                  </div>
                )}
              </div>
            </div>
          ) : (
            <Empty title="Add your “before” number">
              The single most convincing figure on this dashboard is how long leads used to wait.
              <div className="mt-2">
                <Link href="/roi" className="focusable font-medium" style={{ color: 'var(--color-accent)' }}>
                  Enter it on the ROI screen →
                </Link>
              </div>
            </Empty>
          )}
        </div>
      </Card>

      {/* -------------------------------------------------- distribution */}
      <Card>
        <SectionHead
          title="How long leads waited"
          hint="Buckets are uneven on purpose — the gap between 20s and 40s matters; the gap between 3h and 5h does not."
        />
        <Distribution data={dist} medianSec={s.median_sec} p90Sec={s.p90_sec} />
      </Card>

      {/* ------------------------------------------- human follow-up latency */}
      <Card className="border-2" {...{ style: { borderColor: hf.never_touched > 0 ? 'var(--color-alert)' : 'var(--line)' } }}>
        <SectionHead
          title="What happened after the AI handed over"
          hint="The AI qualified these leads. This is what your team did next."
        />
        {!hf.handed_off ? (
          <Empty title="No leads were qualified in this period">
            This measures the gap between the AI finishing and a human calling back.
          </Empty>
        ) : (
          <>
            <div className="px-4 pb-4 grid gap-5 sm:grid-cols-3">
              <Stat
                label="Qualified and handed over"
                value={n(hf.handed_off)}
                size="md"
              />
              <Stat
                label="Never followed up"
                value={n(hf.never_touched)}
                size="md"
                comparisonLabel={`${pct((hf.never_touched / hf.handed_off) * 100)} of handovers`}
              />
              <Stat
                label="Median callback delay"
                value={hf.median_lag_sec ? dur(hf.median_lag_sec) : '—'}
                size="md"
                comparisonLabel={hf.p90_lag_sec ? `90th percentile ${dur(hf.p90_lag_sec)}` : undefined}
              />
            </div>

            {hf.never_touched > 0 && (
              <div
                className="mx-4 mb-4 px-3.5 py-3 rounded-[4px]"
                style={{ background: 'var(--color-alert-wash)', border: '1px solid #eccbb2' }}
              >
                <p className="text-[13px] leading-relaxed" style={{ color: '#8c4318' }}>
                  <span className="num font-semibold">{n(hf.never_touched)}</span> lead
                  {hf.never_touched === 1 ? '' : 's'} the AI qualified {hf.never_touched === 1 ? 'has' : 'have'} never
                  been called back by anyone on your team. The AI reached them in seconds; after
                  that they were left alone.
                </p>
                <Link
                  href="/leads?followup=1"
                  className="focusable inline-block mt-2 text-[12px] font-medium"
                  style={{ color: '#8c4318' }}
                >
                  See exactly which ones →
                </Link>
              </div>
            )}

            <div className="mx-4 mb-4 px-3 py-2.5 rounded-[4px]" style={{ background: 'var(--bg-2)' }}>
              <p className="text-[11px] leading-relaxed" style={{ color: 'var(--fg-3)' }}>
                <strong>How this is measured, honestly:</strong> a follow-up is only counted when
                someone presses “I called this lead” on the lead page. An agent who calls from his
                own mobile and never opens this dashboard produces no record, so “never followed
                up” will read higher than reality until that gap is closed.
              </p>
            </div>
          </>
        )}
      </Card>

      {/* ----------------------------------------------------- coverage */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <SectionHead
            title="When your leads arrive"
            hint="Orange is outside 10am–7pm, when nobody is at a desk."
          />
          <HourCoverage data={byHour} />
        </Card>

        <Card>
          <SectionHead title="By day of week" hint="Median time to first call." />
          {byDow.length ? (
            <Bars
              data={byDow.map((d: { dow: number; n: number; median_sec: number | null }) => ({
                label: DOW[d.dow] ?? String(d.dow),
                value: d.median_sec ?? 0,
                sub: `${d.n} leads`,
              }))}
              valueFormat={(v) => dur(v)}
              color="var(--color-c3)"
            />
          ) : (
            <Empty title="Not enough data yet" />
          )}
        </Card>
      </div>
    </div>
  )
}
