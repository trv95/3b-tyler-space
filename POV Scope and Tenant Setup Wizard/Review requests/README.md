Server-rendered page at `/tenant-setup-requests` (space members only) listing every Solutions Engineer help request — outstanding first, then the ones already taken care of.

It reads the same SQLite database the [Record request](<../Record request/README.md>) endpoint writes, mounting the `se-requests` volume read-only at `/storage/se-requests`. If the database doesn't exist yet, or predates the `status` and `source` columns, the page still renders. All writes go through `POST /tenant-setup-request`, called from the page's inline script:

- **Mark as taken care of / Reopen** on each card flips that request's status.
- **Add a request manually** at the bottom of the page creates a request that didn't come from the guide.

Each entry shows the guide step (or "Added manually"), its title, status, when it was raised, and any detail typed. Requests are anonymous by design.

Markup, styling (Tines light theme) and the browser script live in [script.ts](script.ts).
