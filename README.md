# CrewMind dashboard

Session-bound Next.js CRM for brokerage owners and agents. It surfaces lead response speed, call evidence, qualification, human follow-up, call quality, and owner-entered ROI assumptions.

## Local setup

1. Copy `.env.local.example` to `.env.local` and supply the authorized Supabase public URL/key and local login flags. Never commit credentials.
2. Run `npm.cmd install`.
3. Run `npm.cmd run dev` and open the printed loopback URL.

Validation commands:

- `npm.cmd run typecheck`
- `npm.cmd run test:ui`
- `npm.cmd run build`

The tenancy, smoke and performance suites are staging-only and require the explicit disposable-fixture settings documented in `.env.local.example`. The tenancy suite uses only the supplied fixture UUIDs and refuses non-staging, mismatched-project or non-fixture-slug targets. Do not supply customer, production or shared demo rows.

## Product boundaries

The dashboard can record human touches, notes, per-call feedback, and ROI assumptions. It does not initiate calls, resend WhatsApp messages, confirm viewings, or repair provider reports. Missing provider evidence remains unknown. Tenant identity comes from the authenticated server session, never from a browser-supplied organisation ID.

The responsive shell uses a desktop sidebar and a five-destination mobile bottom navigation. Theme selection is stored only in the browser. The source of truth for visual decisions is [the CRM design system](design-system/crewmind-crm/MASTER.md).

## Known release check

The dashboard is on the patched Next.js 15.5 line. `npm audit` still reports PostCSS advisories in Next.js' nested dependency whose automated remediation requires a breaking Next.js 16 upgrade. Review and test that upgrade separately before public release.
"# crewmind_dashboard" 
