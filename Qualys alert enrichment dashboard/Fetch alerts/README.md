Data endpoint that powers the vulnerability report dashboard.

Triggered by an HTTP GET to **`/vuln-report-data`** (`route_auth = "space"`), typically by the [Dashboard](../Dashboard/App.tsx) page fetching it client-side. Returns JSON.

It calls the **Oracle Mock Data** workflow connector (base `WORKFLOW_URL`), which serves the sanitized UAT vulnerability fixture:

1. `GET /vulndata/qualys?limit=500` — all Qualys findings (the alerts).
2. `GET /vulndata/enrich?service=<s1>&service=<s2>&…` — a **single** enrichment call passing every unique service as a repeated `service` param. The API now accepts a list of keys and returns one joined view across owners, Qualys, Security Central, and BugDB for all of them.

Each finding is then joined locally against that one response: Security Central by `qid`, BugDB by `bug` (falling back to `sourceFinding`), and owner by `service`. Two calls total regardless of finding count, so the page load stays well under the gateway timeout.

Output shape:

```json
{
  "generatedAt": "2025-...Z",
  "count": 36,
  "alerts": [
    { "alert": { ...qualys record }, "enrich": { ...joined }, "owner": { ...owner record | null } }
  ]
}
```

Read-only — no writes to the mock data.
