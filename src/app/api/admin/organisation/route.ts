import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type Organisation = { id: string }

export async function POST(request: NextRequest) {
  if (request.headers.get('origin') !== request.nextUrl.origin ||
      request.headers.get('x-crewmind-request') !== '1') {
    return NextResponse.json({ error: 'Invalid request' }, { status: 403 })
  }

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  }

  const { data: orgs, error } = await supabase.rpc('dashboard_admin_orgs')
  if (error || !Array.isArray(orgs) || orgs.length === 0) {
    return NextResponse.json({ error: 'Not an administrator' }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  const orgId = body?.org_id
  if (typeof orgId !== 'string' ||
      !orgs.some((org: Organisation) => org.id === orgId)) {
    return NextResponse.json({ error: 'Unknown brokerage' }, { status: 400 })
  }

  const response = NextResponse.json({ ok: true })
  response.cookies.set('cm-admin-org', orgId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  })
  return response
}
