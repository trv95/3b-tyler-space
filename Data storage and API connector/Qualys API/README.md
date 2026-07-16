Serves and maintains Qualys scan findings, with routing and linked mock ticket references.

**Triggers:**
- `GET /vulndata/qualys` — list/filter findings.
- `POST /vulndata/qualys` — insert or update findings (upsert).

Both are authenticated as `connector`, so other workflows in the tenant can call them through a workflow-backed connector pointing at this workflow.

**Read (GET).** Exact-match filters on `findingId`, `qid`, `priority`, `risk`, `asset`, `service`, `ownerEmail`, `target`, `bug`, `securityCentral`, plus substring match on `cve` and `title`, plus `limit`. Response: `{ "count": n, "records": [...] }`.

**Write (POST).** Body is a single record object or `{ "records": [...] }` for batch. Records are upserted keyed on `findingId`: an existing `findingId` row is updated (only supplied columns change), otherwise a new row is inserted. Unknown fields are ignored; each record must include a non-empty `findingId`. Response: `{ "ok": true, "inserted": n, "updated": m, "keys": [...] }`; malformed JSON or a missing key returns `400`.

Reads/writes `/storage/vulndata/vuln.db` (the `vulndata` volume, mounted read-write with exclusive concurrency). The DB is initially built by the [Seed database step](<../Seed database/script.ts>). Logic lives in [script.ts](script.ts) with shared helpers in [lib.ts](lib.ts); the full contract is in [api.json](api.json).
