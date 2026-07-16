Serves and maintains BugDB mock tickets (created-ticket style records).

**Triggers:**
- `GET /vulndata/bugdb` — list/filter tickets.
- `POST /vulndata/bugdb` — insert or update tickets (upsert).

Both are authenticated as `connector`, so other workflows in the tenant can call them through a workflow-backed connector pointing at this workflow.

**Read (GET).** Exact-match filters on `bug`, `priority`, `risk`, `status`, `product`, `component`, `ownerEmail`, `source`, `sourceFinding`, `securityCentral`, plus substring match on `cve` and `subject`, plus `limit`. Response: `{ "count": n, "records": [...] }`.

**Write (POST).** Body is a single record object or `{ "records": [...] }` for batch. Records are upserted keyed on `bug`: an existing `bug` row is updated (only supplied columns change), otherwise a new row is inserted. Unknown fields are ignored; each record must include a non-empty `bug`. Response: `{ "ok": true, "inserted": n, "updated": m, "keys": [...] }`; malformed JSON or a missing key returns `400`.

Reads/writes `/storage/vulndata/vuln.db` (the `vulndata` volume, mounted read-write with exclusive concurrency). The DB is initially built by the [Seed database step](<../Seed database/script.ts>). Logic lives in [script.ts](script.ts) with shared helpers in [lib.ts](lib.ts); the full contract is in [api.json](api.json).
