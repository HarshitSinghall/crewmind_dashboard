# Product safety

All pages require Supabase authentication. Tenant identity is resolved server-side from the session, and write routes do not trust a caller-provided organisation ID. Supabase row-level security must remain enabled and enforced for every organisation-scoped table and RPC.

Owner-only ROI updates receive an application-level role check and rely on database policy as a second boundary. Write routes audit actions after success and impose per-process request limits.

Global administrators can select any brokerage, but see only that brokerage during each request. The selector is available only after Supabase authentication and membership in the private `app.global_admins` table. A forged brokerage header from an ordinary user is ignored by `app.current_org_id()`; restrictive organisation policies remain active. Admin agent rows are unavailable for automatic lead assignment.

Test suites that mutate data refuse to run without explicitly identified disposable staging fixtures. Never run them against production, customer, or shared demo data.
