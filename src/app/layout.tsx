import type { Metadata, Viewport } from 'next'
import { IBM_Plex_Sans, IBM_Plex_Sans_Devanagari, IBM_Plex_Mono } from 'next/font/google'
import './globals.css'

/**
 * One type family across Latin and Devanagari. IBM Plex Sans Devanagari is a
 * genuine companion cut, not a fallback - a Hindi reader can tell instantly
 * when Devanagari has been substituted, and it reads as carelessness.
 */
const plex = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-plex',
  display: 'swap',
})

const plexDeva = IBM_Plex_Sans_Devanagari({
  subsets: ['devanagari', 'latin'],
  weight: ['400', '500', '600'],
  variable: '--font-plex-deva',
  display: 'swap',
})

const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-plex-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Crewmind',
  description: 'Speed-to-lead performance for your brokerage.',
  robots: { index: false, follow: false },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#faf9f7' },
    { media: '(prefers-color-scheme: dark)', color: '#16181a' },
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${plex.variable} ${plexDeva.variable} ${plexMono.variable}`}>
      <body>{children}</body>
    </html>
  )
}
