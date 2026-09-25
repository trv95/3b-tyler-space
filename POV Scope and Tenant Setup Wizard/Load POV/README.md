Serves the saved POV scoping document as JSON at `/pov-scoping-data` (tenant-authenticated).

Reads `doc.json` from the read-only `pov_scoping` volume. Returns `{"initialized": false}` when nothing has been saved yet, so the page falls back to its starter content. See [script.ts](script.ts).
