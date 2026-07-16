Serves and maintains service-ownership and ticket-routing records (owner, SPOC, Slack channel, ticketing target, project, component).

**Triggers:**
- `GET /vulndata/owners` — list/filter records.
- `POST /vulndata/owners` — insert or update records (upsert).

Both are authenticated as `connector`, so other workflows in the tenant can call them through a workflow-backed connector pointing at this workflow.

**Read (GET).** Query params are optional exact-match filters (`service`, `ownerEmail`, `target`, `application`, `project`) plus `limit`. Each filter accepts multiple values — repeat the param (`?service=a&service=b`) or pass a comma-separated list (`?service=a,b`), matched with `IN (...)` — so a caller with a list of services fetches them all in one request instead of looping. Response: `{ "count": n, "records": [...] }`.

**Write (POST).** Body is a single record object or `{ "records": [...] }` for batch. Records are upserted keyed on `service`: an existing `service` row is updated (only supplied columns change), otherwise a new row is inserted. Unknown fields are ignored; each record must include a non-empty `service`. Response: `{ "ok": true, "inserted": n, "updated": m, "keys": [...] }`; malformed JSON or a missing key returns `400`.

Reads/writes `/storage/vulndata/vuln.db` (the `vulndata` volume, mounted read-write with exclusive concurrency so writes to the shared DB stay consistent). The DB is initially built by the [Seed database step](<../Seed database/script.ts>). Logic lives in [script.ts](script.ts) with shared helpers in [lib.ts](lib.ts); the full contract is in [api.json](api.json).
