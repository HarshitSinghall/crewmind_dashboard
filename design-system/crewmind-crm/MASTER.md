# CrewMind CRM design system

## Product read

Operational B2B CRM for Indian real-estate sales teams. The interface should feel calm, accountable, and quick to scan in an office or on a phone with an unreliable connection. It is not a luxury property catalogue and does not use decorative glass, gradients, or marketing-page typography.

Design dials: variance 4/10, motion 3/10, density 8/10.

## Foundations

- IBM Plex Sans for UI and Devanagari; IBM Plex Mono for technical values.
- Forest green is the single brand/action colour. Orange means waiting or operational attention. Red is reserved for failure/destructive meaning.
- Background `#f4f7f5`, surface `#fcfdfc`, ink `#14231c`, muted `#52645a`, accent `#176b4d`, line `#c7d3cb`.
- Dark surfaces use `#111a15` / `#1b2820` with light green-gray text. Test dark-mode contrast independently.
- Cards use 8px corners, one border, and very low elevation. Controls share 8px corners; compact brand marks use 10px.

## Interaction and layout

- Desktop: 248px persistent sidebar. Mobile: sticky top identity bar and five-item labelled bottom navigation.
- Primary controls and inputs are at least 44px high. Every icon-only control has an accessible name.
- URL state owns date ranges, filters, pagination, and selected call attempts.
- Motion is limited to short hover/state transitions and must disappear under `prefers-reduced-motion`.
- Every async write owns its request state from start through `finally`, blocks duplicate submission, catches network rejection, and announces success only after persistence.
- Loading uses shape-matched skeletons. Empty/error states explain recovery. Unknown provider facts stay explicitly unknown.

## Content hierarchy

1. Human follow-up queue and system exceptions.
2. Current response-speed and funnel evidence.
3. Lead/call detail with an explicit attempt selection.
4. Analytical detail and owner assumptions.

Do not add call or message CTAs until an authenticated, gated, idempotent automation write path exists.
