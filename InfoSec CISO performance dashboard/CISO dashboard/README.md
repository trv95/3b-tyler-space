The CISO-facing dashboard for the ServiceNow **InfoSec** assignment group, served as an HTML page at `/ciso-infosec-dashboard` (space members only).

It renders immediately and fetches its numbers client-side from [the Infosec queue data step](<../Infosec queue data/script.ts>) at `/infosec-queue-data`, so the page never blocks on the dataset. All metrics are derived in the browser from raw ticket records — nothing is precomputed, so changing a filter re-derives every panel.

**What it answers**

- Are we meeting SLA? Resolution and response attainment against each ticket's ServiceNow priority target, with a weekly trend against a 90% line.
- Are we keeping up? Weekly opened vs. resolved with the cumulative open backlog, plus backlog aging with P1/P2 highlighted.
- Where does the time go? Median resolution time by security work type and by affected business service.
- How is the team performing? Per-analyst scorecard: load, P1/P2 share, MTTA, MTTR, both SLA rates, reopen rate, open and aged counts.
- Is it getting better or worse? Every KPI compares against the immediately preceding period of equal length.

**Interaction** — clicking a priority in the legend, a work-type bar, or an analyst row filters the entire board; chips at the top show what's active and `Esc` clears everything. All view state (window, analyst, category, priority) lives in the query string, so any view can be shared by copying the URL.

Metric definitions live in [metrics.ts](metrics.ts) (medians, not means, so a single 40-day straggler doesn't distort MTTR), formatting in [format.ts](format.ts), and the hand-rolled SVG charts in [charts.tsx](charts.tsx).
