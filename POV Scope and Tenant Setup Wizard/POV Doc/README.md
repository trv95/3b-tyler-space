The 3B proof-of-value scoping document, served as an editable page at `/pov-scoping` (tenant-authenticated, so anyone invited to the tenant can view and edit).

Three tabs:
- **Scoping** — account/goal, builders and teams, tools and use cases, timeline.
- **Metrics & feedback** — build time, feasibility and time saved per use case, plus what the team liked, disliked, and would improve.
- **Feature requests** — a running list the customer team can add to, with impact and status.

Every edit autosaves (900 ms debounce) via `POST` to the [Save POV](<../Save POV/script.ts>) route; initial content is loaded from [Load POV](<../Load POV/script.ts>). Route prefixes are derived from `window.__ROUTE_PATH__` so the page works on draft branches. See [App.tsx](App.tsx) and the theme variables in [globals.css](globals.css).
