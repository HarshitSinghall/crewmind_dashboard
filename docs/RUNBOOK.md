# Operations runbook

Install dependencies with `npm ci`. Run `npm run typecheck`, `npm run test:ui`, and `npm run test:fixture-safety` before release.

Set only documented public Supabase and site URL variables in deployment configuration. Do not add a service-role key. Verify an unauthenticated dashboard page redirects to login and an unauthenticated API write returns 401.

Before staging integration tests, configure only disposable fixture accounts and rows in `.env.local`. The application must be running for HTTP portions of `npm run test:tenancy`.

Apply the `global_admin_access` database migration before deploying application code with the brokerage selector. For a new global administrator, create or confirm a real-email Supabase Auth account, then add its Auth user ID, display name, and default organisation ID to the private `app.global_admins` table. The insert creates an unavailable owner agent for each current brokerage; an organisation insert creates one for each existing global administrator. Do not put personal details in migrations or handoff documents.

To revoke cross-brokerage access, remove the membership from `app.global_admins` and revoke the user's active sessions. Existing agent rows remain for audit references and must be reviewed before any cleanup. The administrator uses the standard magic-link login; Supabase Auth URL configuration must allow the deployed `/auth/callback` URL. Verify that the selector lists expected brokerages, an ordinary owner cannot switch by sending a forged header, and unauthenticated writes still return 401.
