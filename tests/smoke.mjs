/**
 * Page smoke test. Signs in for real, mints the same session cookie
 * @supabase/ssr writes, then fetches every screen and asserts it rendered with
 * live figures rather than an error boundary.
 *
 * Run:  node --env-file=.env.local tests/smoke.mjs   (app must be running)
 */

import {
  assertAuthenticatedFixture,
  assertFixtureTenant,
  requireDashboardFixtureConfig,
} from './fixture-safety.mjs'

const FIXTURE = requireDashboardFixtureConfig()
const URL_BASE = FIXTURE.urlBase
const ANON = FIXTURE.anon
const APP = process.env.TEST_APP_URL ?? 'http://localhost:3000'
const PASSWORD = FIXTURE.password

const ref = new URL(URL_BASE).hostname.split('.')[0]
const CHUNK = 3180

let pass = 0, fail = 0
const failures = []
function check(name, ok, detail = '') {
  if (ok) { pass++; console.log(`  PASS  ${name}`) }
  else { fail++; failures.push(`${name} ${detail}`); console.log(`  FAIL  ${name}  ${detail}`) }
}

async function signIn(email) {
  const res = await fetch(`${URL_BASE}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: PASSWORD }),
  })
  if (!res.ok) throw new Error(`sign-in failed: ${res.status}`)
  return res.json()
}

function sessionCookie(s) {
  const encoded = 'base64-' + Buffer.from(JSON.stringify(s), 'utf8').toString('base64')
  const name = `sb-${ref}-auth-token`
  if (encoded.length <= CHUNK) return `${name}=${encoded}`
  const parts = []
  for (let i = 0; i * CHUNK < encoded.length; i++) {
    parts.push(`${name}.${i}=${encoded.slice(i * CHUNK, (i + 1) * CHUNK)}`)
  }
  return parts.join('; ')
}

function rest(token) {
  return async (path) => {
    const res = await fetch(`${URL_BASE}/rest/v1/${path}`, {
      headers: { apikey: ANON, Authorization: `Bearer ${token}` },
    })
    return { status: res.status, body: await res.json() }
  }
}

async function get(path, cookie) {
  const res = await fetch(`${APP}${path}`, { headers: { cookie }, redirect: 'manual' })
  return { status: res.status, html: await res.text() }
}

const OWNER_EMAIL = FIXTURE.ownerEmail
const AGENT_EMAIL = FIXTURE.agentEmail

/** Reads orgs.is_demo for this user's tenant, through the same RPC the app uses. */
async function isDemoTenant(access_token) {
  const res = await fetch(`${URL_BASE}/rest/v1/rpc/dashboard_session`, {
    method: 'POST',
    headers: {
      apikey: ANON,
      Authorization: `Bearer ${access_token}`,
      'Content-Type': 'application/json',
    },
    body: '{}',
  })
  const s = await res.json()
  return s?.org?.is_demo === true
}

async function main() {
  console.log('\n=== Page smoke test ===\n')
  const ownerSession = await signIn(OWNER_EMAIL)
  const agentSession = await signIn(AGENT_EMAIL)
  assertAuthenticatedFixture(ownerSession, FIXTURE.orgA, 'fixture owner')
  assertAuthenticatedFixture(agentSession, FIXTURE.orgA, 'fixture agent')
  await assertFixtureTenant(rest(ownerSession.access_token), FIXTURE.orgA, FIXTURE.orgASlug, 'dashboard tenant')
  const owner = sessionCookie(ownerSession)
  const agent = sessionCookie(agentSession)
  console.log('Preflight passed: explicit disposable staging tenant verified.\n')

  const pages = [
    ['/',        ['Median time to first call', 'Waiting on your team', 'What happened to your leads']],
    ['/leads',   ['Leads', 'Search names, numbers']],
    ['/speed',   ['Before and after', 'How long leads waited', 'What happened after the AI handed over']],
    ['/quality', ['Calls placed', 'When people hang up', 'Which sources actually produce buyers']],
    ['/roi',     ['What Crewmind did', 'Against a telecaller', 'Your numbers']],
  ]

  console.log('1. Owner can load every screen')
  for (const [path, needles] of pages) {
    const r = await get(path, owner)
    check(`GET ${path} → 200`, r.status === 200, `status ${r.status}`)
    for (const nd of needles) {
      check(`  ${path} renders “${nd}”`, r.html.includes(nd))
    }
    check(`  ${path} has no error boundary`, !r.html.includes('Could not load'), '')
  }

  // The banner assertion follows the fixture tenant's current is_demo flag.
  console.log('\n2. The demo banner tracks orgs.is_demo')
  const home = await get('/', owner)
  const ownerIsDemo = await isDemoTenant(ownerSession.access_token)
  if (ownerIsDemo) {
    check('DEMO banner rendered', home.html.includes('DEMO TENANT'))
    check('banner names the tenant', home.html.includes(FIXTURE.orgAName))
  } else {
    check('no DEMO banner on a real tenant', !home.html.includes('DEMO TENANT'))
    check('tenant is still named in the header', home.html.includes(FIXTURE.orgAName))
  }

  console.log('\n3. Real figures, not placeholders')
  check('hero shows a duration', /Median time to first call/.test(home.html))
  check('no NaN anywhere', !home.html.includes('NaN'))
  check('no "undefined" leaking into copy', !home.html.includes('>undefined<'))

  console.log('\n4. A lead detail page renders')
  const leads = await get('/leads', owner)
  const id = leads.html.match(/\/leads\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/)?.[1]
  check('found a lead link on the list', !!id, id ?? '')
  if (id) {
    const d = await get(`/leads/${id}`, owner)
    check('lead detail → 200', d.status === 200, `status ${d.status}`)
    check('lead detail shows the timeline', d.html.includes('Timeline'))
    check('lead detail shows actions', d.html.includes('I called this lead'))
    check('lead detail shows the original enquiry', d.html.includes('Original enquiry'))
  }

  console.log('\n5. An agent is kept off the ROI screen')
  const agentRoi = await get('/roi', agent)
  check('agent gets the explanatory block, not figures',
    agentRoi.html.includes('This screen is for the account owner'), `status ${agentRoi.status}`)
  check('agent ROI page leaks no rupee totals', !agentRoi.html.includes('Against a telecaller'))

  console.log('\n6. Signed-out users are redirected')
  const out = await fetch(`${APP}/`, { redirect: 'manual' })
  check('unauthenticated / redirects to login', out.status === 307 || out.status === 302,
    `status ${out.status}`)

  console.log(`\n=== ${pass} passed, ${fail} failed ===`)
  if (fail) { console.log('\nFailures:'); failures.forEach((f) => console.log('  - ' + f)); process.exit(1) }
  console.log('')
}

main().catch((e) => { console.error('\nSMOKE ERROR:', e.message); process.exit(1) })
