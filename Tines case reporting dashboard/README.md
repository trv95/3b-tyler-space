A case reporting dashboard for the Tines tenant, built for an exec-level read of what the security
team is handling: threat types, priority mix, status, assignee load, SLA breaches, and how long cases
take to resolve — all cross-filterable.

**Triggers**

- [`/tines-case-dashboard`](<Case dashboard/App.tsx>) — the dashboard page. This is the entry point.
- [`/tines-case-data`](<Case data/script.ts>) — JSON snapshot the page fetches.
- [`/tines-case-refresh`](<Refresh case cache/script.ts>) — rebuilds the snapshot; also on a
  30-minute schedule.

All three are restricted to members of this space.

**The flow**

`Refresh case cache` pages through the Tines Cases API, reduces each case to reporting fields
(including MITRE tactics and techniques parsed out of case tags), and writes one JSON file to the
`tines_case_cache` volume. `Case data` serves that file read-only. `Case dashboard` loads it once and
does all filtering and aggregation in the browser, so interaction is instant and no browser request
ever hits Tines.

The three steps are deliberately unlinked — each has its own route, and the volume is the only thing
they share.

**External services**

Tines Cases API (`GET /api/v2/cases`) via the "Tyler Tines Stories" connector, attached to
`Refresh case cache` only. The workflow is strictly read-only against Tines: nothing is created,
updated, or closed.

**Operational notes**

- The connector's `TINES_URL` is currently malformed (`https://https://www.tyler.tines.com`). The
  refresh step works around it by probing host variants; correcting the connector to
  `https://tyler.tines.com` removes the extra probe.
- If the dashboard shows "No case snapshot has been built yet", run `Refresh case cache`.
- A failed or empty API response never overwrites a good snapshot, so the dashboard shows stale data
  rather than no data. The header states the snapshot age.

**Common changes**

- New reporting field: add it in [Refresh case cache/script.ts](<Refresh case cache/script.ts>)'s
  `slim()`, then in [Case dashboard/lib/types.ts](<Case dashboard/lib/types.ts>).
- New filterable dimension: [Case dashboard/lib/filters.ts](<Case dashboard/lib/filters.ts>).
- New chart: [Case dashboard/components/PanelGrid.tsx](<Case dashboard/components/PanelGrid.tsx>).
- Refresh cadence: the `cron` in [Refresh case cache/config.toml](<Refresh case cache/config.toml>).
