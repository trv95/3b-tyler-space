Serves the cached case snapshot as JSON so the dashboard never has to talk to the Tines API from the
browser.

**Trigger:** `GET /tines-case-data` (space members only). Contract in [api.json](api.json).

Reads `/storage/tines_case_cache/cases.json` from the `tines_case_cache` volume, mounted read-only,
and streams it straight to the response. Returns `503` with `{"error":"cache_empty"}` when no
snapshot exists yet — trigger [the refresh step](<../Refresh case cache/script.ts>) first.

The snapshot for this tenant is roughly 1 MB for ~1,300 cases; the dashboard loads it once and does
all filtering and aggregation client-side.
