'use client'

import { Check, NotePencil, PhoneCall, ThumbsDown, ThumbsUp } from '@phosphor-icons/react'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Card, SectionHead } from './ui'

type Action = 'touch' | 'feedback' | 'note'

export function LeadActions({
  leadId, callId, awaitingTouch, existingFeedback,
}: {
  leadId: string
  callId: string | null
  awaitingTouch: boolean
  existingFeedback: { is_correct: boolean; reason: string | null } | null
}) {
  const router = useRouter()
  const [refreshing, startRefresh] = useTransition()
  const [active, setActive] = useState<Action | null>(null)
  const [touched, setTouched] = useState(false)
  const [feedback, setFeedback] = useState(existingFeedback)
  const [note, setNote] = useState('')
  const [showReason, setShowReason] = useState(false)
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function post(url: string, body: unknown): Promise<{ ok: true } | { ok: false; error: string }> {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}))
        return { ok: false, error: payload.error ?? 'That did not save. Nothing was recorded.' }
      }
      return { ok: true }
    } catch {
      return { ok: false, error: 'The network request failed. Check your connection and try again.' }
    }
  }

  function begin(action: Action) {
    setActive(action)
    setError(null)
    setSuccess(null)
  }

  function refresh() {
    startRefresh(() => router.refresh())
  }

  async function markContacted() {
    if (active || touched) return
    begin('touch')
    const result = await post('/api/touch', { lead_id: leadId })
    if (result.ok) {
      setTouched(true)
      setSuccess('Human follow-up recorded.')
      refresh()
    } else setError(result.error)
    setActive(null)
  }

  async function sendFeedback(isCorrect: boolean, why?: string) {
    if (!callId || active) return
    begin('feedback')
    const next = { is_correct: isCorrect, reason: why ?? null }
    const result = await post('/api/feedback', { lead_id: leadId, call_id: callId, ...next })
    if (result.ok) {
      setFeedback(next)
      setShowReason(false)
      setReason('')
      setSuccess('Call feedback saved.')
      refresh()
    } else setError(result.error)
    setActive(null)
  }

  async function addNote() {
    const body = note.trim()
    if (!body || active) return
    begin('note')
    const result = await post('/api/note', { lead_id: leadId, body })
    if (result.ok) {
      setNote('')
      setSuccess('Note saved.')
      refresh()
    } else setError(result.error)
    setActive(null)
  }

  const busy = active !== null || refreshing

  return (
    <Card>
      <SectionHead title="Next action" hint="Record what your team does after the AI handoff." />
      <div className="px-4 pb-4 space-y-4">
        <div>
          <button
            onClick={markContacted}
            disabled={busy || touched}
            className="focusable action-primary"
          >
            {touched ? <Check size={18} weight="bold" aria-hidden /> : <PhoneCall size={18} aria-hidden />}
            {touched ? 'Follow-up recorded' : active === 'touch' ? 'Recording follow-up…' : 'I called this lead'}
          </button>
          <p className="mt-2 text-[11px] leading-snug" style={{ color: 'var(--fg-4)' }}>
            This records a human touch. It never starts an automated call.
          </p>
        </div>

        {callId && (
          <div className="pt-3 hairline-t">
            <div className="text-[12px] font-medium mb-2">Was this call qualification accurate?</div>
            {feedback ? (
              <div className="flex items-center justify-between gap-3 rounded-[6px] px-3 py-2" style={{ background: 'var(--color-accent-wash)' }}>
                <span className="text-[12px] font-medium flex items-center gap-2">
                  {feedback.is_correct ? <ThumbsUp size={17} aria-hidden /> : <ThumbsDown size={17} aria-hidden />}
                  {feedback.is_correct ? 'Marked accurate' : 'Marked inaccurate'}
                </span>
                <button onClick={() => { setFeedback(null); setShowReason(false) }} disabled={busy} className="focusable text-[12px] underline">Change</button>
              </div>
            ) : showReason ? (
              <div className="space-y-2">
                <label htmlFor="feedback-reason" className="block text-[12px] font-medium">What should be corrected?</label>
                <textarea
                  id="feedback-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  className="focusable form-control resize-none"
                />
                <div className="flex gap-2">
                  <button onClick={() => sendFeedback(false, reason.trim() || undefined)} disabled={busy} className="focusable action-primary flex-1">
                    {active === 'feedback' ? 'Saving…' : 'Save correction'}
                  </button>
                  <button onClick={() => setShowReason(false)} disabled={busy} className="focusable action-secondary">Cancel</button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => sendFeedback(true)} disabled={busy} className="focusable action-secondary"><ThumbsUp size={17} aria-hidden /> Accurate</button>
                <button onClick={() => setShowReason(true)} disabled={busy} className="focusable action-secondary"><ThumbsDown size={17} aria-hidden /> Needs correction</button>
              </div>
            )}
          </div>
        )}

        <div className="pt-3 hairline-t">
          <label htmlFor="note" className="block text-[12px] font-medium mb-1.5">Add a note</label>
          <textarea id="note" value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="Add useful context for the next person…" className="focusable form-control resize-none" />
          <button onClick={addNote} disabled={!note.trim() || busy} className="focusable action-secondary mt-2 w-full">
            <NotePencil size={17} aria-hidden /> {active === 'note' ? 'Saving note…' : 'Save note'}
          </button>
        </div>

        <p className="pt-3 hairline-t text-[11px] leading-snug" style={{ color: 'var(--fg-4)' }}>
          Dashboard re-calls and WhatsApp resend are not available yet.
        </p>

        {error && <p className="status-message status-error" role="alert">{error}</p>}
        {success && <p className="status-message status-success" role="status">{success}</p>}
      </div>
    </Card>
  )
}
