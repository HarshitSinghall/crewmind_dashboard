import { NextResponse, type NextRequest } from 'next/server'
import { withSession, audit, rateLimit, tooMany } from '@/lib/api'

export async function POST(request: NextRequest) {
  const s = await withSession()
  if ('error' in s) return s.error
  if (!rateLimit(`touch:${s.user.id}`)) return tooMany()

  const body = await request.json().catch(() => null)
  const leadId = body?.lead_id
  if (typeof leadId !== 'string' || !/^[0-9a-f-]{36}$/i.test(leadId)) {
    return NextResponse.json({ error: 'Bad lead id' }, { status: 400 })
  }

  const { error } = await s.supabase.from('lead_touches').insert({
    org_id: s.org.id,
    lead_id: leadId,
    agent_id: s.agent.id,
    channel: 'voice',
    source: 'dashboard',
    note: typeof body?.note === 'string' ? body.note.slice(0, 500) : null,
  })

  if (error) {
    // RLS rejects a lead outside the caller's org or outside an agent's own
    // assignments. That is the policy working, not a bug.
    return NextResponse.json({ error: 'Could not record that contact.' }, { status: 400 })
  }

  await audit(s.supabase, s.org.id, s.agent.id, s.user.id, 'lead.marked_contacted', 'leads', leadId)
  return NextResponse.json({ ok: true })
}
