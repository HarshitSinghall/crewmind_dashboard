# Data model

Organisation is the tenant boundary. Agents belong to an organisation and are linked to authenticated users through the `dashboard_session` RPC.

Operational entities include leads, calls, costs, messages, events, tasks, appointments, properties, signals, sequences, and WhatsApp conversations. Follow-up writes create `lead_touches` and `lead_notes`; feedback is stored in `call_feedback`; sensitive actions are recorded in `audit_log`; owner-entered ROI inputs are stored in `org_roi_assumptions`.

Rows are organisation-scoped and protected by Supabase row-level security. Retention policy is not defined in this repository.
