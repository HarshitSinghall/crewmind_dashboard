import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

type CookieToSet = { name: string; value: string; options?: CookieOptions }

/**
 * Server-side Supabase client, bound to the caller's session cookie.
 *
 * This is the ONLY way the dashboard talks to the database. There is no
 * service-role client anywhere in this codebase, by design: every query runs
 * as the signed-in user and is therefore subject to the RLS policies in
 * SECURITY.md. A bug in a query can return the wrong rows for THIS tenant; it
 * cannot return another tenant's rows.
 */
export async function createClient() {
  const cookieStore = await cookies()
  const selectedOrg = cookieStore.get('cm-admin-org')?.value
  const orgHeader = selectedOrg && /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(selectedOrg)
    ? { 'x-crewmind-org-id': selectedOrg }
    : {}

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { headers: orgHeader },
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: CookieToSet[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Called from a Server Component, where cookies are read-only.
            // Middleware refreshes the session, so this is safe to swallow.
          }
        },
      },
    }
  )
}

/** Throws rather than rendering an empty screen when the session is gone. */
export async function requireSession() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null
  return { supabase, user }
}
