import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  dur, n, ago, ist, clock, outcomeLabel, budgetLabel, timelineLabel,
  financeLabel, sourceLabel,
} from '@/lib/format'
import { Card, SectionHead, Badge, Empty, outcomeTone } from '@/components/ui'
import { Transcript } from '@/components/Transcript'
import { LeadActions } from '@/components/LeadActions'

export const dynamic = 'force-dynamic'

export default async function LeadDetail({
  params, searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ call?: string; range?: string }>
}) {
  const { id } = await params
  const query = await searchParams
  const supabase = await createClient()

  const { data, error } = await supabase.rpc('dashboard_lead_detail', { p_lead_id: id })
  if (error) {
    return (
      <Card>
        <SectionHead title="Could not load this lead" />
        <Empty title="The lead record is temporarily unavailable" tone="blocked">
          Reload the page to try again. The record has not been changed.
        </Empty>
      </Card>
    )
  }
  if (!data?.lead) notFound()

  const lead = data.lead
  const calls = (data.calls ?? []) as any[]
  const events = (data.events ?? []) as any[]
  const touches = (data.touches ?? []) as any[]
  const notes = (data.notes ?? []) as any[]
  const messages = (data.messages ?? []) as any[]
  const reports = (data.reports ?? []) as any[]
  const primary = calls.find((c) => c.id === query.call) ?? calls[0]
  const existingFeedback = (data.feedback ?? []).find((f: any) => f.call_id === primary?.id) ?? null

  // Keyword pointers into the transcript, per the honesty note in Transcript.tsx
  const highlight = [
    lead.budget_band?.includes('Cr') ? 'crore' : null,
    lead.budget_band?.includes('L') ? 'lakh' : null,
    lead.timeline === 'immediate' ? 'mahine' : null,
    lead.financing_status === 'needs_loan' ? 'loan' : null,
    lead.financing_status === 'pre_approved' ? 'pre-approved' : null,
    lead.financing_status === 'cash' ? 'cash' : null,
    lead.location_preference?.split(' ')[0] ?? null,
  ].filter(Boolean) as string[]

  const qualifiedCall = calls.find((c) =>
    c.outcome === 'answered_qualified' || c.outcome === 'appointment_booked'
  )
  const awaitingTouch =
    qualifiedCall && !touches.some((t) => new Date(t.touched_at) >= new Date(qualifiedCall.ended_at))

  return (
    <>
      <Link
        href={query.range ? `/leads?range=${encodeURIComponent(query.range)}` : '/leads'}
        className="focusable inline-block text-[13px] mb-3"
        style={{ color: 'var(--fg-3)' }}
      >
        ← All leads
      </Link>

      <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
        <div className="min-w-0">
          <h1 className="text-[22px] font-semibold tracking-tight">{lead.full_name ?? 'Unnamed lead'}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px]" style={{ color: 'var(--fg-3)' }}>
            <a href={`tel:${lead.phone_e164}`} className="focusable num hover:underline" style={{ color: 'var(--fg-2)' }}>
              {lead.phone_e164}
            </a>
            <span>{sourceLabel(lead.source)}</span>
            <span title={ist(lead.lead_received_at)}>Arrived {ago(lead.lead_received_at)}</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <Badge tone={outcomeTone(primary?.outcome)}>{outcomeLabel(primary?.outcome)}</Badge>
          {awaitingTouch && <Badge tone="alert">Waiting on your team</Badge>}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.55fr_1fr] items-start">
        {/* ------------------------------------------------- left column */}
        <div className="space-y-4">
          {/* speed */}
          <Card>
            <div className="grid grid-cols-2 sm:grid-cols-4 divide-x" style={{ borderColor: 'var(--line)' }}>
              <Cell label="Called in" value={dur(lead.speed_to_first_touch_sec)}
                    tone={lead.speed_to_first_touch_sec != null && lead.speed_to_first_touch_sec <= 60 ? 'good' : undefined} />
              <Cell label="Attempts" value={n(lead.call_attempts)} />
              <Cell label="Call length" value={primary?.duration_sec ? clock(primary.duration_sec) : '—'} />
              <Cell label="Lead score" value={n(lead.score)} />
            </div>
          </Card>

          {/* qualification */}
          <Card>
            <SectionHead
              title="What the AI established"
              hint="Read the conversation below and judge it for yourself."
            />
            {!lead.budget_band && !lead.timeline && !lead.financing_status ? (
              <Empty title="Nothing was established on this call">
                The caller did not stay on the line long enough, or did not answer the
                qualification questions.
              </Empty>
            ) : (
              <div className="px-4 pb-4 grid gap-3 sm:grid-cols-3">
                <Field label="Budget" value={budgetLabel(lead.budget_band)} />
                <Field label="Timeline" value={timelineLabel(lead.timeline)} />
                <Field label="Financing" value={financeLabel(lead.financing_status)} />
                {lead.property_interest && <Field label="Looking for" value={lead.property_interest} />}
                {lead.location_preference && <Field label="Area" value={lead.location_preference} />}
                {lead.purpose && <Field label="Purpose" value={lead.purpose.replace(/_/g, ' ')} />}
              </div>
            )}
          </Card>

          {/* recording + transcript */}
          <Card>
            <SectionHead
              title="The call"
              hint={primary?.ended_at ? ist(primary.ended_at) : undefined}
              right={primary?.duration_sec ? <span className="num text-[12px]" style={{ color: 'var(--fg-3)' }}>{clock(primary.duration_sec)}</span> : undefined}
            />

            {primary?.recording_url ? (
              <div className="px-4 pb-3">
                {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                <audio controls preload="none" src={primary.recording_url} className="w-full h-9" />
              </div>
            ) : (
              <div className="px-4 pb-1">
                <div
                  className="rounded-[4px] px-3 py-2.5 text-[12px] leading-snug border border-dashed"
                  style={{ borderColor: 'var(--line)', color: 'var(--fg-3)' }}
                >
                  No recording stored for this call. Recordings appear here automatically once the
                  voice provider is sending its end-of-call reports.
                </div>
              </div>
            )}

            {primary?.transcript ? (
              <Transcript transcript={primary.transcript} highlight={highlight} />
            ) : (
              <Empty title="No transcript for this call">
                The transcript is pending or unavailable. Call duration alone does not tell us why it is missing.
              </Empty>
            )}

            {primary?.summary && (
              <div className="mx-4 mb-4 px-3 py-2.5 rounded-[4px]" style={{ background: 'var(--bg-2)' }}>
                <div className="text-[11px] font-semibold uppercase tracking-[0.06em] mb-1" style={{ color: 'var(--fg-3)' }}>
                  AI summary
                </div>
                <p className="text-[13px] leading-relaxed">{primary.summary}</p>
              </div>
            )}
          </Card>

          {calls.length > 1 && (
            <Card>
              <SectionHead title={`All ${calls.length} call attempts`} />
              <div className="px-4 pb-4 space-y-2">
                {calls.map((c) => (
                  <Link
                    key={c.id}
                    href={`/leads/${lead.id}?call=${c.id}${query.range ? `&range=${encodeURIComponent(query.range)}` : ''}`}
                    aria-current={c.id === primary?.id ? 'true' : undefined}
                    className="focusable flex items-center justify-between gap-3 min-h-11 px-2 text-[13px] hairline-t first:border-0 rounded-[6px] hover:bg-[var(--bg-3)]"
                    style={c.id === primary?.id ? { background: 'var(--color-accent-wash)' } : undefined}
                  >
                    <span style={{ color: 'var(--fg-3)' }}>
                      Attempt {c.attempt_number} · {ist(c.created_at, 'short')}
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="num" style={{ color: 'var(--fg-3)' }}>{clock(c.duration_sec)}</span>
                      <Badge tone={outcomeTone(c.outcome)}>{outcomeLabel(c.outcome)}</Badge>
                    </span>
                  </Link>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* ------------------------------------------------ right column */}
        <div className="space-y-4">
          <LeadActions
            leadId={lead.id}
            callId={primary?.id ?? null}
            awaitingTouch={!!awaitingTouch}
            existingFeedback={existingFeedback}
          />

          <Card>
            <SectionHead title="Timeline" hint="Everything that happened, in order." />
            <div className="px-4 pb-4">
              <ol className="space-y-3">
                {buildTimeline(lead, calls, events, touches, notes, messages, reports).map((t, i) => (
                  <li key={i} className="flex gap-3">
                    <span
                      className="mt-[5px] w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ background: t.human ? 'var(--color-alert)' : 'var(--color-accent)' }}
                      aria-hidden
                    />
                    <div className="min-w-0">
                      <div className="text-[13px] leading-snug">{t.title}</div>
                      <div className="text-[11px] mt-0.5" style={{ color: 'var(--fg-4)' }} title={ist(t.at)}>
                        {ist(t.at, 'short')}
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </Card>

          {reports.length > 0 && (
            <Card>
              <SectionHead
                title="Report to agent"
                hint="What was sent to whoever owns this lead."
              />
              <div className="px-4 pb-4 space-y-3">
                {reports.map((r) => (
                  <div key={r.id} className="hairline-t pt-3 first:border-0 first:pt-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[13px] leading-snug">{r.subject}</p>
                      <Badge tone={reportTone(r.status)}>{reportStatusLabel(r.status)}</Badge>
                    </div>
                    <p className="text-[11px] mt-1" style={{ color: 'var(--fg-4)' }}>
                      {r.agent_name ?? 'Unassigned'}
                      {r.email_to ? ` · ${r.email_to}` : ''}
                      {' · '}
                      <span title={ist(r.sent_at ?? r.created_at)}>
                        {ago(r.sent_at ?? r.created_at)}
                      </span>
                    </p>
                    {/* The reason matters more than the status word: "held" is a
                        deliberate config choice, "failed" is something to fix. */}
                    {r.status !== 'sent' && r.status_reason && (
                      <p className="text-[11px] mt-1" style={{ color: 'var(--fg-3)' }}>
                        {r.status_reason}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {notes.length > 0 && (
            <Card>
              <SectionHead title="Notes" />
              <div className="px-4 pb-4 space-y-3">
                {notes.map((nt) => (
                  <div key={nt.id}>
                    <p className="text-[13px] leading-relaxed">{nt.body}</p>
                    <p className="text-[11px] mt-0.5" style={{ color: 'var(--fg-4)' }}>{ago(nt.created_at)}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <Card>
            <SectionHead title="Original enquiry" hint="Exactly what the portal sent us." />
            <div className="px-4 pb-4">
              <pre
                className="mono text-[11px] leading-relaxed p-2.5 rounded-[3px] overflow-x-auto"
                style={{ background: 'var(--bg-2)', color: 'var(--fg-2)' }}
              >
                {JSON.stringify(data.enquiry ?? {}, null, 2)}
              </pre>
            </div>
          </Card>
        </div>
      </div>
    </>
  )
}

function Cell({ label, value, tone }: { label: string; value: string; tone?: 'good' }) {
  return (
    <div className="px-4 py-3" style={{ borderColor: 'var(--line)' }}>
      <div className="text-[11px] font-medium uppercase tracking-[0.05em]" style={{ color: 'var(--fg-3)' }}>
        {label}
      </div>
      <div
        className="num text-[19px] font-semibold mt-1"
        style={{ color: tone === 'good' ? 'var(--color-accent)' : 'var(--fg)' }}
      >
        {value}
      </div>
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] font-medium uppercase tracking-[0.05em]" style={{ color: 'var(--fg-3)' }}>
        {label}
      </div>
      <div className="text-[14px] font-medium mt-0.5">{value}</div>
    </div>
  )
}

/**
 * 'held' is not a failure — it means the email gate is off or the agent has no
 * address, and the report is sitting right here where they can read it. Only a
 * genuine send failure earns the alarming colour.
 */
function reportTone(status: string): 'good' | 'alert' | 'bad' | 'neutral' {
  if (status === 'sent') return 'good'
  if (status === 'failed') return 'bad'
  if (status === 'pending') return 'alert'
  return 'neutral'
}

function reportStatusLabel(status: string) {
  if (status === 'sent') return 'Emailed'
  if (status === 'failed') return 'Send failed'
  if (status === 'pending') return 'Sending'
  return 'In dashboard only'
}

function buildTimeline(
  lead: any, calls: any[], events: any[], touches: any[], notes: any[],
  messages: any[], reports: any[],
) {
  const items: { at: string; title: string; human?: boolean }[] = []

  items.push({ at: lead.lead_received_at, title: `Lead arrived from ${sourceLabel(lead.source)}` })

  calls.forEach((c) => {
    if (c.started_at) items.push({ at: c.started_at, title: `AI called (attempt ${c.attempt_number})` })
    if (c.ended_at)
      items.push({
        at: c.ended_at,
        title: `Call ended — ${outcomeLabel(c.outcome)}${c.duration_sec ? `, ${clock(c.duration_sec)}` : ''}`,
      })
  })

  messages.forEach((m) =>
    items.push({
      at: m.sent_at ?? m.created_at,
      title: `WhatsApp ${m.direction === 'inbound' ? 'received' : 'sent'}${m.status ? ` (${m.status})` : ''}`,
    })
  )

  touches.forEach((t) =>
    items.push({ at: t.touched_at, title: 'Your team contacted this lead', human: true })
  )

  notes.forEach((nt) => items.push({ at: nt.created_at, title: 'Note added', human: true }))

  reports.forEach((r) =>
    items.push({
      at: r.sent_at ?? r.created_at,
      title:
        r.status === 'sent'
          ? `Call report emailed to ${r.agent_name ?? 'the assigned agent'}`
          : r.status === 'failed'
            ? `Call report to ${r.agent_name ?? 'the assigned agent'} failed to send`
            : `Call report ready for ${r.agent_name ?? 'the assigned agent'}`,
    })
  )

  events
    .filter((e) => [
      'appointment.requested', 'appointment.booked', 'appointment.confirmed',
      'appointment.cancelled', 'lead.opted_out', 'conversation.handover',
    ].includes(e.event_type))
    .forEach((e) => items.push({ at: e.created_at, title: e.title }))

  return items
    .filter((i) => i.at)
    .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime())
}
