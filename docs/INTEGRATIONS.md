# Integrations

## Supabase

Supabase provides authentication, tenant-scoped database access, and RPCs used by the dashboard. The client uses a publishable URL and anonymous key; user cookies establish the authenticated boundary. Auth failures redirect page requests to login or return 401 from API routes. Database failures return safe user-facing errors from write routes.

No service-role credential is used by this application.
