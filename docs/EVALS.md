# Product evaluations

Run `npm run test:ui` to validate UI contract checks and `npm run test:fixture-safety` to validate fixture safeguards.

With explicit disposable staging configuration, run `npm run test:tenancy` and require every attempted cross-tenant read and write to fail. Evidence is the test output showing no failures.
