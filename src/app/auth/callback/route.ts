import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // Only ever redirect to a same-origin path. An open redirect here would
      // let a crafted magic link bounce a signed-in owner to an attacker page.
      const safe = next.startsWith('/') && !next.startsWith('//') ? next : '/'
      return NextResponse.redirect(`${origin}${safe}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=link_expired`)
}
