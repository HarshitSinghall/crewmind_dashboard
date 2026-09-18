# Product architecture

## System map

The Next.js App Router application renders authenticated dashboard pages. Server components and API routes create a Supabase server client bound to the caller's cookie. The browser uses a Supabase browser client only where needed.

Supabase provides authentication, Postgres RPCs, and tables. The application resolves the caller's organisation and agent through `dashboard_session`; it does not accept tenant IDs from write request bodies. Database row-level security is the final tenant boundary.

## Important constraints

- No service-role key is used by this application.
- Middleware validates users with `getUser()` and redirects unauthenticated page requests to login; API routes return 401.
- Write routes use per-process rate limiting. It reduces accidental retries but is not a distributed production rate-limit control.
