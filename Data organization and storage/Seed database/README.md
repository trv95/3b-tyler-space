Builds the sample vulnerability dataset into a SQLite database so the rest of the workflow can query it.

**Trigger:** run manually (no route). Re-run any time to rebuild the database from scratch.

It reads the embedded `DATA` object from [mock.html](mock.html) — the sanitized UAT fixture — and writes a fresh SQLite database to `/storage/vulndata/vuln.db` on the durable, exclusive-writer `vulndata` volume.

Tables created (mirroring the fixture):

| Table | Rows | Notes |
|-------|------|-------|
| `owners` | 6 | Service owners / routing |
| `qualys` | 36 | Qualys findings |
| `security_central` | 36 | Security Central findings |
| `bugdb` | 36 | BugDB mock tickets |
| `meta` | 1 | Fixture metadata (classification, timestamps, counts) |

On success it prints a JSON summary of row counts, which flows to [Query API](<../Query API/script.ts>).
