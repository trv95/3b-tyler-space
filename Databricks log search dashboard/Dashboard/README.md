Dark observability-style dashboard for searching OCSF audit logs in Databricks.

**Trigger:** `GET /log-search` (space-authenticated webpage).

A person enters a free-text query and picks a time range (1h/24h/7d/30d/All). On search the client-side React app POSTs to [`/log-search-query`](<../Query logs/script.ts>), then renders stat cards, a hand-rolled SVG event-volume chart (hourly buckets), and a results table of matching log entries. The fetch is branch-aware via `window.__BRANCH_ID__` injected in [render.ts](render.ts).

Edit [App.tsx](App.tsx) for the UI. This step renders immediately and fetches data itself — it has no upstream link.
