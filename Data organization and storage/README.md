Parses the sanitized UAT vulnerability fixture and stores it in a built-in SQLite database so you can query it as sample data.

**Flow**

1. [Seed database](<Seed database/script.ts>) — run manually. Extracts the embedded `DATA` object from the fixture HTML and writes a fresh SQLite database (`owners`, `qualys`, `security_central`, `bugdb`, `meta`) to `/storage/vulndata/vuln.db` on the durable `vulndata` volume.
2. [Query API](<Query API/script.ts>) — HTTP endpoint at `GET/POST /vuln-data` that reads the database (read-only) and returns JSON. Supports table listings, column filters, free-text search, paging, and single-statement read-only SQL.

**Getting started:** run *Seed database* once, then hit `/vuln-data` for an overview, or `/vuln-data?table=qualys&search=openssh`. Both routes are space-authenticated. The data is a synthetic, sanitized sample — no production data.
