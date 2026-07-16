This workflow turns the sanitized UAT vulnerability-management mock fixture into a queryable data source that other workflows can reuse as a connector for enrichment.

**What it does.** A one-time seed step loads the embedded mock fixture into a SQLite database on the `vulndata` volume. Five HTTP API endpoints then serve that data. The four table endpoints are read/write — `GET` to query (filterable by query params) and `POST` to upsert (insert-or-update) records. The Enrich endpoint is read-only.

**Datasets** (all sanitized UAT synthetic sample data): service owners/routing, Qualys findings, Security Central findings, and BugDB tickets — 6 owners and 36 records each for the three finding/ticket tables, cross-linked by `service`, `ownerEmail`, `bug`, `qid`, and `cve`.

**Endpoints** (all `route_type = "api"`, `route_auth = "connector"` — reachable by other tenant workflows via a workflow-backed connector):

| Route | Methods | Step | Purpose |
|-------|---------|------|---------|
| `/vulndata/owners` | GET, POST | [Owners API](<Owners API/script.ts>) | Service ownership & routing (upsert key `service`) |
| `/vulndata/qualys` | GET, POST | [Qualys API](<Qualys API/script.ts>) | Qualys findings (upsert key `findingId`) |
| `/vulndata/security-central` | GET, POST | [Security Central API](<Security Central API/script.ts>) | Security Central findings (upsert key `securityCentralId`) |
| `/vulndata/bugdb` | GET, POST | [BugDB API](<BugDB API/script.ts>) | BugDB tickets (upsert key `bug`) |
| `/vulndata/enrich` | GET | [Enrich API](<Enrich API/script.ts>) | Joined cross-dataset lookup (read-only) |

**Writing (POST).** Send a single record object or `{ "records": [...] }` for batch upsert. A record whose upsert key matches an existing row updates that row (only supplied columns change); otherwise a new row is inserted. Unknown fields are ignored and the key is required. Response: `{ "ok": true, "inserted": n, "updated": m, "keys": [...] }`. The four table steps mount the `vulndata` volume read-write with exclusive concurrency so writes to the shared SQLite file stay consistent; the read-only Enrich step and concurrent reads are unaffected.

**Seeding.** [Seed database](<Seed database/script.ts>) builds the DB from [its embedded fixture](<Seed database/mock-data.html>). It has a space-auth route `/vulndata-seed` and can also be run manually. It is idempotent (drops & recreates tables). Because draft volume data is discarded on publish, **run this step once on the live workflow after pushing live** to seed the live volume.

**Side effects.** The seed step and the four table API steps (via `POST`) write the `vulndata` volume; the Enrich step is read-only. No external services are called. Writes persist on the live volume across runs — after pushing live, run Seed once to initialise it, then upserts accumulate.

**Reusing as a connector.** Point another workflow's workflow-backed connector at this workflow; the assembled OpenAPI contract comes from each endpoint's `api.json`.
