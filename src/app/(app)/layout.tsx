import { Suspense } from 'react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Nav } from '@/components/Nav'
import { DemoBanner } from '@/components/ui'
import { SignOut } from '@/components/SignOut'
import { LiveRefresh } from '@/components/LiveRefresh'
import { ThemeToggle } from '@/components/ThemeToggle'

export const dynamic = 'force-dynamic'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: session } = await supabase.rpc('dashboard_session')
  const org = session?.org
  const agent = session?.agent

  if (!org) {
    return (
      <main className="min-h-dvh flex items-center justify-center px-5">
        <div className="max-w-[420px] text-center">
          <h1 className="text-[20px] font-semibold">Your account is not linked to a brokerage</h1>
          <p className="mt-2 text-[14px] leading-relaxed" style={{ color: 'var(--fg-3)' }}>
            You are signed in as {user.email}, but no organisation is attached to this account.
            Ask the person who set up your account to complete the organisation link.
          </p>
          <div className="mt-5"><SignOut /></div>
        </div>
      </main>
    )
  }

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
      <a href="#main" className="skip-link">Skip to content</a>

      <aside className="side-rail print:hidden">
        <Link href="/" className="focusable brand-lockup">
          <span className="brand-mark" aria-hidden>CM</span>
          <span className="min-w-0">
            <span className="block text-[17px] font-semibold tracking-[-0.025em]">Crewmind</span>
            <span className="block truncate text-[12px]" style={{ color: 'var(--fg-3)' }}>{org.name}</span>
          </span>
        </Link>
        <Suspense fallback={<div className="h-56" />}><Nav /></Suspense>

        <div className="mt-auto pt-5 border-t space-y-3" style={{ borderColor: 'var(--line)' }}>
          <LiveRefresh />
          {agent && (
            <div className="min-w-0">
              <p className="truncate text-[13px] font-medium">{agent.name}</p>
              <p className="text-[11px] capitalize" style={{ color: 'var(--fg-3)' }}>{agent.role}</p>
            </div>
          )}
          <div className="flex items-center gap-2"><ThemeToggle /><SignOut /></div>
        </div>
      </aside>

      <div className="min-w-0">
        {org.is_demo && <DemoBanner orgName={org.name} />}
        <header className="mobile-header print:hidden">
          <Link href="/" className="focusable flex items-center gap-2 min-w-0">
            <span className="brand-mark brand-mark-small" aria-hidden>CM</span>
            <span className="font-semibold tracking-tight">Crewmind</span>
          </Link>
          <div className="flex items-center gap-2"><ThemeToggle /><SignOut /></div>
        </header>

        <main id="main" className="app-main">{children}</main>

        <footer className="app-footer">
          <p className="text-[11px] leading-relaxed" style={{ color: 'var(--fg-4)' }}>
            All times shown in IST. Figures update as calls complete.
            {org.is_demo && ' This tenant contains generated sample data.'}
          </p>
        </footer>
        <Suspense fallback={null}><Nav variant="mobile" /></Suspense>
      </div>
    </div>
  )
}
