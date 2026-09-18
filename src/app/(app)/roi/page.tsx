import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { parseRange, resolveRange, rangeLabel } from '@/lib/range'
import { inr, n, dur, ist } from '@/lib/format'
import { Card, SectionHead, Stat, Empty, StatSkeleton } from '@/components/ui'
import { DateRange } from '@/components/DateRange'
import { RoiInputs } from '@/components/RoiInputs'
import { PrintButton } from '@/components/PrintButton'

export const dynamic = 'force-dynamic'

export default async function RoiPage({
  searchParams,
}: { searchParams: Promise<{ range?: string }> }) {
  const sp = await searchParams
  const key = parseRange(sp.range)

  return (
    <>
      <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
        <div>
          <h1 className="text-[19px] font-semibold tracking-tight">What this is worth to you</h1>
          <p className="text-[13px] mt-0.5" style={{ color: 'var(--fg-3)' }}>{rangeLabel(key)}</p>
        </div>
        <div className="flex items-center gap-2">
          <PrintButton />
          <Suspense fallback={<div className="h-8" />}>
            <DateRange value={key} />
          </Suspense>
        </div>
      </div>

      <Suspense fallback={<div className="card"><StatSkeleton /></div>}>
        <RoiBody rangeKey={key} />
      </Suspense>
    </>
  )
}

async function RoiBody({ rangeKey }: { rangeKey: ReturnType<typeof parseRange> }) {
  const supabase = await createClient()
  const { data: session } = await supabase.rpc('dashboard_session')
  const role = session?.agent?.role

  // An agent has no business on this screen, and RLS would return nothing
  // anyway. Say so rather than rendering a page of dashes.
  if (role !== 'owner' && role !== 'manager') {
    return (
      <Card>
        <Empty title="This screen is for the account owner">
          Cost and revenue figures are not shown to agent accounts. Nothing is wrong with your
          login.
        </Empty>
      </Card>
    )
  }

  const { from, to } = resolveRange(rangeKey, session?.org?.onboarded_at)
  const { data, error } = await supabase.rpc('dashboard_roi', {
    p_from: from.toISOString(),
    p_to: to.toISOString(),
  })

  if (error) {
    return <Card><Empty title="Could not load these figures" tone="blocked">{error.message}</Empty></Card>
  }

  const d = data?.delivered ?? {}
  const plan = data?.plan ?? {}
  const a = data?.assumptions ?? {}
  const aiCost = Number(data?.ai_cost_inr ?? 0)

  const hours = (d.calling_seconds ?? 0) / 3600
  const periodDays = Math.max((to.getTime() - from.getTime()) / 86400000, 1)
  const months = periodDays / 30.44

  // Telecaller equivalent: what it would cost to buy the same calling hours at
  // his own stated telecaller rate. Only computed when he has given both inputs.
  const telecallerHourly =
    a.telecaller_monthly_cost_inr && a.telecaller_hours_per_week
      ? Number(a.telecaller_monthly_cost_inr) / (Number(a.telecaller_hours_per_week) * 4.33)
      : null
  const equivalentCost = telecallerHourly ? telecallerHourly * hours : null
  const subscription = plan.price_inr ? Number(plan.price_inr) * months : null

  if (!d.leads_handled) {
    return (
      <Card>
        <Empty title="No leads in this period">
          This screen adds up what the system actually did for you. Try a wider date range.
        </Empty>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* ------------------------------------------------------ delivered */}
      <Card>
        <SectionHead title="What Crewmind did" hint="All measured. None of this is estimated." />
        <div className="px-4 pb-4 grid gap-5 grid-cols-2 lg:grid-cols-4">
          <Stat label="Leads handled" value={n(d.leads_handled)} size="md" />
          <Stat label="Calls placed" value={n(d.calls_made)} size="md" />
          <Stat
            label="Hours of calling"
            value={hours < 1 ? dur(d.calling_seconds) : `${hours.toFixed(1)}`}
            unit={hours >= 1 ? 'hrs' : undefined}
            size="md"
          />
          <Stat
            label="Calls outside office hours"
            value={n(d.out_of_hours_calls)}
            size="md"
            comparisonLabel={
              d.calls_made
                ? `${Math.round((d.out_of_hours_calls / d.calls_made) * 100)}% of all calls`
                : undefined
            }
          />
        </div>
        {d.out_of_hours_calls > 0 && (
          <div className="mx-4 mb-4 px-3.5 py-3 rounded-[4px]" style={{ background: 'var(--color-accent-wash)' }}>
            <p className="text-[13px] leading-relaxed" style={{ color: '#1a5c4c' }}>
              <span className="num font-semibold">{n(d.out_of_hours_calls)}</span> of those calls
              happened before 10am, after 7pm, or on a Sunday — when a telecaller is not at a desk
              and a lead would otherwise have waited until morning.
            </p>
          </div>
        )}
      </Card>

      {/* --------------------------------------------------- the comparison */}
      <Card>
        <SectionHead
          title="Against a telecaller"
          hint="Your figures, applied to the calling hours we actually delivered."
        />
        {equivalentCost === null ? (
          <Empty title="Tell us what a telecaller costs you">
            Fill in the two telecaller fields below and this becomes a real comparison rather than
            a number we made up.
          </Empty>
        ) : (
          <div className="px-4 pb-4">
            <div className="grid gap-5 sm:grid-cols-3">
              <Stat
                label="Same hours from a telecaller"
                value={inr(equivalentCost)}
                size="lg"
                comparisonLabel={`at ${inr(telecallerHourly!, { compact: false })}/hour, your figure`}
              />
              <Stat
                label="What you paid Crewmind"
                value={subscription ? inr(subscription) : '—'}
                size="lg"
                comparisonLabel={plan.price_inr ? `${inr(Number(plan.price_inr))}/month` : 'no plan price set'}
              />
              <Stat
                label="Difference"
                value={subscription ? inr(equivalentCost - subscription) : '—'}
                size="lg"
                comparisonLabel="over this period"
              />
            </div>
            <p className="mt-4 text-[12px] leading-relaxed" style={{ color: 'var(--fg-3)' }}>
              This compares calling hours only. It does not put a price on the calls that happened
              at 9pm on a Sunday, and it does not claim a telecaller would have reached the same
              leads in the same time — they would not have, which is the point of the speed screen.
            </p>
          </div>
        )}
      </Card>

      {/* ------------------------------------------------- his own numbers */}
      <Card>
        <SectionHead
          title="Your numbers"
          hint="Everything here is yours. Change anything and the figures move with it."
        />
        <RoiInputs
          initial={{
            baseline_response_median_sec: a.baseline_response_median_sec ?? null,
            telecaller_monthly_cost_inr: a.telecaller_monthly_cost_inr ? Number(a.telecaller_monthly_cost_inr) : null,
            telecaller_hours_per_week: a.telecaller_hours_per_week ? Number(a.telecaller_hours_per_week) : null,
            avg_brokerage_per_deal_inr: a.avg_brokerage_per_deal_inr ? Number(a.avg_brokerage_per_deal_inr) : null,
            close_rate_pct: a.close_rate_pct ? Number(a.close_rate_pct) : null,
          }}
          qualified={d.qualified ?? 0}
          canEdit={role === 'owner'}
        />
      </Card>

      {/* ------------------------------------------------------ running cost */}
      <Card>
        <SectionHead
          title="What it cost to run"
          hint="Voice, messaging and AI for this period, converted at the rate in force when each cost was incurred."
        />
        <div className="px-4 pb-4">
          <div className="num text-[26px] font-semibold">{inr(aiCost, { compact: false })}</div>
          <p className="mt-2 text-[12px] leading-relaxed" style={{ color: 'var(--fg-3)' }}>
            Shown for transparency. This is our cost of delivery, not something you are billed for
            separately — your subscription covers it.
          </p>
        </div>
      </Card>

      <p className="text-[11px] leading-relaxed" style={{ color: 'var(--fg-4)' }}>
        Period {ist(from, 'date')} – {ist(new Date(to.getTime() - 1), 'date')} · All times IST ·
        Generated {ist(new Date())}
        {plan.is_demo && ' · DEMO TENANT, figures are generated sample data'}
      </p>
    </div>
  )
}
