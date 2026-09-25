**Saviynt webhook** trigger for access requests. Configure a Saviynt notification / REST callback to POST JSON to the `/access-request-saviynt` route (route auth `external_id` — the unguessable URL is the credential).

Saviynt field names vary by configuration, so [script.ts](script.ts) maps a range of common keys defensively (and looks one level into `requestData` / `eventData` / `request`):

| Normalized | Saviynt keys tried |
|---|---|
| name | user, username, requestor, requestedFor, beneficiary |
| email | email, userEmail, requestorEmail |
| system | endpoint, endpointName, application, securitySystem |
| level | entitlement, entitlementValue, accessLevel, role |
| duration | duration, validUntil, endDate, expiryDate |
| reason | justification, businessJustification, comments |

It normalizes the payload and links to [Process request](<../Process request/script.ts>), which creates the Tines case and posts the Slack approval message. If your Saviynt payload uses different field names, tell me the sample and I'll map them exactly.
