A read-only JSON API over the sample vulnerability dataset built by [Seed database](<../Seed database/script.ts>).

**Route:** `GET/POST /vuln-data` (space-authenticated). Reads `/storage/vulndata/vuln.db` on the `vulndata` volume (read-only mount).

**Usage**

| Request | Returns |
|---------|---------|
| `GET /vuln-data` | Overview: table list, row counts, and fixture metadata |
| `GET /vuln-data?table=qualys` | All rows of a table (`owners`, `qualys`, `security_central`, `bugdb`) |
| `GET /vuln-data?table=bugdb&priority=P0` | Exact-match filter on any column |
| `GET /vuln-data?table=qualys&search=openssh` | Free-text search across all columns |
| `GET /vuln-data?table=bugdb&limit=10&offset=20` | Paging (limit capped at 1000) |
| `GET /vuln-data?sql=SELECT ...` or `POST { "sql": "SELECT ..." }` | Arbitrary read-only query |

Only a single `SELECT`/`WITH` statement is permitted for raw SQL; anything else is rejected. If the database has not been seeded yet the endpoint returns `503`.
