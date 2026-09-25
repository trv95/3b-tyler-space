Employee self-service access governance workflow. Employees submit requests in the space-authenticated portal; BambooHR supplies department, role, and manager context, and Slack delivers manager or fallback-channel approvals. Decisions create an auditable grant record. A daily 13:00 UTC review opens or reuses an attestation cycle and notifies `3b-demo`; reviewers retain or revoke grants on the review page. Revocations create Tines Cases exactly once.

Inputs are authenticated HTTP requests, BambooHR directory data, Slack decisions, and reviewer attestations. Outputs are approval decisions, grant records, full audit events, and revocation case identifiers/URLs at `/api/report`.

Operational changes: edit the expiry and fallback settings in `Requests API`, the schedule in `Daily access review/config.toml`, and supported systems in `Access portal/App.tsx`. State is stored in the shared exclusive `access_state` SQLite volume. Routes are restricted to members of Tyler-space.
