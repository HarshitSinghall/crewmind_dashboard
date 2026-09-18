/**
 * Cross-tenant security suite.
 *
 * Authenticates as users in two disposable fixture tenants and then tries, by
 * explicit fixture row id, to read / update / delete tenant B's data through every path the browser can
 * reach: PostgREST tables, every dashboard RPC, and the app's own write routes.
 * Every one of those attempts must fail.
 *
 * Run:  npm run test:tenancy          (app must be running for the HTTP section)
 *
 * This suite refuses to run unless the environment, project, fixture tenant
 * slugs, account identities and every mutation target are explicitly supplied.
 */

import {
  assertAuthenticatedFixture,
  assertFixtureRow,
  assertFixtureTenant,
  requireTenancyFixtureConfig,
} from './fixture-safety.mjs'

const FIXTURE = requireTenancyFixtureConfig()
const URL_BASE = FIXTURE.urlBase
const ANON = FIXTURE.anon
const APP = process.env.TEST_APP_URL ?? 'http://localhost:3000'
const PASSWORD = FIXTURE.password

let pass = 0, fail = 0
const failures = []

function check(name, ok, detail = '') {
  if (ok) { pass++; console.log(`  PASS  ${name}`) }
  else { fail++; failures.push(name); console.log(`  FAIL  ${name}  ${detail}`) }
}

function requireMutationRefused(name, response) {
  const refused = Array.isArray(response.body) ? response.body.length === 0 : response.status >= 400
  check(name, refused, `status ${response.status}`)
  if (!refused) {
    throw new Error('Fixture isolation failed; the suite stopped immediately after an unexpected mutation')
  }
}

async function signIn(email) {
  const res = await fetch(`${URL_BASE}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: PASSWORD }),
  })
  if (!res.ok) throw new Error(`sign-in failed for ${email}: ${res.status} ${await res.text()}`)
  return res.json()
}

function rest(token) {
  return async (path, init = {}) => {
    const res = await fetch(`${URL_BASE}/rest/v1/${path}`, {
      ...init,
      headers: {
        apikey: ANON,
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
        ...(init.headers ?? {}),
      },
    })
    const text = await res.text()
    let body = null
    try { body = text ? JSON.parse(text) : null } catch { body = text }
    return { status: res.status, body }
  }
}

async function main() {
  console.log('\n=== Crewmind cross-tenant security suite ===\n')

  const [aOwner, aAgent, bOwner] = await Promise.all([
    signIn(FIXTURE.ownerEmail), signIn(FIXTURE.agentEmail), signIn(FIXTURE.ownerBEmail),
  ])
  assertAuthenticatedFixture(aOwner, FIXTURE.orgA, 'tenant A owner')
  assertAuthenticatedFixture(aAgent, FIXTURE.orgA, 'tenant A agent')
  assertAuthenticatedFixture(bOwner, FIXTURE.orgB, 'tenant B owner')

  const A = rest(aOwner.access_token)
  const Ag = rest(aAgent.access_token)
  const B = rest(bOwner.access_token)
  const anon = rest(ANON)

  const orgA = aOwner.user.app_metadata.org_id
  const orgB = bOwner.user.app_metadata.org_id
  if (orgA === orgB) throw new Error('test accounts are in the same org - suite is meaningless')

  await assertFixtureTenant(A, FIXTURE.orgA, FIXTURE.orgASlug, 'tenant A')
  await assertFixtureTenant(B, FIXTURE.orgB, FIXTURE.orgBSlug, 'tenant B')

  const bLead = FIXTURE.leadB
  const bCall = FIXTURE.callB
  const bCost = FIXTURE.costB
  const ownLead = FIXTURE.leadA
  await Promise.all([
    assertFixtureRow(A, 'leads', ownLead, 'tenant A lead fixture'),
    assertFixtureRow(A, 'leads', FIXTURE.deleteLeadA, 'tenant A delete fixture'),
    assertFixtureRow(B, 'leads', bLead, 'tenant B lead fixture'),
    assertFixtureRow(B, 'leads', FIXTURE.deleteLeadB, 'tenant B delete fixture'),
    assertFixtureRow(B, 'calls', bCall, 'tenant B call fixture'),
    assertFixtureRow(B, 'costs', bCost, 'tenant B cost fixture'),
  ])
  console.log('Preflight passed: explicit disposable staging fixtures verified.\n')

  /* ------------------------------------------------ 1. baseline sanity */
  console.log('1. Baseline — each tenant sees its own data')
  const aLeads = (await A('leads?select=id')).body
  const bLeads = (await B('leads?select=id')).body
  check('tenant A sees its own leads', Array.isArray(aLeads) && aLeads.length > 0, `${aLeads?.length}`)
  check('tenant B sees its own leads', Array.isArray(bLeads) && bLeads.length > 0, `${bLeads?.length}`)
  check('no id overlap between tenants',
    !aLeads.some((r) => bLeads.some((s) => s.id === r.id)))

  /* ------------------------------------------------ 2. cross-tenant READ */
  console.log('\n2. Cross-tenant reads by direct row id')
  for (const [table, id] of [['leads', bLead], ['calls', bCall], ['costs', bCost]].filter(([, i]) => i)) {
    const r = await A(`${table}?id=eq.${id}&select=*`)
    check(`A cannot read B's ${table} row`, Array.isArray(r.body) && r.body.length === 0,
      `status ${r.status}, ${JSON.stringify(r.body).slice(0, 120)}`)
  }
  // `orgs` keys tenancy on `id`; every other table on `org_id`.
  for (const table of ['leads', 'calls', 'costs', 'messages', 'events', 'tasks',
                       'appointments', 'lead_touches', 'lead_notes', 'audit_log',
                       'org_roi_assumptions', 'agents', 'properties', 'signals',
                       'sequences', 'sequence_enrollments', 'wa_conversations']) {
    const r = await A(`${table}?select=org_id&limit=500`)
    if (!Array.isArray(r.body)) {
      check(`A sees no foreign org_id in ${table}`, false,
        `unexpected response ${r.status}: ${JSON.stringify(r.body).slice(0, 140)}`)
      continue
    }
    const leaked = r.body.filter((row) => row.org_id && row.org_id !== orgA)
    check(`A sees no foreign org_id in ${table}`, leaked.length === 0, JSON.stringify(leaked.slice(0, 2)))
  }
  const orgsSeen = (await A('orgs?select=id')).body ?? []
  check('A sees exactly one org', orgsSeen.length === 1 && orgsSeen[0].id === orgA)

  /* ----------------------------------------------- 3. cross-tenant WRITE */
  console.log('\n3. Cross-tenant writes by direct row id')
  const u1 = await A(`leads?id=eq.${bLead}`, { method: 'PATCH', body: JSON.stringify({ full_name: 'fixture-negative-control' }) })
  requireMutationRefused('A cannot update B\'s lead', u1)

  const u2 = await A(`calls?id=eq.${bCall}`, { method: 'PATCH', body: JSON.stringify({ transcript: 'fixture-negative-control' }) })
  requireMutationRefused('A cannot update B\'s call', u2)

  const u3 = await A(`orgs?id=eq.${orgB}`, { method: 'PATCH', body: JSON.stringify({ name: 'fixture-negative-control' }) })
  requireMutationRefused('A cannot rename B\'s org', u3)

  const d1 = await A(`leads?id=eq.${FIXTURE.deleteLeadB}`, { method: 'DELETE' })
  requireMutationRefused('A cannot delete B\'s fixture lead', d1)

  const d2 = await A(`leads?id=eq.${FIXTURE.deleteLeadA}`, { method: 'DELETE' })
  requireMutationRefused('A cannot delete even its OWN lead', d2)

  /* ------------------------------------------ 4. forged org_id on insert */
  console.log('\n4. Forged org_id on insert')
  const i1 = await A('lead_touches', {
    method: 'POST',
    body: JSON.stringify({ org_id: orgB, lead_id: bLead, channel: 'voice', source: 'dashboard' }),
  })
  requireMutationRefused('A cannot insert a touch into B', i1)

  const i2 = await A('lead_notes', {
    method: 'POST',
    body: JSON.stringify({ org_id: orgB, lead_id: bLead, body: 'fixture-negative-control' }),
  })
  requireMutationRefused('A cannot insert a note into B', i2)

  const i3 = await A('audit_log', {
    method: 'POST',
    body: JSON.stringify({ org_id: orgA, action: 'forged', actor_agent_id: null }),
  })
  requireMutationRefused('A cannot forge an audit entry for another actor', i3)

  /* ------------------------------------------------ 5. RPC surface */
  console.log('\n5. Every dashboard RPC, attacked')
  const from = new Date(Date.now() - 120 * 864e5).toISOString()
  const to = new Date(Date.now() + 864e5).toISOString()

  const detail = await A('rpc/dashboard_lead_detail', {
    method: 'POST', body: JSON.stringify({ p_lead_id: bLead }),
  })
  check('dashboard_lead_detail refuses B\'s lead',
    detail.status >= 400 || detail.body?.lead == null,
    `status ${detail.status}`)

  const ownDetail = await A('rpc/dashboard_lead_detail', {
    method: 'POST', body: JSON.stringify({ p_lead_id: ownLead }),
  })
  check('dashboard_lead_detail still returns A\'s own lead', ownDetail.body?.lead != null)

  const ovA = await A('rpc/dashboard_overview', { method: 'POST', body: JSON.stringify({ p_from: from, p_to: to }) })
  const ovB = await B('rpc/dashboard_overview', { method: 'POST', body: JSON.stringify({ p_from: from, p_to: to }) })
  check('dashboard_overview differs per tenant',
    JSON.stringify(ovA.body?.funnel) !== JSON.stringify(ovB.body?.funnel),
    `${JSON.stringify(ovA.body?.funnel)} vs ${JSON.stringify(ovB.body?.funnel)}`)

  for (const fn of ['dashboard_speed', 'dashboard_call_quality', 'dashboard_roi', 'dashboard_sources']) {
    const r = await A(`rpc/${fn}`, { method: 'POST', body: JSON.stringify({ p_from: from, p_to: to }) })
    const s = JSON.stringify(r.body ?? '')
    check(`${fn} leaks no tenant-B org id`, !s.includes(orgB), `status ${r.status}`)
  }

  const searched = await A('rpc/dashboard_leads', {
    method: 'POST',
    body: JSON.stringify({ p_from: from, p_to: to, p_search: 'Sector', p_limit: 200, p_offset: 0 }),
  })
  const searchIds = (searched.body?.rows ?? []).map((r) => r.id)
  check('transcript search returns only A\'s leads',
    searchIds.every((id) => aLeads.some((l) => l.id === id)),
    `${searchIds.length} rows`)

  const attn = await A('rpc/dashboard_needs_attention', { method: 'POST', body: '{}' })
  check('needs_attention returns only A\'s leads',
    (attn.body ?? []).every((r) => aLeads.some((l) => l.id === r.lead_id)),
    `${(attn.body ?? []).length} rows`)

  /* ------------------------------------------------ 6. role separation */
  console.log('\n6. Role separation inside one tenant')
  const agentLeads = (await Ag('leads?select=id,assigned_agent_id')).body ?? []
  const me = (await Ag('rpc/dashboard_session', { method: 'POST', body: '{}' })).body?.agent?.id
  check('agent sees fewer leads than the owner', agentLeads.length < aLeads.length,
    `${agentLeads.length} vs ${aLeads.length}`)
  check('agent sees only leads assigned to them',
    agentLeads.every((l) => l.assigned_agent_id === me), `agent ${me}`)
  check('agent sees no costs', ((await Ag('costs?select=id')).body ?? []).length === 0)
  check('agent sees no ROI assumptions', ((await Ag('org_roi_assumptions?select=org_id')).body ?? []).length === 0)
  check('agent sees no audit log', ((await Ag('audit_log?select=id')).body ?? []).length === 0)

  const notMine = aLeads.find((l) => !agentLeads.some((a) => a.id === l.id))
  if (notMine) {
    const r = await Ag(`leads?id=eq.${notMine.id}`, { method: 'PATCH', body: JSON.stringify({ score: 1 }) })
    requireMutationRefused('agent cannot edit a colleague\'s lead', r)
  }

  const roiAsAgent = await Ag('rpc/dashboard_roi', { method: 'POST', body: JSON.stringify({ p_from: from, p_to: to }) })
  check('agent gets no ROI assumptions from the RPC',
    roiAsAgent.body?.assumptions == null, JSON.stringify(roiAsAgent.body?.assumptions))

  /* ------------------------------------------------ 7. anonymous */
  console.log('\n7. Anonymous (no session)')
  for (const table of ['leads', 'calls', 'costs', 'orgs', 'agents', 'lead_touches']) {
    const r = await anon(`${table}?select=*&limit=5`)
    check(`anon reads nothing from ${table}`,
      (Array.isArray(r.body) && r.body.length === 0) || r.status >= 400,
      `status ${r.status}`)
  }
  const anonRpc = await anon('rpc/dashboard_overview', { method: 'POST', body: JSON.stringify({ p_from: from, p_to: to }) })
  check('anon cannot call dashboard_overview', anonRpc.status >= 400, `status ${anonRpc.status}`)

  /* ------------------------------------------------ 8. app HTTP routes */
  console.log('\n8. The app\'s own write routes')
  let appUp = true
  try { await fetch(`${APP}/login`, { signal: AbortSignal.timeout(2500) }) }
  catch { appUp = false }

  if (!appUp) {
    console.log('  SKIP  app not running at ' + APP + ' — start it and re-run for this section')
  } else {
    for (const route of ['touch', 'note', 'feedback', 'roi']) {
      const r = await fetch(`${APP}/api/${route}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead_id: bLead, body: 'x', call_id: bCall, is_correct: true }),
      })
      check(`/api/${route} rejects an unauthenticated caller`, r.status === 401, `status ${r.status}`)
    }
    const withBearer = await fetch(`${APP}/api/touch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${aOwner.access_token}` },
      body: JSON.stringify({ lead_id: bLead }),
    })
    check('/api/touch ignores a bearer token (cookie session only)', withBearer.status === 401,
      `status ${withBearer.status}`)
  }

  /* ------------------------------------------------------------ summary */
  console.log(`\n=== ${pass} passed, ${fail} failed ===`)
  if (fail) {
    console.log('\nFailures:')
    failures.forEach((f) => console.log(`  - ${f}`))
    process.exit(1)
  }
  console.log('\nEvery cross-tenant attempt was refused.\n')
}

main().catch((e) => { console.error('\nSUITE ERROR:', e.message); process.exit(1) })
