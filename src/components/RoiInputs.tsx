'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { inr, n, dur } from '@/lib/format'

type Assumptions = {
  baseline_response_median_sec: number | null
  telecaller_monthly_cost_inr: number | null
  telecaller_hours_per_week: number | null
  avg_brokerage_per_deal_inr: number | null
  close_rate_pct: number | null
}

/**
 * The assumptions panel. Every figure the ROI screen cannot measure lives here,
 * visible and editable, recalculating live.
 *
 * The rule this enforces: nothing is pre-filled with an invented number. An
 * empty field stays empty and the dependent figure refuses to render, because
 * a made-up close rate presented as his own would be the most damaging thing
 * on the entire dashboard.
 */
export function RoiInputs({
  initial, qualified, canEdit,
}: {
  initial: Assumptions
  qualified: number
  canEdit: boolean
}) {
  const router = useRouter()
  const [a, setA] = useState<Assumptions>(initial)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [, start] = useTransition()

  const pipeline =
    a.avg_brokerage_per_deal_inr && a.close_rate_pct
      ? qualified * a.avg_brokerage_per_deal_inr * (a.close_rate_pct / 100)
      : null

  function set<K extends keyof Assumptions>(k: K, v: string) {
    setSaved(false)
    setA({ ...a, [k]: v === '' ? null : Number(v) })
  }

  async function save() {
    if (saving) return
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const res = await fetch('/api/roi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(a),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        setError(j.error ?? 'Could not save. Nothing was changed.')
        return
      }
      setSaved(true)
      start(() => router.refresh())
    } catch {
      setError('The network request failed. Check your connection and try again.')
    } finally {
      setSaving(false)
    }
  }

  const fields: { key: keyof Assumptions; label: string; hint: string; suffix?: string; step?: string }[] = [
    {
      key: 'baseline_response_median_sec',
      label: 'How long leads waited before Crewmind',
      hint: 'In seconds. Four hours is 14400. Your estimate is fine — it is labelled as yours.',
    },
    {
      key: 'telecaller_monthly_cost_inr',
      label: 'What a telecaller costs you per month',
      hint: 'Salary plus everything else you actually spend on them.',
      suffix: '₹',
    },
    {
      key: 'telecaller_hours_per_week',
      label: 'Hours a week a telecaller actually works',
      hint: '49.5 is nine hours a day, five and a half days.',
      step: '0.5',
    },
    {
      key: 'avg_brokerage_per_deal_inr',
      label: 'Your average brokerage per closed deal',
      hint: 'Your number. We have no way to know this.',
      suffix: '₹',
    },
    {
      key: 'close_rate_pct',
      label: 'Your close rate on qualified leads',
      hint: 'Percent. Be honest with yourself here — this drives the figure below.',
      suffix: '%',
      step: '0.5',
    },
  ]

  return (
    <div className="px-4 pb-4">
      <div className="grid gap-3.5 sm:grid-cols-2">
        {fields.map((f) => (
          <div key={f.key}>
            <label htmlFor={f.key} className="block text-[12px] font-medium">
              {f.label}
            </label>
            <div className="mt-1 flex items-center gap-1.5">
              {f.suffix === '₹' && <span className="text-[13px]" style={{ color: 'var(--fg-3)' }}>₹</span>}
              <input
                id={f.key}
                type="number"
                min="0"
                step={f.step ?? '1'}
                disabled={!canEdit}
                value={a[f.key] ?? ''}
                onChange={(e) => set(f.key, e.target.value)}
                placeholder="not set"
                className="focusable num flex-1 px-2.5 py-1.5 text-[14px] rounded-[4px] border outline-none disabled:opacity-60"
                style={{ background: 'var(--bg)', borderColor: 'var(--line)', color: 'var(--fg)' }}
              />
              {f.suffix === '%' && <span className="text-[13px]" style={{ color: 'var(--fg-3)' }}>%</span>}
            </div>
            <p className="mt-1 text-[11px] leading-snug" style={{ color: 'var(--fg-4)' }}>{f.hint}</p>
          </div>
        ))}
      </div>

      {canEdit && (
        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={save}
            disabled={saving}
            className="focusable px-4 py-2 text-[13px] font-medium rounded-[4px] text-white disabled:opacity-50"
            style={{ background: 'var(--color-accent)' }}
          >
            {saving ? 'Saving…' : 'Save my numbers'}
          </button>
          {saved && <span className="text-[12px]" style={{ color: 'var(--color-accent)' }}>Saved</span>}
          {error && <span className="text-[12px]" style={{ color: 'var(--color-danger)' }}>{error}</span>}
        </div>
      )}
      {!canEdit && (
        <p className="mt-3 text-[12px]" style={{ color: 'var(--fg-3)' }}>
          Only the account owner can change these.
        </p>
      )}

      {/* ------------------------------------------------- pipeline value */}
      <div className="mt-5 pt-4 hairline-t">
        {pipeline !== null ? (
          <>
            <div className="text-[12px] font-medium uppercase tracking-[0.06em]" style={{ color: 'var(--fg-3)' }}>
              Pipeline value at your own numbers
            </div>
            <div className="num text-[38px] font-semibold mt-1.5" style={{ color: 'var(--color-accent)' }}>
              {inr(pipeline)}
            </div>
            <p className="mt-2 text-[12px] leading-relaxed" style={{ color: 'var(--fg-3)' }}>
              <span className="num">{n(qualified)}</span> qualified leads ×{' '}
              <span className="num">{inr(a.avg_brokerage_per_deal_inr!)}</span> average brokerage ×{' '}
              <span className="num">{a.close_rate_pct}%</span> close rate.
            </p>
            <p className="mt-1.5 text-[11px] leading-snug" style={{ color: 'var(--fg-4)' }}>
              This is your estimate of your own pipeline, not money Crewmind made you. Change any
              input above and it recalculates.
            </p>
          </>
        ) : (
          <div className="px-3.5 py-3 rounded-[4px] border border-dashed" style={{ borderColor: 'var(--line)' }}>
            <p className="text-[13px] font-medium">Pipeline value needs two numbers from you</p>
            <p className="mt-1 text-[12px] leading-relaxed" style={{ color: 'var(--fg-3)' }}>
              Fill in your average brokerage per deal and your close rate above. We deliberately do
              not guess these — a figure built on numbers we invented would be worthless to you.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
