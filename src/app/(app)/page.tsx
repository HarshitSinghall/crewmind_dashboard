import Link from 'next/link'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { parseRange, resolveRange, comparisonLabel, rangeLabel } from '@/lib/range'
import { dur, n, pct, ago, delta } from '@/lib/format'
import { Card, SectionHead, Stat, Empty, Badge, StatSkeleton } from '@/components/ui'
import { Sparkline, Funnel } from '@/components/charts'
import { DateRange } from '@/components/DateRange'

export const dynamic = 'force-dynamic'

export default async function Overview({
  searchParams,
}: { searchParams: Promise<{ range?: string }> }) {
  const sp = await searchParams
  const key = parseRange(sp.range)

  return (
    <>
      <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
        <div>
          <h1 className="text-[19px] font-semibold tracking-tight">Overview</h1>
          <p className="text-[13px] mt-0.5" style={{ color: 'var(--fg-3)' }}>
            {rangeLabel(key)}
          </p>
        </div>
        <Suspense fallback={<div className="h-8" />}>
          <DateRange value={key} />
        </Suspense>
      </div>

      <Suspense fallback={<OverviewSkeleton />}>
        <OverviewBody rangeKey={key} />
      </Suspense>
    </>
  )
}

async function OverviewBody({ rangeKey }: { rangeKey: ReturnType<typeof parseRange> }) {
  const supabase = await createClient()
  const { data: session } = await supabase.rpc('dashboard_session')
  const { from, to } = resolveRange(rangeKey, session?.org?.onboarded_at)

  const [{ data: ov, error }, { data: attention }, { data: roi }] = await Promise.all([
    supabase.rpc('dashboard_overview', { p_from: from.toISOString(), p_to: to.toISOString() }),
    supabase.rpc('dashboard_needs_attention'),
    supabase.from('org_roi_assumptions').select('baseline_response_median_sec, baseline_source, baseline_recorded_at').maybeSingle(),
  ])

  if (error) {
    return (
      <Card>
        <SectionHead title="Could not load your figures" />
        <Empty title="Something went wrong reading the database" tone="blocked">
          {error.message}. Nothing is lost — reload the page. If it keeps happening, this is
          worth reporting.
        </Empty>
      </Card>
    )
  }

  const speed = ov?.speed ?? {}
  const funnel = ov?.funnel ?? {}
  const tol = ov?.tolerance ?? {}
  const health = ov?.health ?? {}
  const att = ov?.attention ?? {}
  const rows = (attention ?? []) as {
    lead_id: string; full_name: string; phone_e164: string; budget_band: string | null
    timeline: string | null; agent_name: string | null; handed_off_at: string; waiting_sec: number
  }[]

  const noLeads = (funnel.received ?? 0) === 0
  const noCalls = (funnel.called ?? 0) === 0
  const baseline = roi?.baseline_response_median_sec ?? null
  const vsBaseline = baseline && speed.median_sec ? baseline / speed.median_sec : null

  return (
    <div className="space-y-4">
      {/* ---------------------------------------------------------- the hero */}
      <Card>
        <div className="p-4 sm:p-6">
          {noLeads ? (
            <Empty title="No leads in this period yet">
              Once a lead arrives from a portal or an ad, this is where you will see how fast it
              was called. Try a wider date range above.
            </Empty>
          ) : speed.median_sec == null ? (
            <Empty title="No lead has been dialled yet" tone="blocked">
              {n(funnel.received)} leads arrived, but none has a first-call time recorded. That
              usually means calling has not been switched on for this account.
            </Empty>
          ) : (
            <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr] lg:items-center">
              <div>
                <Stat
                  label="Median time to first call"
                  value={dur(speed.median_sec)}
                  size="hero"
                  current={speed.median_sec}
                  previous={speed.prev_median_sec}
                  lowerIsBetter
                  comparisonLabel={comparisonLabel(rangeKey)}
                />
                <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-[12px]">
                  <span>
                    <span style={{ color: 'var(--fg-3)' }}>90th percentile </span>
                    <span className="num font-semibold">{dur(speed.p90_sec)}</span>
                  </span>
                  <span>
                    <span style={{ color: 'var(--fg-3)' }}>Called within 60s </span>
                    <span className="num font-semibold">{pct(speed.guarantee_pct, 1)}</span>
                  </span>
                  {speed.never_attempted > 0 && (
                    <span style={{ color: 'var(--color-alert)' }}>
                      <span className="num font-semibold">{n(speed.never_attempted)}</span> never
                      dialled
                    </span>
                  )}
                </div>
              </div>

              {baseline ? (
                <div
                  className="rounded-[4px] p-4 border"
                  style={{ background: 'var(--color-accent-wash)', borderColor: '#bcd9d0' }}
                >
                  <div className="text-[12px] font-medium uppercase tracking-[0.06em]" style={{ color: '#1a5c4c' }}>
                    Against your own “before” number
                  </div>
                  <div className="mt-2.5 flex items-baseline gap-3 flex-wrap">
                    <span className="num text-[24px] font-semibold line-through" style={{ color: '#4e7a6e' }}>
                      {dur(baseline)}
                    </span>
                    <span style={{ color: '#4e7a6e' }} aria-hidden>→</span>
                    <span className="num text-[30px] font-semibold" style={{ color: '#123f34' }}>
                      {dur(speed.median_sec)}
                    </span>
                  </div>
                  {vsBaseline && vsBaseline > 1.2 && (
                    <p className="mt-2 text-[13px] font-medium" style={{ color: '#1a5c4c' }}>
                      {vsBaseline >= 10 ? `${Math.round(vsBaseline)}×` : `${vsBaseline.toFixed(1)}×`} faster
                      than before you started.
                    </p>
                  )}
                  <p className="mt-2 text-[11px] leading-snug" style={{ color: '#3d6b5e' }}>
                    Your figure, entered {ago(roi?.baseline_recorded_at)}. We did not measure it.
                  </p>
                </div>
              ) : (
                <div className="rounded-[4px] p-4 border border-dashed" style={{ borderColor: 'var(--line)' }}>
                  <div className="text-[12px] font-medium">No “before” number recorded</div>
                  <p className="mt-1.5 text-[12px] leading-relaxed" style={{ color: 'var(--fg-3)' }}>
                    The most convincing comparison is against your own response time before
                    Crewmind. Add it once and it anchors every screen.
                  </p>
                  <Link
                    href="/roi"
                    className="focusable inline-block mt-2.5 text-[12px] font-medium"
                    style={{ color: 'var(--color-accent)' }}
                  >
                    Add your baseline →
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* --------------------------------------- leads waiting on a human */}
      <Card
        className={rows.length > 0 ? 'border-2' : ''}
        {...(rows.length > 0 ? { style: { borderColor: 'var(--color-alert)' } } : {})}
      >
        <SectionHead
          title="Waiting on your team right now"
          hint="Qualified by the AI, handed over, and nobody has called back yet."
          right={
            rows.length > 0 ? (
              <Badge tone="alert">{n(rows.length)} waiting</Badge>
            ) : (
              <Badge tone="good">All clear</Badge>
            )
          }
        />
        {rows.length === 0 ? (
          <Empty title="Nothing is sitting unactioned">
            Every qualified lead has been followed up. This is the state you want.
          </Empty>
        ) : (
          <div className="scroll-x">
            <table className="w-full min-w-[560px] text-[13px]">
              <thead>
                <tr className="text-left" style={{ color: 'var(--fg-3)' }}>
                  <th className="font-medium px-4 py-2 text-[11px] uppercase tracking-[0.05em]">Waiting</th>
                  <th className="font-medium px-4 py-2 text-[11px] uppercase tracking-[0.05em]">Lead</th>
                  <th className="font-medium px-4 py-2 text-[11px] uppercase tracking-[0.05em]">Budget</th>
                  <th className="font-medium px-4 py-2 text-[11px] uppercase tracking-[0.05em]">Assigned</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 8).map((r) => {
                  const hours = r.waiting_sec / 3600
                  return (
                    <tr key={r.lead_id} className="hairline-t">
                      <td className="px-4 py-2.5">
                        <span
                          className="num font-semibold"
                          style={{ color: hours > 4 ? 'var(--color-danger)' : hours > 1 ? 'var(--color-alert)' : 'var(--fg)' }}
                        >
                          {dur(r.waiting_sec)}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <Link
                          href={`/leads/${r.lead_id}`}
                          className="focusable font-medium hover:underline"
                        >
                          {r.full_name ?? 'Unnamed'}
                        </Link>
                        <div className="num text-[12px]" style={{ color: 'var(--fg-3)' }}>
                          {r.phone_e164}
                        </div>
                      </td>
                      <td className="px-4 py-2.5" style={{ color: 'var(--fg-2)' }}>
                        {r.budget_band?.replace(/_/g, ' ') ?? '—'}
                      </td>
                      <td className="px-4 py-2.5" style={{ color: 'var(--fg-2)' }}>
                        {r.agent_name ?? 'Unassigned'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {rows.length > 8 && (
              <div className="px-4 py-2.5 hairline-t">
                <Link
                  href="/leads?followup=1"
                  className="focusable text-[12px] font-medium"
                  style={{ color: 'var(--color-accent)' }}
                >
                  See all {n(rows.length)} waiting →
                </Link>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* ------------------------------------------------- funnel + tolerance */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <SectionHead
            title="What happened to your leads"
            hint="Each step is a subset of the one above it."
          />
          {noCalls ? (
            <Empty title="No calls placed in this period">
              Leads arrived but none was dialled. Check that calling is enabled.
            </Empty>
          ) : (
            <Funnel
              steps={[
                { label: 'Received', value: funnel.received ?? 0 },
                { label: 'Called', value: funnel.called ?? 0 },
                { label: 'Picked up', value: funnel.connected ?? 0 },
                { label: 'Qualified', value: funnel.qualified ?? 0 },
              ]}
            />
          )}
        </Card>

        <div className="space-y-4">
          <Card>
            <SectionHead
              title="Stayed on the line"
              hint="Of the people who picked up, how many did not hang up on the AI."
            />
            {!tol.connected ? (
              <Empty title="Nobody has picked up yet in this period">
                This is the number that tells you whether people will talk to an AI at all. It
                needs completed calls before it means anything.
              </Empty>
            ) : (
              <div className="px-4 pb-4">
                <Stat
                  label="AI tolerance"
                  value={pct(tol.pct, 1)}
                  size="lg"
                  comparisonLabel={`${n(tol.tolerated)} of ${n(tol.connected)} who picked up`}
                />
                <div className="mt-3 h-2 rounded-[2px] overflow-hidden flex" style={{ background: 'var(--bg-2)' }}>
                  <div style={{ width: `${tol.pct ?? 0}%`, background: 'var(--color-accent)' }} />
                  <div style={{ width: `${100 - (tol.pct ?? 0)}%`, background: 'var(--color-alert)' }} />
                </div>
                <p className="mt-2.5 text-[11px] leading-snug" style={{ color: 'var(--fg-4)' }}>
                  Measured as staying past 15 seconds — roughly where the AI disclosure lands. It
                  is a proxy, not a certainty: someone may have hung up because they were driving.
                </p>
              </div>
            )}
          </Card>

          <Card>
            <SectionHead title="Daily lead volume" hint={rangeLabel(rangeKey)} />
            <div className="px-4 pb-4">
              {(ov?.sparkline ?? []).length > 1 ? (
                <>
                  <Sparkline data={ov.sparkline} label="Leads received per day" height={44} />
                  <div className="flex justify-between mt-1.5 text-[11px]" style={{ color: 'var(--fg-4)' }}>
                    <span className="num">{n(funnel.received)} total</span>
                    <span className="num">
                      {(funnel.received / Math.max((ov.sparkline ?? []).length, 1)).toFixed(1)}/day avg
                    </span>
                  </div>
                </>
              ) : (
                <p className="text-[12px] py-3" style={{ color: 'var(--fg-3)' }}>
                  Not enough days in this range to draw a trend.
                </p>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* ------------------------------------------------------------ health */}
      {(health.stuck_calls > 0 || health.unreconciled_calls > 0) && (
        <Card className="border-2" {...{ style: { borderColor: 'var(--color-alert)' } }}>
          <SectionHead
            title="Something needs attention in the system"
            hint="This panel stays hidden when everything is working."
          />
          <div className="px-4 pb-4">
            <p className="text-[13px] leading-relaxed">
              <span className="num font-semibold">{n(health.stuck_calls)}</span> call
              {health.stuck_calls === 1 ? ' has' : 's have'} been sitting in a ringing state for
              over 30 minutes without a result coming back.
            </p>
            <p className="mt-2 text-[12px] leading-relaxed" style={{ color: 'var(--fg-3)' }}>
              This almost always means the voice provider is not sending its end-of-call reports
              to us. Transcripts, outcomes and costs for those calls will be missing until it is
              reconnected. Worth flagging to whoever runs your setup.
            </p>
          </div>
        </Card>
      )}
    </div>
  )
}

function OverviewSkeleton() {
  return (
    <div className="space-y-4">
      <div className="card"><StatSkeleton /></div>
      <div className="card"><StatSkeleton /></div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card"><StatSkeleton /></div>
        <div className="card"><StatSkeleton /></div>
      </div>
    </div>
  )
}
