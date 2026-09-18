# Operations runbook

Install dependencies with `npm ci`. Run `npm run typecheck`, `npm run test:ui`, and `npm run test:fixture-safety` before release.

Set only documented public Supabase and site URL variables in deployment configuration. Do not add a service-role key. Verify an unauthenticated dashboard page redirects to login and an unauthenticated API write returns 401.

Before staging integration tests, configure only disposable fixture accounts and rows in `.env.local`. The application must be running for HTTP portions of `npm run test:tenancy`.
