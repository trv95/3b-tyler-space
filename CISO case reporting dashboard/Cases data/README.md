Internal JSON endpoint that powers the [Case dashboard](<../Case dashboard/App.tsx>).

**Trigger:** HTTP GET `/cases-data` (space-authenticated).

Fetches cases from the Tines Cases API (`GET {TINES_URL}/api/v2/cases`, paginated via the `meta.next_page` cursor, up to a safety cap) using the connected **tines** connector for auth. It returns a trimmed JSON array — only the fields the CISO view needs — to keep the payload small:

```json
{ "cases": [ { "id", "name", "status", "priority", "team", "assignees", "tags", "opened_at", "created_at", "resolved_at", "url" } ], "fetched_at": "ISO" }
```

Read-only: it never modifies cases.
