import Link from 'next/link'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { parseRange, resolveRange, rangeLabel } from '@/lib/range'
import {
  dur, n, ago, ist, outcomeLabel, budgetLabel, timelineLabel, sourceLabel,
} from '@/lib/format'
import { Card, Badge, Empty, outcomeTone, Skeleton } from '@/components/ui'
import { DateRange } from '@/components/DateRange'
import { LeadFilters } from '@/components/LeadFilters'

export const dynamic = 'force-dynamic'

// 25, not 50. He opens this on an Android on patchy 4G; a page of 50 rows more
// than doubles the HTML for rows he has to scroll past anyway.
const PAGE = 25

type Row = {
  id: string; full_name: string | null; phone_e164: string | null; source: string
  lead_received_at: string; speed_to_first_touch_sec: number | null
  budget_band: string | null; timeline: string | null; financing_status: string | null
  status: string; track: string; score: number; agent_name: string | null
  last_call_outcome: string | null; last_call_duration_sec: number | null
  last_touch_at: string | null; qualified_at: string | null
  transcript_snippet: string | null
}

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; q?: string; source?: string; status?: string; followup?: string; page?: string }>
}) {
  const sp = await searchParams
  const key = parseRange(sp.range)

  return (
    <>
      <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
        <div>
          <h1 className="text-[19px] font-semibold tracking-tight">Leads</h1>
          <p className="text-[13px] mt-0.5" style={{ color: 'var(--fg-3)' }}>
            {rangeLabel(key)}
          </p>
        </div>
        <Suspense fallback={<div className="h-8" />}>
          <DateRange value={key} />
        </Suspense>
      </div>

      <Suspense fallback={<div className="h-10 mb-4"><Skeleton className="h-9 w-full" /></div>}>
        <LeadFilters />
      </Suspense>

      <Suspense key={JSON.stringify(sp)} fallback={<ListSkeleton />}>
        <LeadsBody sp={sp} rangeKey={key} />
      </Suspense>
    </>
  )
}

async function LeadsBody({
  sp, rangeKey,
}: {
  sp: { q?: string; source?: string; status?: string; followup?: string; page?: string }
  rangeKey: ReturnType<typeof parseRange>
}) {
  const supabase = await createClient()
  const { data: session } = await supabase.rpc('dashboard_session')
  const { from, to } = resolveRange(rangeKey, session?.org?.onboarded_at)
  const page = Math.max(parseInt(sp.page ?? '1', 10) || 1, 1)

  const { data, error } = await supabase.rpc('dashboard_leads', {
    p_from: from.toISOString(),
    p_to: to.toISOString(),
    p_search: sp.q?.trim() || null,
    p_source: sp.source || null,
    p_status: sp.status || null,
    p_needs_followup: sp.followup === '1',
    p_limit: PAGE,
    p_offset: (page - 1) * PAGE,
  })

  if (error) {
    return (
      <Card>
        <Empty title="Could not load the lead list" tone="blocked">{error.message}</Empty>
      </Card>
    )
  }

  const rows = (data?.rows ?? []) as Row[]
  const total = data?.total ?? 0
  const pages = Math.ceil(total / PAGE)
  const detailSuffix = `?range=${rangeKey}`

  if (rows.length === 0) {
    return (
      <Card>
        <Empty title={sp.q ? `Nothing matches “${sp.q}”` : 'No leads in this period'}>
          {sp.q ? (
            <>
              Search covers names, phone numbers and the words spoken in every call transcript.
              Try a shorter phrase, or widen the date range.
            </>
          ) : sp.followup === '1' ? (
            <>No qualified lead is waiting on a callback. That is the state you want.</>
          ) : (
            <>Leads appear here the moment they arrive from a portal, an ad, or your website.</>
          )}
        </Empty>
      </Card>
    )
  }

  return (
    <>
      <p className="text-[12px] mb-2.5" style={{ color: 'var(--fg-3)' }}>
        <span className="num font-medium">{n(total)}</span> lead{total === 1 ? '' : 's'}
        {sp.q && <> matching “{sp.q}”</>}
      </p>

      {/* ------------------------------------------- mobile: cards */}
      <div className="space-y-2 md:hidden">
        {rows.map((r) => (
          <Link key={r.id} href={`/leads/${r.id}${detailSuffix}`} className="focusable block card p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="font-medium text-[14px] truncate">{r.full_name ?? 'Unnamed'}</div>
                <div className="num text-[12px]" style={{ color: 'var(--fg-3)' }}>{r.phone_e164}</div>
              </div>
              <Badge tone={outcomeTone(r.last_call_outcome)}>{outcomeLabel(r.last_call_outcome)}</Badge>
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px]" style={{ color: 'var(--fg-2)' }}>
              <span>{sourceLabel(r.source)}</span>
              <span className="num">
                called in {dur(r.speed_to_first_touch_sec)}
              </span>
              {r.budget_band && <span>{budgetLabel(r.budget_band)}</span>}
            </div>
            <div className="mt-1.5 flex items-center justify-between gap-3">
              <span className="text-[11px]" style={{ color: 'var(--fg-4)' }}>{ago(r.lead_received_at)}</span>
              <FollowUpChip row={r} />
            </div>
            {r.transcript_snippet && <Snippet text={r.transcript_snippet} />}
          </Link>
        ))}
      </div>

      {/* -------------------------------------------- desktop: table */}
      <Card className="hidden md:block">
        <div className="scroll-x">
          <table className="w-full min-w-[900px] text-[13px]">
            <thead>
              <tr className="text-left" style={{ color: 'var(--fg-3)' }}>
                {['Lead', 'Source', 'Received', 'Called in', 'Outcome', 'Qualification', 'Agent', 'Last human touch'].map((h) => (
                  <th key={h} className="font-medium px-3 py-2 text-[11px] uppercase tracking-[0.05em] whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="hairline-t align-top">
                  <td className="px-3 py-2.5">
                    <Link href={`/leads/${r.id}${detailSuffix}`} className="focusable font-medium hover:underline">
                      {r.full_name ?? 'Unnamed'}
                    </Link>
                    <div className="num text-[12px]" style={{ color: 'var(--fg-3)' }}>{r.phone_e164}</div>
                    {r.transcript_snippet && <Snippet text={r.transcript_snippet} />}
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap" style={{ color: 'var(--fg-2)' }}>
                    {sourceLabel(r.source)}
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap" style={{ color: 'var(--fg-2)' }}>
                    <span title={ist(r.lead_received_at)}>{ago(r.lead_received_at)}</span>
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <span
                      className="num font-medium"
                      style={{
                        color: r.speed_to_first_touch_sec == null ? 'var(--fg-4)'
                          : r.speed_to_first_touch_sec <= 60 ? 'var(--color-accent)'
                          : r.speed_to_first_touch_sec <= 600 ? 'var(--fg)'
                          : 'var(--color-alert)',
                      }}
                    >
                      {r.speed_to_first_touch_sec == null ? 'not dialled' : dur(r.speed_to_first_touch_sec)}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <Badge tone={outcomeTone(r.last_call_outcome)}>{outcomeLabel(r.last_call_outcome)}</Badge>
                    {r.last_call_duration_sec != null && r.last_call_duration_sec > 0 && (
                      <div className="num text-[11px] mt-0.5" style={{ color: 'var(--fg-4)' }}>
                        {dur(r.last_call_duration_sec)}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-[12px]" style={{ color: 'var(--fg-2)' }}>
                    {r.budget_band || r.timeline || r.financing_status ? (
                      <div className="space-y-0.5">
                        {r.budget_band && <div>{budgetLabel(r.budget_band)}</div>}
                        {r.timeline && <div>{timelineLabel(r.timeline)}</div>}
                        {r.financing_status && r.financing_status !== 'unknown' && (
                          <div style={{ color: 'var(--fg-3)' }}>{r.financing_status.replace(/_/g, ' ')}</div>
                        )}
                      </div>
                    ) : (
                      <span style={{ color: 'var(--fg-4)' }}>—</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap" style={{ color: 'var(--fg-2)' }}>
                    {r.agent_name ?? <span style={{ color: 'var(--fg-4)' }}>Unassigned</span>}
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <FollowUpChip row={r} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {pages > 1 && <Pager page={page} pages={pages} sp={sp} />}
    </>
  )
}

function FollowUpChip({ row }: { row: Row }) {
  if (row.last_touch_at) {
    return (
      <span className="text-[12px]" style={{ color: 'var(--fg-2)' }} title={ist(row.last_touch_at)}>
        {ago(row.last_touch_at)}
      </span>
    )
  }
  if (row.qualified_at) return <Badge tone="alert">Never followed up</Badge>
  return <span className="text-[12px]" style={{ color: 'var(--fg-4)' }}>—</span>
}

function Snippet({ text }: { text: string }) {
  // ts_headline wraps matches in « » so the highlight survives the JSON trip
  // without ever putting server HTML into dangerouslySetInnerHTML.
  const parts = text.split(/(«[^»]*»)/g)
  return (
    <p className="deva mt-1 text-[12px] leading-snug max-w-[46ch]" style={{ color: 'var(--fg-3)' }}>
      …{parts.map((p, i) =>
        p.startsWith('«') ? (
          <mark
            key={i}
            className="px-0.5 rounded-[2px]"
            style={{ background: 'var(--color-accent-wash)', color: 'var(--color-ink)' }}
          >
            {p.slice(1, -1)}
          </mark>
        ) : (
          <span key={i}>{p}</span>
        )
      )}…
    </p>
  )
}

function Pager({
  page, pages, sp,
}: { page: number; pages: number; sp: Record<string, string | undefined> }) {
  const link = (p: number) => {
    const q = new URLSearchParams()
    Object.entries(sp).forEach(([k, v]) => v && k !== 'page' && q.set(k, v))
    q.set('page', String(p))
    return `/leads?${q.toString()}`
  }
  return (
    <div className="flex items-center justify-between gap-4 mt-4">
      <span className="num text-[12px]" style={{ color: 'var(--fg-3)' }}>
        Page {page} of {pages}
      </span>
      <div className="flex gap-2">
        {page > 1 && (
          <Link href={link(page - 1)} className="focusable px-3 py-1.5 text-[13px] rounded-[4px] border"
                style={{ borderColor: 'var(--line)' }}>
            Previous
          </Link>
        )}
        {page < pages && (
          <Link href={link(page + 1)} className="focusable px-3 py-1.5 text-[13px] rounded-[4px] border"
                style={{ borderColor: 'var(--line)' }}>
            Next
          </Link>
        )}
      </div>
    </div>
  )
}

function ListSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="card p-3">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-64 mt-2" />
        </div>
      ))}
    </div>
  )
}
