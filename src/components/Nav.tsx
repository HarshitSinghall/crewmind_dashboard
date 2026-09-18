'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { ChartLineUp, Gauge, House, PhoneCall, UsersThree } from '@phosphor-icons/react'

const LINKS = [
  { href: '/',        label: 'Overview', short: 'Home', icon: House },
  { href: '/leads',   label: 'Leads', short: 'Leads', icon: UsersThree },
  { href: '/speed',   label: 'Response speed', short: 'Speed', icon: Gauge },
  { href: '/quality', label: 'Call quality', short: 'Calls', icon: PhoneCall },
  { href: '/roi',     label: 'Business value', short: 'Value', icon: ChartLineUp },
]

export function Nav({ variant = 'desktop' }: { variant?: 'desktop' | 'mobile' }) {
  const pathname = usePathname()
  const params = useSearchParams()
  const range = params.get('range')
  const qs = range ? `?range=${range}` : ''

  return (
    <nav className={variant === 'desktop' ? 'side-nav' : 'mobile-nav'} aria-label="Primary navigation">
      <div className={variant === 'desktop' ? 'space-y-1' : 'grid grid-cols-5'}>
        {LINKS.map((l) => {
          const active = l.href === '/' ? pathname === '/' : pathname.startsWith(l.href)
          const Icon = l.icon
          return (
            <Link
              key={l.href}
              href={`${l.href}${qs}`}
              aria-current={active ? 'page' : undefined}
              className={`focusable nav-item ${active ? 'nav-item-active' : ''}`}
            >
              <Icon size={variant === 'desktop' ? 19 : 21} weight={active ? 'fill' : 'regular'} aria-hidden />
              <span className={variant === 'desktop' ? '' : 'text-[10px] leading-none'}>
                {variant === 'desktop' ? l.label : l.short}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
