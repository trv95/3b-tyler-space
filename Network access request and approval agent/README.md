Conversational network access intake, policy evaluation, approval routing, simulated provisioning, and expiration monitoring.

#### Entry points
- [Network Access Chat](<Network Access Chat/README.md>) is the SSO-protected requester experience at `/network-access`.
- [Access Concierge (AI Agent)](<Access Concierge (AI Agent)/README.md>) gathers context progressively and confirms before submission.
- [Access Request API](<Access Request API/README.md>) evaluates policy and stores the queryable audit ledger.
- [Expiration and Cleanup](<Expiration and Cleanup/README.md>) checks grants hourly for expiry and 24-hour warnings.

#### Current operating mode
Policy decisions, approval state, audit history, status lookup, registration codes, and expiration identification are functional. Provisioning is intentionally in safe simulation mode until a NAC connector is selected. Okta/Entra profile enrichment, contractor verification, Slack/email interactive approval, and live NAC revocation require matching connectors for the customer's stack.

Routes use space authentication, so only members of Tyler-space can access the draft and Live endpoints. The authenticated email header is used as the request owner and status access boundary.

#### Policy defaults
Guest access is Low risk; internal departmental access is Medium; finance, HR, regulated, and production segments are High. Medium access is capped at 30 days and High at 7 days. Contractor internal access is elevated to High. Change these mappings in `Access Request API/script.ts`.
