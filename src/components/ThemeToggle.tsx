'use client'

import { Moon, Sun } from '@phosphor-icons/react'
import { useEffect, useState } from 'react'

type Theme = 'light' | 'dark'

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme | null>(null)

  useEffect(() => {
    const saved = window.localStorage.getItem('crewmind-theme') as Theme | null
    const next = saved ?? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    document.documentElement.dataset.theme = next
    setTheme(next)
  }, [])

  function toggle() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark'
    document.documentElement.dataset.theme = next
    window.localStorage.setItem('crewmind-theme', next)
    setTheme(next)
  }

  const nextLabel = theme === 'dark' ? 'Use light theme' : 'Use dark theme'

  return (
    <button type="button" onClick={toggle} className="focusable icon-button" aria-label={nextLabel} title={nextLabel}>
      {theme === 'dark' ? <Sun size={18} aria-hidden /> : <Moon size={18} aria-hidden />}
    </button>
  )
}
