const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const FIXTURE_SENTINEL = 'CREWMIND_DISPOSABLE_FIXTURES_V1'

function required(name) {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`Missing required test setting: ${name}`)
  return value
}

function uuid(name) {
  const value = required(name)
  if (!UUID_RE.test(value)) throw new Error(`${name} must be a real fixture UUID`)
  return value
}

function fixtureSlug(name) {
  const value = required(name)
  if (!/^(fixture|test)[-_]/i.test(value)) {
    throw new Error(`${name} must begin with fixture- or test-`)
  }
  return value
}

export function requireSharedFixtureConfig() {
  if (required('TEST_FIXTURE_CONFIRM') !== FIXTURE_SENTINEL) {
    throw new Error(`TEST_FIXTURE_CONFIRM must equal ${FIXTURE_SENTINEL}`)
  }
  if (required('TEST_ENVIRONMENT').toLowerCase() !== 'staging') {
    throw new Error('Fixture tests refuse every TEST_ENVIRONMENT except staging')
  }

  const urlBase = required('NEXT_PUBLIC_SUPABASE_URL').replace(/\/$/, '')
  const projectRef = new URL(urlBase).hostname.split('.')[0]
  if (projectRef !== required('TEST_EXPECTED_SUPABASE_PROJECT_REF')) {
    throw new Error('Supabase URL does not match TEST_EXPECTED_SUPABASE_PROJECT_REF')
  }

  return {
    urlBase,
    anon: required('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    password: required('TEST_PASSWORD'),
    projectRef,
  }
}

export function requireDashboardFixtureConfig() {
  return {
    ...requireSharedFixtureConfig(),
    ownerEmail: required('TEST_FIXTURE_OWNER_A_EMAIL'),
    agentEmail: required('TEST_FIXTURE_AGENT_A_EMAIL'),
    orgA: uuid('TEST_FIXTURE_ORG_A_ID'),
    orgASlug: fixtureSlug('TEST_FIXTURE_ORG_A_SLUG'),
    orgAName: required('TEST_FIXTURE_ORG_A_NAME'),
  }
}

export function requireTenancyFixtureConfig() {
  return {
    ...requireDashboardFixtureConfig(),
    ownerBEmail: required('TEST_FIXTURE_OWNER_B_EMAIL'),
    orgB: uuid('TEST_FIXTURE_ORG_B_ID'),
    orgBSlug: fixtureSlug('TEST_FIXTURE_ORG_B_SLUG'),
    leadA: uuid('TEST_FIXTURE_LEAD_A_ID'),
    deleteLeadA: uuid('TEST_FIXTURE_DELETE_LEAD_A_ID'),
    leadB: uuid('TEST_FIXTURE_LEAD_B_ID'),
    deleteLeadB: uuid('TEST_FIXTURE_DELETE_LEAD_B_ID'),
    callB: uuid('TEST_FIXTURE_CALL_B_ID'),
    costB: uuid('TEST_FIXTURE_COST_B_ID'),
  }
}

export function assertAuthenticatedFixture(session, expectedOrg, label) {
  const actualOrg = session?.user?.app_metadata?.org_id
  if (actualOrg !== expectedOrg) {
    throw new Error(`${label} authenticated into an unexpected organization`)
  }
}

export async function assertFixtureTenant(client, expectedOrg, expectedSlug, label) {
  const response = await client(`orgs?id=eq.${expectedOrg}&select=id,slug,is_demo`)
  if (
    response.status !== 200
    || response.body?.length !== 1
    || response.body[0].slug !== expectedSlug
    || response.body[0].is_demo !== true
  ) {
    throw new Error(`${label} is not the explicitly configured disposable fixture tenant`)
  }
}

export async function assertFixtureRow(client, table, id, label) {
  const response = await client(`${table}?id=eq.${id}&select=id`)
  if (response.status !== 200 || response.body?.length !== 1 || response.body[0].id !== id) {
    throw new Error(`${label} is missing or is not visible to its owning fixture session`)
  }
}
