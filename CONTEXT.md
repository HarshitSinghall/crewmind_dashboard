# Product context

## Product in brief

Crewmind is an internal brokerage dashboard for measuring speed-to-lead, lead follow-up, call quality, and estimated return on investment. It gives brokerage owners and agents an authenticated, tenant-scoped view of operational performance.

## Current snapshot

- Next.js 15 application with Supabase authentication and data access.
- All dashboard pages require a signed-in user linked to an organisation.
- A global administrator can choose a brokerage and use its owner dashboard. Figures remain scoped to the selected brokerage; the dashboard does not combine brokerages.
- Demo tenants may contain generated sample data.
