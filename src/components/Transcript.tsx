'use client'

import { useMemo, useState } from 'react'

/**
 * WF-06D converts Dograh realtime events into a flat, speaker-prefixed transcript and
 * stores it in calls.transcript. This component splits that provider-normalized value into
 * readable turns and can highlight the turn a qualification value most likely came from.
 *
 * IMPORTANT, and stated in the UI: the model does NOT tell us which sentence it
 * derived a field from. This is a keyword match we compute ourselves. Labelling
 * it as the model's citation would be a fabrication, so it is labelled as what
 * it is - a best-effort pointer for the reader to check.
 */

type Turn = { speaker: 'ai' | 'user'; text: string }

function parse(transcript: string): Turn[] {
  return transcript
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const m = line.match(/^(AI|Assistant|Bot|User|Customer|Human)\s*:\s*(.*)$/i)
      if (!m) return { speaker: 'ai' as const, text: line }
      const who = m[1].toLowerCase()
      return {
        speaker: (who === 'user' || who === 'customer' || who === 'human' ? 'user' : 'ai') as 'ai' | 'user',
        text: m[2],
      }
    })
}

export function Transcript({
  transcript, highlight,
}: { transcript: string; highlight?: string[] }) {
  const turns = useMemo(() => parse(transcript), [transcript])
  const [focus, setFocus] = useState<number | null>(null)

  const matches = useMemo(() => {
    if (!highlight?.length) return new Set<number>()
    const set = new Set<number>()
    const needles = highlight.map((h) => h.toLowerCase())
    turns.forEach((t, i) => {
      const lower = t.text.toLowerCase()
      if (needles.some((needle) => lower.includes(needle))) set.add(i)
    })
    return set
  }, [turns, highlight])

  return (
    <div className="px-4 pb-4">
      {matches.size > 0 && (
        <button
          onClick={() => setFocus(focus === null ? [...matches][0] : null)}
          className="focusable mb-3 text-[12px] font-medium px-2 py-1 rounded-[3px] border"
          style={{ borderColor: 'var(--line)', color: 'var(--color-accent)' }}
        >
          {focus === null ? 'Show where this came from' : 'Show whole conversation'}
        </button>
      )}

      <div className="space-y-2.5 max-h-[520px] overflow-y-auto pr-1">
        {turns.map((t, i) => {
          if (focus !== null && !matches.has(i) && Math.abs(i - focus) > 1) return null
          const isMatch = matches.has(i)
          return (
            <div key={i} className={t.speaker === 'user' ? 'flex justify-end' : 'flex justify-start'}>
              <div
                className="deva max-w-[85%] px-3 py-2 rounded-[4px] text-[13px] leading-relaxed"
                style={{
                  background: t.speaker === 'user' ? 'var(--bg-2)' : 'var(--color-accent-wash)',
                  border: isMatch ? '1.5px solid var(--color-alert)' : '1px solid transparent',
                  color: 'var(--color-ink)',
                }}
              >
                <div
                  className="text-[10px] font-semibold uppercase tracking-[0.06em] mb-0.5"
                  style={{ color: t.speaker === 'user' ? '#6b6f76' : '#3d6b5e' }}
                >
                  {t.speaker === 'user' ? 'Caller' : 'Priya (AI)'}
                </div>
                {t.text}
              </div>
            </div>
          )
        })}
      </div>

      {matches.size > 0 && (
        <p className="mt-3 text-[11px] leading-snug" style={{ color: 'var(--fg-4)' }}>
          Outlined turns are where these words appear in the conversation. This is a text match we
          run for you, not the AI citing its own reasoning — read the turn and judge it yourself.
        </p>
      )}
    </div>
  )
}
