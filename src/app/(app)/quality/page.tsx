import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { parseRange, resolveRange, rangeLabel } from '@/lib/range'
import { dur, n, pct, outcomeLabel, sourceLabel, inr } from '@/lib/format'
import { Card, SectionHead, Stat, Empty, StatSkeleton } from '@/components/ui'
import { Bars } from '@/components/charts'
import { DateRange } from '@/components/DateRange'

export const dynamic = 'force-dynamic'

export default async function QualityPage({
  searchParams,
}: { searchParams: Promise<{ range?: string }> }) {
  const sp = await searchParams
  const key = parseRange(sp.range)

  return (
    <>
      <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
        <div>
          <h1 className="text-[19px] font-semibold tracking-tight">Call quality and sources</h1>
          <p className="text-[13px] mt-0.5" style={{ color: 'var(--fg-3)' }}>{rangeLabel(key)}</p>
        </div>
        <Suspense fallback={<div className="h-8" />}>
          <DateRange value={key} />
        </Suspense>
      </div>

      <Suspense fallback={<div className="card"><StatSkeleton /></div>}>
        <QualityBody rangeKey={key} />
      </Suspense>
    </>
  )
}

async function QualityBody({ rangeKey }: { rangeKey: ReturnType<typeof parseRange> }) {
  const supabase = await createClient()
  const { data: session } = await supabase.rpc('dashboard_session')
  const { from, to } = resolveRange(rangeKey, session?.org?.onboarded_at)
  const args = { p_from: from.toISOString(), p_to: to.toISOString() }

  const [{ data: q, error }, { data: sources }] = await Promise.all([
    supabase.rpc('dashboard_call_quality', args),
    supabase.rpc('dashboard_sources', args),
  ])

  if (error) {
    return <Card><Empty title="Could not load these figures" tone="blocked">{error.message}</Empty></Card>
  }

  const tol = q?.tolerance ?? {}
  const isManager = session?.agent?.role === 'owner' || session?.agent?.role === 'manager'

  if (!q?.total_calls) {
    return (
      <Card>
        <Empty title="No calls in this period">
          Connect rate, call length and AI tolerance all need completed calls before they mean
          anything.
        </Empty>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0" style={{ borderColor: 'var(--line)' }}>
          <div className="p-4"><Stat label="Calls placed" value={n(q.total_calls)} size="md" /></div>
          <div className="p-4"><Stat label="Picked up" value={pct(q.connect_rate, 1)} size="md"
                                     comparisonLabel={`${n(q.connected)} of ${n(q.total_calls)}`} /></div>
          <div className="p-4"><Stat label="Median call length" value={dur(q.median_duration_sec)} size="md" /></div>
          <div className="p-4"><Stat label="Stayed past the AI disclosure" value={pct(tol.pct, 1)} size="md"
                                     comparisonLabel={`${n(tol.tolerated)} of ${n(tol.connected)}`} /></div>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <SectionHead
            title="When people hang up"
            hint="The first bucket is the one that matters — that is people dropping on hearing an AI."
          />
          <Bars
            data={(q.hangup_buckets ?? []).map((b: { bucket: string; n: number }) => ({
              label: b.bucket, value: b.n,
            }))}
            highlightIndex={0}
          />
        </Card>

        <Card>
          <SectionHead title="How calls ended" />
          <Bars
            data={(q.outcomes ?? []).map((o: { outcome: string; n: number }) => ({
              label: outcomeLabel(o.outcome), value: o.n,
            }))}
            color="var(--color-c3)"
          />
        </Card>
      </div>

      <Card>
        <SectionHead
          title="Why calls did not connect"
          hint="Straight from the telephony provider, not inferred."
        />
        {(q.unreachable_reasons ?? []).length ? (
          <Bars
            data={(q.unreachable_reasons ?? []).map((r: { reason: string; n: number }) => ({
              label: r.reason.replace(/-/g, ' '), value: r.n,
            }))}
            color="var(--color-c2)"
          />
        ) : (
          <Empty title="Every call connected" />
        )}
      </Card>

      {/* --------------------------------------------------------- sources */}
      <Card>
        <SectionHead
          title="Which sources actually produce buyers"
          hint="Volume is the easy number. Qualified leads per source is the useful one."
        />
        {(sources ?? []).length === 0 ? (
          <Empty title="No leads in this period" />
        ) : (
          <div className="scroll-x">
            <table className="w-full min-w-[560px] text-[13px]">
              <thead>
                <tr className="text-left" style={{ color: 'var(--fg-3)' }}>
                  <th className="font-medium px-4 py-2 text-[11px] uppercase tracking-[0.05em]">Source</th>
                  <th className="font-medium px-4 py-2 text-[11px] uppercase tracking-[0.05em] text-right">Leads</th>
                  <th className="font-medium px-4 py-2 text-[11px] uppercase tracking-[0.05em] text-right">Qualified</th>
                  <th className="font-medium px-4 py-2 text-[11px] uppercase tracking-[0.05em] text-right">Hit rate</th>
                  {isManager && (
                    <th className="font-medium px-4 py-2 text-[11px] uppercase tracking-[0.05em] text-right">
                      AI cost / qualified
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {(sources ?? []).map((r: any) => (
                  <tr key={r.source} className="hairline-t">
                    <td className="px-4 py-2.5 font-medium">{sourceLabel(r.source)}</td>
                    <td className="num px-4 py-2.5 text-right">{n(r.leads)}</td>
                    <td className="num px-4 py-2.5 text-right">{n(r.qualified)}</td>
                    <td className="num px-4 py-2.5 text-right"
                        style={{ color: r.qualified > 0 ? 'var(--color-accent)' : 'var(--fg-4)' }}>
                      {r.leads ? pct((r.qualified / r.leads) * 100) : '—'}
                    </td>
                    {isManager && (
                      <td className="num px-4 py-2.5 text-right">
                        {r.inr_per_qualified ? inr(Number(r.inr_per_qualified), { compact: false }) : '—'}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {isManager && (
          <div className="mx-4 mb-4 px-3 py-2.5 rounded-[4px]" style={{ background: 'var(--bg-2)' }}>
            <p className="text-[11px] leading-relaxed" style={{ color: 'var(--fg-3)' }}>
              <strong>Read this before quoting the cost column.</strong> That is what Crewmind
              spent — voice, messaging, AI. It does <em>not</em> include what you paid 99acres or
              Meta for the lead itself, which we cannot see. Your true cost per qualified lead is
              this plus your portal spend.
            </p>
          </div>
        )}
      </Card>

      {/* ------------------------------------------------ not built yet */}
      <Card>
        <SectionHead title="Transfers and escalations" />
        <Empty title="Not built — and the number would be fiction if it were" tone="blocked">
          Live transfer to a human during a call is not implemented. The AI currently tells the
          caller their agent will ring back instead. Charting transfers would mean charting a
          feature that does not exist.
        </Empty>
      </Card>
    </div>
  )
}
