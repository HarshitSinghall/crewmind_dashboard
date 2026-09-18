import Link from 'next/link'

export default function LeadNotFound() {
  return (
    <div className="card p-6 max-w-[460px]">
      <h1 className="text-[16px] font-semibold">That lead is not in your account</h1>
      <p className="mt-2 text-[13px] leading-relaxed" style={{ color: 'var(--fg-3)' }}>
        Either it does not exist, or it belongs to a different brokerage, or you are an agent and
        it is not assigned to you. All three look the same from here on purpose — telling you
        which would leak whether the lead exists at all.
      </p>
      <Link
        href="/leads"
        className="focusable inline-block mt-4 text-[13px] font-medium"
        style={{ color: 'var(--color-accent)' }}
      >
        ← Back to your leads
      </Link>
    </div>
  )
}
