An executive dashboard over the ServiceNow **InfoSec** assignment group: SLA attainment, responsiveness, throughput, backlog risk and per-analyst performance for the security operations queue.

**Entry point** — [CISO dashboard](<CISO dashboard/README.md>) at `/ciso-infosec-dashboard`, an HTML page for space members. It renders instantly and fetches its data client-side from [Infosec queue data](<Infosec queue data/README.md>) at `/infosec-queue-data` (JSON, also space-only). There is no schedule and no writes to any external system — the whole workflow is read-only.

**Data** — no live ServiceNow instance is connected, so [Infosec queue data/script.ts](<Infosec queue data/script.ts>) generates a deterministic 180-day sample queue shaped like real ServiceNow `incident` records (seven analysts, eight security categories, four priorities, SLA targets, reassignments, reopens, a phishing-campaign spike and a gradual staffing-pressure drift). The page banner says so, in plain sight.

**To go live against ServiceNow**: attach the ServiceNow connector to `Infosec queue data` and replace the generator with a Table API call —
`GET {SERVICE_NOW_URL}/api/now/table/incident?sysparm_query=assignment_group.name=InfoSec^opened_at>=javascript:gs.daysAgoStart(180)&sysparm_display_value=true` — mapping fields to the keys documented in [Infosec queue data/api.json](<Infosec queue data/api.json>). The dashboard needs no changes. For a large queue, paginate with `sysparm_offset` and consider caching the result in a named volume behind a cron refresh.

All metrics are computed in the browser in [CISO dashboard/metrics.ts](<CISO dashboard/metrics.ts>) — medians rather than means, and the 90% resolution-SLA target is the `RESOLUTION_TARGET` constant in [CISO dashboard/App.tsx](<CISO dashboard/App.tsx>).
