# Product architecture

## System map

The Next.js App Router application renders authenticated dashboard pages. Server components and API routes create a Supabase server client bound to the caller's cookie. The browser uses a Supabase browser client only where needed.

Supabase provides authentication, Postgres RPCs, and tables. The application resolves the caller's organisation and agent through `dashboard_session`; it does not accept tenant IDs from write request bodies. Database row-level security is the final tenant boundary.

Global administrators are listed in the private `app.global_admins` table. An unavailable owner agent row is created for each brokerage, including future brokerages. A global administrator chooses one brokerage at a time through an HTTP-only cookie; the server passes that ID in a Supabase request header. `app.current_org_id()` honors the header only for listed global administrators. Ordinary users keep the organisation from their signed Auth claim. All existing dashboard queries and RLS policies continue to see one selected brokerage per request.

## Important constraints

- No service-role key is used by this application.
- Middleware validates users with `getUser()` and redirects unauthenticated page requests to login; API routes return 401.
- Write routes use per-process rate limiting. It reduces accidental retries but is not a distributed production rate-limit control.
