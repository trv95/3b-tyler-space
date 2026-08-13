The dashboard itself: a client-side React app for reviewing every case in the Tines tenant.

**Trigger:** `GET /tines-case-dashboard` (space members only). The page shell renders immediately and
fetches [`/tines-case-data`](<../Case data/script.ts>) for the snapshot, and posts to
[`/tines-case-refresh`](<../Refresh case cache/script.ts>) when someone clicks "Refresh data".

**What it shows**

- KPI row: cases in view, open, open critical + high, open unassigned, SLA breached, median and p90
  time to resolve. Unassigned and SLA breached are clickable filters.
- Case volume opened over time, stacked by priority, at day / week / month granularity. Clicking a
  period scopes every other panel to it while dimming the rest of that chart.
- Priority mix, threat types (MITRE tactic, technique, or raw tag), cases by team, analyst case load,
  open work by sub-status — every bar and slice is a filter toggle.
- Time-to-resolve distribution with median and p90 markers, log or linear.
- A sortable case table linking out to each case in Tines.

**Interaction model**

Everything is a filter and selection is shared: clicking a mark toggles that value in the matching
filter, and dropdown filters support "only these" / "all except". `Esc` clears everything. All view
state (window, granularity, every dimension, search, selected period) is encoded in the URL, so a
view can be shared by copying the address. A banner names the caveats that apply — untagged cases,
an in-progress final period, closed cases with no resolution timestamp.

**Files**

- [App.tsx](App.tsx) — shell, data loading, filter bar, URL state.
- [components/PanelGrid.tsx](components/PanelGrid.tsx) — chart layout.
- [components/charts.tsx](components/charts.tsx) — hand-rolled SVG time series, donut, bars, strip plot.
- [components/CaseTable.tsx](components/CaseTable.tsx), [components/KpiRow.tsx](components/KpiRow.tsx), [components/ui.tsx](components/ui.tsx).
- [lib/filters.ts](lib/filters.ts) — filter model and URL encoding; [lib/aggregate.ts](lib/aggregate.ts) — bucketing and rollups.
