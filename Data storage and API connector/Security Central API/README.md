Serves and maintains Security Central finding records mapped to service ownership and BugDB tickets.

**Triggers:**
- `GET /vulndata/security-central` — list/filter findings.
- `POST /vulndata/security-central` — insert or update findings (upsert).

Both are authenticated as `connector`, so other workflows in the tenant can call them through a workflow-backed connector pointing at this workflow.

**Read (GET).** Exact-match filters on `securityCentralId`, `severity`, `status`, `qid`, `resource`, `service`, `ownerEmail`, `bug`, `region`, plus substring match on `cve` and `summary`, plus `limit`. Response: `{ "count": n, "records": [...] }`.

**Write (POST).** Body is a single record object or `{ "records": [...] }` for batch. Records are upserted keyed on `securityCentralId`: an existing `securityCentralId` row is updated (only supplied columns change), otherwise a new row is inserted. Unknown fields are ignored; each record must include a non-empty `securityCentralId`. Response: `{ "ok": true, "inserted": n, "updated": m, "keys": [...] }`; malformed JSON or a missing key returns `400`.

Reads/writes `/storage/vulndata/vuln.db` (the `vulndata` volume, mounted read-write with exclusive concurrency). The DB is initially built by the [Seed database step](<../Seed database/script.ts>). Logic lives in [script.ts](script.ts) with shared helpers in [lib.ts](lib.ts); the full contract is in [api.json](api.json).
