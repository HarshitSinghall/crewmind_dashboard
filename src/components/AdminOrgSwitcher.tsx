'use client'

import { useState } from 'react'

type Organisation = { id: string; name: string }

export function AdminOrgSwitcher({
  orgs,
  selectedOrgId,
}: {
  orgs: Organisation[]
  selectedOrgId: string
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function changeOrg(orgId: string) {
    setBusy(true)
    setError('')
    try {
      const response = await fetch('/api/admin/organisation', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-crewmind-request': '1' },
        body: JSON.stringify({ org_id: orgId }),
      })
      if (!response.ok) throw new Error('Could not switch brokerage.')
      window.location.assign('/')
    } catch {
      setError('Could not switch brokerage. Try again.')
      setBusy(false)
    }
  }

  return (
    <div className="border-b px-5 py-3" style={{ borderColor: 'var(--line)' }}>
      <label htmlFor="admin-org" className="mr-3 text-[12px] font-medium">
        Brokerage
      </label>
      <select
        id="admin-org"
        value={selectedOrgId}
        disabled={busy}
        onChange={(event) => changeOrg(event.target.value)}
        className="focusable max-w-full rounded-[4px] border px-2 py-1.5 text-[13px]"
        style={{ background: 'var(--bg)', borderColor: 'var(--line)', color: 'var(--fg)' }}
      >
        {orgs.map((org) => <option key={org.id} value={org.id}>{org.name}</option>)}
      </select>
      {error && <p role="alert" className="mt-1 text-[12px]" style={{ color: 'var(--color-danger)' }}>{error}</p>}
    </div>
  )
}
