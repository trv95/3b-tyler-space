Serves Security Central finding records mapped to service ownership and BugDB tickets. Supports exact filters plus substring match on `cve` and `summary`.

**Trigger:** HTTP `GET /vulndata/security-central` â authenticated as `connector`, so other workflows in the tenant can call it through a workflow-backed connector pointing at this workflow.

Reads `/storage/vulndata/vuln.db` (the `vulndata` volume, read-only) which is built by the [Seed database step](<../Seed database/script.ts>). Query params are optional filters â see [api.json](api.json) for the full list. Response is `{ "count": n, "records": [...] }`. Query logic lives in [script.ts](script.ts) with shared helpers in [lib.ts](lib.ts).
