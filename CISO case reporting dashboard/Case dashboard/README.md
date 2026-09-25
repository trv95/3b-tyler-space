CISO-facing case reporting dashboard — a dark security-operations "command center" view of every case in the Tines tenant.

**Trigger:** HTTP GET `/case-dashboard` (space-authenticated webpage).

On load it fetches [`/cases-data`](<../Cases data/script.ts>) in the browser and computes everything client-side:

- **KPI row** — total, open, critical+high open, resolution rate, median time-to-resolve, median open age.
- **Case volume** — opened vs resolved per week over the last 12 weeks.
- **Open vs closed** ring, **open-by-priority** bars (click a priority to filter the table), **team workload**, and a **risk posture** summary.
- **Open cases table** — sorted by priority then recency, searchable by name/team/tag, linking back to each case in Tines.

Design is intentionally distinctive: near-black grid backdrop, IBM Plex Mono metrics, priority color coding. Built with [App.tsx](App.tsx); fonts/theme in [globals.css](globals.css).
