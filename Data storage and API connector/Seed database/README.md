Builds the SQLite database that every API step in this workflow reads from.

The sanitized mock fixture is embedded in [mock-data.html](mock-data.html) (the standalone UAT snapshot). This step extracts the embedded `DATA` object, then rebuilds four tables — `owners`, `qualys`, `security_central`, `bugdb` — plus a `meta` table, in a SQLite file at `/storage/vulndata/vuln.db` on the `vulndata` volume.

**Trigger:** run manually, or POST/GET its route `/vulndata-seed` (space-authenticated). It drops and recreates all tables on every run, so it is safe to re-run.

The database uses rollback journalling (not WAL) so the read-only API steps can open it from a `:ro` mount.

> Draft volume data is discarded on publish — after pushing live, run this step once on the live workflow to seed the live volume.
