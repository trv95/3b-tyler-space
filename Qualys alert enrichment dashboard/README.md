Renders a browsable report of Qualys vulnerability findings, enriched with cross-dataset context and mapped to their service owners. The data comes from the **Oracle Mock Data** workflow (sanitized UAT synthetic fixture) via a workflow-backed connector.

**Trigger.** Manual — open [`/vuln-report`](<Dashboard/README.md>) in a browser (space-authenticated). Loading the page runs the report.

**The flow.**
- [Dashboard](<Dashboard/README.md>) (`/vuln-report`, webpage) renders a dark "threat console" shell immediately, then fetches its data client-side.
- [Fetch alerts](<Fetch alerts/README.md>) (`/vuln-report-data`, api) is that data endpoint. It calls the Oracle Mock Data connector: `GET /vulndata/qualys` for all findings, then per finding `GET /vulndata/enrich?qid=…` (Qualys + Security Central + BugDB join) and `GET /vulndata/owners?service=…` (owning team / routing). Returns `{ generatedAt, count, alerts[] }`.

**Connectors.** Oracle Mock Data (workflow-backed) on the Fetch alerts step. Read-only — no writes to the mock data, no external services.

**Auth.** Both routes are `route_auth = "space"`; the connector's `/vulndata/*` routes require `route_auth = "connector"` on the Oracle side.

**Common changes.** Adjust the enrich/owner lookups in [Fetch alerts/script.ts](<Fetch alerts/script.ts>); change presentation, filters, or search in [Dashboard/App.tsx](<Dashboard/App.tsx>).
