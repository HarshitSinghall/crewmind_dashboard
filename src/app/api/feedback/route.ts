import { NextResponse, type NextRequest } from 'next/server'
import { withSession, audit, rateLimit, tooMany } from '@/lib/api'

export async function POST(request: NextRequest) {
  const s = await withSession()
  if ('error' in s) return s.error
  if (!rateLimit(`feedback:${s.user.id}`)) return tooMany()

  const body = await request.json().catch(() => null)
  const { lead_id, call_id, is_correct, reason } = body ?? {}

  if (typeof lead_id !== 'string' || typeof call_id !== 'string' || typeof is_correct !== 'boolean') {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 })
  }

  const { error } = await s.supabase.from('call_feedback').upsert(
    {
      org_id: s.org.id,
      lead_id,
      call_id,
      agent_id: s.agent.id,
      is_correct,
      reason: typeof reason === 'string' ? reason.slice(0, 500) : null,
    },
    { onConflict: 'call_id,agent_id' }
  )

  if (error) return NextResponse.json({ error: 'Could not save that feedback.' }, { status: 400 })

  await audit(s.supabase, s.org.id, s.agent.id, s.user.id, 'call.feedback', 'calls', call_id, { is_correct })
  return NextResponse.json({ ok: true })
}
