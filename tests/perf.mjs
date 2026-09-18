import {
  assertAuthenticatedFixture,
  assertFixtureTenant,
  requireDashboardFixtureConfig,
} from './fixture-safety.mjs'

const FIXTURE = requireDashboardFixtureConfig()
const URL_BASE = FIXTURE.urlBase
const ANON = FIXTURE.anon
const APP = process.env.TEST_APP_URL ?? 'http://localhost:3000'
const ref = new URL(URL_BASE).hostname.split('.')[0]

const response = await fetch(`${URL_BASE}/auth/v1/token?grant_type=password`, {
  method: 'POST',
  headers: { apikey: ANON, 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: FIXTURE.ownerEmail, password: FIXTURE.password }),
})
if (!response.ok) throw new Error(`fixture sign-in failed: ${response.status}`)
const session = await response.json()
assertAuthenticatedFixture(session, FIXTURE.orgA, 'performance fixture owner')

const fixtureClient = async (path) => {
  const res = await fetch(`${URL_BASE}/rest/v1/${path}`, {
    headers: { apikey: ANON, Authorization: `Bearer ${session.access_token}` },
  })
  return { status: res.status, body: await res.json() }
}
await assertFixtureTenant(fixtureClient, FIXTURE.orgA, FIXTURE.orgASlug, 'performance tenant')

const encoded = 'base64-' + Buffer.from(JSON.stringify(session), 'utf8').toString('base64')
const name = `sb-${ref}-auth-token`
let cookie
if (encoded.length <= 3180) {
  cookie = `${name}=${encoded}`
} else {
  const parts = []
  for (let i = 0; i * 3180 < encoded.length; i++) {
    parts.push(`${name}.${i}=${encoded.slice(i * 3180, (i + 1) * 3180)}`)
  }
  cookie = parts.join('; ')
}

console.log('Preflight passed: explicit disposable staging tenant verified.')
console.log('path'.padEnd(24), 'median', '  p-worst', '  wire(gzip)')
for (const path of ['/', '/leads', '/leads?q=Sector%2065', '/speed', '/quality', '/roi']) {
  const timings = []
  for (let i = 0; i < 7; i++) {
    const started = performance.now()
    const res = await fetch(APP + path, { headers: { cookie } })
    await res.arrayBuffer()
    timings.push(performance.now() - started)
  }
  timings.sort((a, b) => a - b)
  const res = await fetch(APP + path, { headers: { cookie, 'accept-encoding': 'gzip' } })
  const body = await res.arrayBuffer()
  console.log(
    path.padEnd(24),
    Math.round(timings[3]) + 'ms',
    '   ' + Math.round(timings[6]) + 'ms',
    '   ' + (body.byteLength / 1024).toFixed(0) + 'kB',
    res.headers.get('content-encoding') || 'none',
  )
}
