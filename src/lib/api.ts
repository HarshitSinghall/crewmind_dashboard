import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Shared guard for every write route.
 *
 * Note what is NOT here: an org_id from the request body. The tenant is read
 * from the session server-side and the row is written with it. A client that
 * posts {"org_id": "<someone else's>"} gets its own org anyway, and would be
 * rejected by RLS regardless.
 */
export async function withSession() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    return { error: NextResponse.json({ error: 'Not signed in' }, { status: 401 }) } as const
  }
  const { data: session } = await supabase.rpc('dashboard_session')
  if (!session?.org?.id || !session?.agent?.id) {
    return {
      error: NextResponse.json(
        { error: 'Your account is not linked to a brokerage' },
        { status: 403 }
      ),
    } as const
  }
  return { supabase, user, org: session.org, agent: session.agent } as const
}

/** Records a sensitive action. Failures here never block the action itself. */
export async function audit(
  supabase: Awaited<ReturnType<typeof createClient>>,
  orgId: string,
  agentId: string,
  userId: string,
  action: string,
  targetTable: string,
  targetId: string,
  metadata: Record<string, unknown> = {}
) {
  await supabase.from('audit_log').insert({
    org_id: orgId,
    actor_agent_id: agentId,
    actor_auth_user_id: userId,
    action,
    target_table: targetTable,
    target_id: targetId,
    metadata,
  })
}

/**
 * Crude per-process rate limit. Honest about what it is: this resets on every
 * cold start and is per-instance, so it stops a stuck retry loop and a casual
 * script, not a determined attacker. Real limiting belongs at the edge.
 */
const hits = new Map<string, { count: number; resetAt: number }>()

export function rateLimit(key: string, limit = 30, windowMs = 60_000): boolean {
  const now = Date.now()
  const entry = hits.get(key)
  if (!entry || now > entry.resetAt) {
    hits.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }
  if (entry.count >= limit) return false
  entry.count += 1
  return true
}

export function tooMany() {
  return NextResponse.json({ error: 'Slow down a moment and try again.' }, { status: 429 })
}
