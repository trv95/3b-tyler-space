A CISO-facing case reporting dashboard built on the Tines Cases API.

**Entry point:** open [`/case-dashboard`](<Case dashboard/App.tsx>) in a browser (space-authenticated). It's a single-page "command center" showing case volume trends, priority and status breakdowns, team workload, and a searchable table of open cases.

**The flow:**
- [Cases data](<Cases data/script.ts>) (`GET /cases-data`) fetches all cases from the Tines Cases API (`GET {TINES_URL}/api/v2/cases`, paginated in parallel) via the **tines** connector, trims each case to the fields the dashboard needs, and returns JSON.
- [Case dashboard](<Case dashboard/App.tsx>) renders the shell immediately, then fetches `/cases-data` client-side and computes all metrics in the browser.

**Side effects:** none — read-only reporting.

**Common changes:** to add a metric or chart, edit [`Case dashboard/App.tsx`](<Case dashboard/App.tsx>); to change which case fields are available, edit the mapping in [`Cases data/script.ts`](<Cases data/script.ts>).
