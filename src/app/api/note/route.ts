import { NextResponse, type NextRequest } from 'next/server'
import { withSession, audit, rateLimit, tooMany } from '@/lib/api'

export async function POST(request: NextRequest) {
  const s = await withSession()
  if ('error' in s) return s.error
  if (!rateLimit(`note:${s.user.id}`)) return tooMany()

  const body = await request.json().catch(() => null)
  const leadId = body?.lead_id
  const text = typeof body?.body === 'string' ? body.body.trim().slice(0, 4000) : ''

  if (typeof leadId !== 'string' || !text) {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 })
  }

  const { error } = await s.supabase.from('lead_notes').insert({
    org_id: s.org.id,
    lead_id: leadId,
    agent_id: s.agent.id,
    body: text,
  })

  if (error) return NextResponse.json({ error: 'Could not save that note.' }, { status: 400 })

  await audit(s.supabase, s.org.id, s.agent.id, s.user.id, 'lead.note_added', 'leads', leadId)
  return NextResponse.json({ ok: true })
}
