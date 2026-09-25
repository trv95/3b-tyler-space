Serves the incident dataset the dashboard renders, as JSON, at `GET /infosec-queue-data` (space members only).

There is no live ServiceNow instance connected, so [script.ts](script.ts) generates a deterministic **sample** InfoSec queue: 180 days of incidents across seven named analysts, eight security categories, four ServiceNow priorities, with response/resolution SLA targets, reassignments, reopens and a deliberate phishing-campaign spike and staffing-pressure drift so the trend lines say something. The seed is fixed, so the numbers are stable between loads.

The response shape is documented in [api.json](api.json) and mirrors ServiceNow `incident` field names (`number`, `assigned_to`, `opened_at`, `resolved_at`, `state`, …).

To point this at a real instance, replace the generator with a ServiceNow Table API call — `GET /api/now/table/incident?sysparm_query=assignment_group.name=InfoSec^opened_at>=javascript:gs.daysAgoStart(180)` — attach the ServiceNow connector, and map the returned fields to the same keys. Nothing downstream needs to change.
