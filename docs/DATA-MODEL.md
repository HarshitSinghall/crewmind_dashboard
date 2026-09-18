# Data model

Organisation is the tenant boundary. Agents belong to an organisation and are linked to authenticated users through the `dashboard_session` RPC.

The private `app.global_admins` table maps authorized Auth users to a default organisation. Each global administrator has one unavailable owner agent row per organisation. The `(org_id, auth_user_id)` pair is unique, so the same administrator can enter multiple organisations without affecting ordinary agents.

Operational entities include leads, calls, costs, messages, events, tasks, appointments, properties, signals, sequences, and WhatsApp conversations. Follow-up writes create `lead_touches` and `lead_notes`; feedback is stored in `call_feedback`; sensitive actions are recorded in `audit_log`; owner-entered ROI inputs are stored in `org_roi_assumptions`.

Rows are organisation-scoped and protected by Supabase row-level security. Retention policy is not defined in this repository.
