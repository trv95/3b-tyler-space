This workflow turns the sanitized UAT vulnerability-management mock fixture into a queryable data source that other workflows can reuse as a connector for enrichment.

**What it does.** A one-time seed step loads the embedded mock fixture into a SQLite database on the `vulndata` volume. Five read-only HTTP API endpoints then serve that data, each filterable by query params.

**Datasets** (all sanitized UAT synthetic sample data): service owners/routing, Qualys findings, Security Central findings, and BugDB tickets — 6 owners and 36 records each for the three finding/ticket tables, cross-linked by `service`, `ownerEmail`, `bug`, `qid`, and `cve`.

**Endpoints** (all `route_type = "api"`, `route_auth = "connector"` — reachable by other tenant workflows via a workflow-backed connector):

| Route | Step | Purpose |
|-------|------|---------|
| `/vulndata/owners` | [Owners API](<Owners API/script.ts>) | Service ownership & routing |
| `/vulndata/qualys` | [Qualys API](<Qualys API/script.ts>) | Qualys findings |
| `/vulndata/security-central` | [Security Central API](<Security Central API/script.ts>) | Security Central findings |
| `/vulndata/bugdb` | [BugDB API](<BugDB API/script.ts>) | BugDB tickets |
| `/vulndata/enrich` | [Enrich API](<Enrich API/script.ts>) | Joined cross-dataset lookup |

**Seeding.** [Seed database](<Seed database/script.ts>) builds the DB from [its embedded fixture](<Seed database/mock-data.html>). It has a space-auth route `/vulndata-seed` and can also be run manually. It is idempotent (drops & recreates tables). Because draft volume data is discarded on publish, **run this step once on the live workflow after pushing live** to seed the live volume.

**Side effects.** The seed step writes the `vulndata` volume; all API steps are read-only. No external services are called.

**Reusing as a connector.** Point another workflow's workflow-backed connector at this workflow; the assembled OpenAPI contract comes from each endpoint's `api.json`.
