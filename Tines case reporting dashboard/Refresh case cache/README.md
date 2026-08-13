Pages through every case in the Tines tenant and writes a slimmed-down reporting snapshot to the
`tines_case_cache` volume at `/storage/tines_case_cache/cases.json`.

**Triggers**

- Schedule: every 30 minutes (`*/30 * * * *`). Schedules only fire on the published version.
- On demand: `POST /tines-case-refresh` — the "Refresh data" button on the dashboard calls this.
  Space members only.

**External calls**

`GET {tenant}/api/v2/cases?per_page=500&page=N&order=CREATED_DESC`, authenticated by the Tines
connector. It follows `meta.next_page_number` until the last page.

The connector's `TINES_URL` value is not a reliable origin (it currently carries a duplicated
scheme and a `www.` host that does not resolve), so [script.ts](script.ts) strips any schemes,
tries the host with and without `www.`, and uses whichever answers. Fixing the connector's URL to
a clean `https://<tenant>.tines.com` makes the first probe succeed immediately.

**Derived fields**

Each case is reduced to the fields the dashboard needs, plus:

- `techniques` / `tactics` — parsed out of case tags shaped like `T1078:Initial Access`. Tags that
  are neither a technique id nor a known MITRE tactic land in `otherLabels`.
- `resolutionHours` — hours between `opened_at` and `resolved_at`.
- `slaExceeded` / `slaWarning` — rolled up from the case's `slas` array.
- `openTaskCount`, `linkedCaseCount`, `metadataKeys`.

**Safety**

The step throws rather than writing an empty snapshot, so a failed or empty API response leaves the
last good cache in place. The volume is mounted `concurrency=exclusive` because the scheduled run
and a manual refresh both rewrite the same file.
