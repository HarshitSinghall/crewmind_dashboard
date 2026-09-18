import { NextResponse, type NextRequest } from 'next/server'
import { withSession, audit, rateLimit, tooMany } from '@/lib/api'

const NUMERIC_FIELDS = [
  'baseline_response_median_sec',
  'telecaller_monthly_cost_inr',
  'telecaller_hours_per_week',
  'avg_brokerage_per_deal_inr',
  'close_rate_pct',
] as const

export async function POST(request: NextRequest) {
  const s = await withSession()
  if ('error' in s) return s.error
  if (!rateLimit(`roi:${s.user.id}`, 60)) return tooMany()

  // RLS also enforces this (roi_write is owner-only), but failing here gives a
  // sentence the owner can read instead of a silent no-op.
  if (s.agent.role !== 'owner') {
    return NextResponse.json({ error: 'Only the account owner can change these figures.' }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Bad request' }, { status: 400 })

  const patch: Record<string, unknown> = {
    org_id: s.org.id,
    updated_by_agent_id: s.agent.id,
    updated_at: new Date().toISOString(),
  }

  for (const f of NUMERIC_FIELDS) {
    if (body[f] === null) { patch[f] = null; continue }
    if (body[f] === undefined) continue
    const v = Number(body[f])
    if (!Number.isFinite(v) || v < 0) {
      return NextResponse.json({ error: `${f.replace(/_/g, ' ')} must be a positive number.` }, { status: 400 })
    }
    if (f === 'close_rate_pct' && v > 100) {
      return NextResponse.json({ error: 'Close rate cannot be above 100%.' }, { status: 400 })
    }
    patch[f] = v
  }

  // A baseline the owner typed is self-reported and must always be labelled as
  // such. It is never silently promoted to a measured figure.
  if (patch.baseline_response_median_sec !== undefined) {
    patch.baseline_source = 'self_reported'
    patch.baseline_recorded_at = new Date().toISOString()
  }

  const { error } = await s.supabase.from('org_roi_assumptions').upsert(patch, { onConflict: 'org_id' })
  if (error) return NextResponse.json({ error: 'Could not save those figures.' }, { status: 400 })

  await audit(s.supabase, s.org.id, s.agent.id, s.user.id, 'roi.assumptions_updated', 'orgs', s.org.id, patch)
  return NextResponse.json({ ok: true })
}
