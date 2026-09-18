'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

/**
 * Production auth is magic link only.
 *
 * The password form below appears ONLY when NEXT_PUBLIC_ALLOW_PASSWORD_LOGIN is
 * "true", which is set in .env.local and must never be set in production. It
 * exists so an authorized disposable staging account can be used locally even
 * when it cannot receive a magic link. Account identifiers remain in local
 * environment configuration and are never bundled into this page.
 *
 * Passwords exist only on users belonging to is_demo tenants - see SECURITY.md.
 */
const ALLOW_PASSWORD = process.env.NEXT_PUBLIC_ALLOW_PASSWORD_LOGIN === 'true'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'link' | 'password'>(ALLOW_PASSWORD ? 'password' : 'link')
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [message, setMessage] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setState('sending')
    setMessage('')
    try {
      const supabase = createClient()

      if (mode === 'password') {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        })
        if (error) {
          setState('error')
          setMessage(error.message)
        } else {
          router.push('/')
          router.refresh()
        }
        return
      }

      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          shouldCreateUser: false,
        },
      })
      if (error) {
        setState('error')
        setMessage(error.message)
      } else {
        setState('sent')
      }
    } catch {
      setState('error')
      setMessage('Could not reach the sign-in service. Check your connection and try again.')
    }
  }

  return (
    <main className="min-h-dvh flex items-center justify-center px-5 py-12">
      <div className="w-full max-w-[380px]">
        <div className="mb-9">
          <div className="flex items-baseline gap-2.5">
            <span
              className="inline-block w-2.5 h-2.5 rounded-full"
              style={{ background: 'var(--color-accent)' }}
              aria-hidden
            />
            <h1 className="text-[22px] font-semibold tracking-tight">Crewmind</h1>
          </div>
          <p className="mt-2 text-[14px]" style={{ color: 'var(--fg-3)' }}>
            Speed-to-lead performance for your brokerage.
          </p>
        </div>

        {state === 'sent' ? (
          <div
            className="card p-5"
            style={{ background: 'var(--color-accent-wash)', borderColor: 'var(--color-accent)' }}
          >
            <p className="text-[14px] font-medium" style={{ color: '#123f34' }}>
              Check your email
            </p>
            <p className="mt-1.5 text-[13px] leading-relaxed" style={{ color: '#1c5548' }}>
              We sent a sign-in link to <span className="font-medium">{email}</span>. It expires in
              one hour. Open it on this device.
            </p>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3.5">
            <div>
              <label htmlFor="email" className="block text-[13px] font-medium mb-1.5">
                Work email
              </label>
              <input
                id="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@yourbrokerage.in"
                className="focusable w-full px-3 py-2.5 text-[15px] rounded-[4px] border outline-none"
                style={{ background: 'var(--bg)', borderColor: 'var(--line)', color: 'var(--fg)' }}
              />
            </div>

            {mode === 'password' && (
              <div>
                <label htmlFor="password" className="block text-[13px] font-medium mb-1.5">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="focusable w-full px-3 py-2.5 text-[15px] rounded-[4px] border outline-none"
                  style={{ background: 'var(--bg)', borderColor: 'var(--line)', color: 'var(--fg)' }}
                />
              </div>
            )}

            <button
              type="submit"
              disabled={state === 'sending' || !email.trim() || (mode === 'password' && !password)}
              className="focusable w-full py-2.5 text-[14px] font-medium rounded-[4px] text-white disabled:opacity-45 transition-opacity"
              style={{ background: 'var(--color-accent)' }}
            >
              {state === 'sending'
                ? mode === 'password' ? 'Signing in…' : 'Sending link…'
                : mode === 'password' ? 'Sign in' : 'Email me a sign-in link'}
            </button>

            {state === 'error' && (
              <p className="text-[13px]" style={{ color: 'var(--color-danger)' }} role="alert">
                {message || 'Could not sign you in.'}
              </p>
            )}

            {ALLOW_PASSWORD ? (
              <div
                className="mt-4 p-3 rounded-[4px] border"
                style={{ background: 'var(--color-alert-wash)', borderColor: '#eccbb2' }}
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.06em]" style={{ color: '#8c4318' }}>
                  Local development only
                </p>
                <p className="mt-1 text-[12px] leading-relaxed" style={{ color: '#96502a' }}>
                  Password sign-in is on because{' '}
                  <span className="mono">NEXT_PUBLIC_ALLOW_PASSWORD_LOGIN=true</span>. Enter an
                  authorized disposable staging account manually. Never set this in production.
                </p>
                <button
                  type="button"
                  onClick={() => setMode(mode === 'password' ? 'link' : 'password')}
                  className="focusable mt-2.5 text-[11px] underline"
                  style={{ color: '#8c4318' }}
                >
                  {mode === 'password' ? 'Use a magic link instead' : 'Use a password instead'}
                </button>
              </div>
            ) : (
              <p className="text-[12px] leading-relaxed pt-1" style={{ color: 'var(--fg-4)' }}>
                No password to forget. If your email is not recognised, your account has not been
                set up yet — ask whoever onboarded you.
              </p>
            )}
          </form>
        )}
      </div>
    </main>
  )
}
