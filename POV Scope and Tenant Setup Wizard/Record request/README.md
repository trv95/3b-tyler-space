API endpoint at `POST /tenant-setup-request` (space members only) that records Solutions Engineer help requests — both the ones raised from the setup guide and the ones added by hand on the [Review requests](<../Review requests/README.md>) page.

Requests are stored in the space volume `se-requests`, in a SQLite database at `/storage/se-requests/requests.sqlite`. The volume is mounted with `concurrency=exclusive` because every writer touches the same database file. `step` is the unique key: guide requests use the page slug, so re-saving a page updates its row rather than piling up duplicates; manual requests get a generated `manual:<uuid>` key. Each row also carries a `status` of `outstanding` or `done`, and a `source` of `guide` or `manual` — both columns are added by migration on first run against an older database.

Actions, selected with `action` in the body:

```json
{ "step": "sso", "title": "Connect single sign-on", "notes": "optional detail" }
{ "action": "add", "title": "Walk through egress rules", "notes": "optional detail" }
{ "action": "status", "step": "sso", "status": "done" }
{ "action": "remove", "step": "sso" }
```

`upsert` is the default and is what ticking the help box in the guide sends; `remove` (also reachable with the legacy `{"remove": true}`) is what un-ticking it sends. Responses are `{ "ok": true, "outstanding": <count> }`.

Nothing identifying is captured: no name, email or IP. Full contract in [api.json](api.json), implementation in [script.ts](script.ts).
