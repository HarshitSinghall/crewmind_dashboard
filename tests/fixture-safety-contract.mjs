import assert from 'node:assert/strict'
import {
  assertAuthenticatedFixture,
  assertFixtureRow,
  assertFixtureTenant,
  requireDashboardFixtureConfig,
  requireSharedFixtureConfig,
} from './fixture-safety.mjs'

const saved = { ...process.env }
const reset = () => {
  for (const key of Object.keys(process.env)) {
    if (!(key in saved)) delete process.env[key]
  }
  Object.assign(process.env, saved)
}

const configureLocalContractFixture = () => {
  Object.assign(process.env, {
    TEST_FIXTURE_CONFIRM: 'CREWMIND_DISPOSABLE_FIXTURES_V1',
    TEST_ENVIRONMENT: 'staging',
    NEXT_PUBLIC_SUPABASE_URL: 'https://fixture-project.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'local-parser-test-only',
    TEST_EXPECTED_SUPABASE_PROJECT_REF: 'fixture-project',
    TEST_PASSWORD: 'local-parser-test-only',
    TEST_FIXTURE_OWNER_A_EMAIL: 'owner@fixture.invalid',
    TEST_FIXTURE_AGENT_A_EMAIL: 'agent@fixture.invalid',
    TEST_FIXTURE_ORG_A_ID: '00000000-0000-4000-8000-000000000001',
    TEST_FIXTURE_ORG_A_SLUG: 'fixture-local-contract',
    TEST_FIXTURE_ORG_A_NAME: 'Local Contract Fixture',
  })
}

try {
  configureLocalContractFixture()
  assert.equal(requireDashboardFixtureConfig().orgASlug, 'fixture-local-contract')

  process.env.TEST_ENVIRONMENT = 'production'
  assert.throws(() => requireSharedFixtureConfig(), /refuse/i)

  configureLocalContractFixture()
  process.env.TEST_EXPECTED_SUPABASE_PROJECT_REF = 'different-project'
  assert.throws(() => requireSharedFixtureConfig(), /does not match/i)

  configureLocalContractFixture()
  process.env.TEST_FIXTURE_ORG_A_SLUG = 'shared-demo'
  assert.throws(() => requireDashboardFixtureConfig(), /must begin/i)

  configureLocalContractFixture()
  process.env.TEST_FIXTURE_ORG_A_ID = 'not-a-uuid'
  assert.throws(() => requireDashboardFixtureConfig(), /real fixture UUID/i)

  configureLocalContractFixture()
  const config = requireDashboardFixtureConfig()
  assert.throws(
    () => assertAuthenticatedFixture({ user: { app_metadata: { org_id: 'wrong' } } }, config.orgA, 'owner'),
    /unexpected organization/i,
  )

  await assert.doesNotReject(
    assertFixtureTenant(
      async () => ({ status: 200, body: [{ id: config.orgA, slug: config.orgASlug, is_demo: true }] }),
      config.orgA,
      config.orgASlug,
      'tenant',
    ),
  )
  await assert.rejects(
    assertFixtureTenant(async () => ({ status: 200, body: [] }), config.orgA, config.orgASlug, 'tenant'),
    /not the explicitly configured/i,
  )
  await assert.doesNotReject(
    assertFixtureRow(
      async () => ({ status: 200, body: [{ id: config.orgA }] }),
      'orgs',
      config.orgA,
      'row',
    ),
  )
  await assert.rejects(
    assertFixtureRow(async () => ({ status: 404, body: null }), 'orgs', config.orgA, 'row'),
    /missing or is not visible/i,
  )
} finally {
  reset()
}

console.log('Fixture safety contract checks passed (10 assertions).')
