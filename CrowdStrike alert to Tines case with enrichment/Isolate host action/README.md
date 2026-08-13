Handles a click on the **Isolate Host** case action that [Create Tines case](<../Create Tines case/README.md>) adds to every case it opens.

**Trigger.** `POST /cs-isolate-host`, called by Tines when the case action button is clicked. The route is authenticated with an unguessable `external_id`, which Tines supplies as a query parameter configured on the case action.

**Query parameters.** `case_id` (required), `action_id`, `hostname`, `device_id` — all set when the case action is created.

**What it does.**

1. Deletes the case action (`DELETE /api/v2/cases/{case_id}/actions/{action_id}`) so it can only be clicked once.
2. Adds a red note titled "Host isolated" to the case (`POST /api/v2/cases/{case_id}/notes`) recording the host, device id, isolation timestamp, and who clicked.

The clicking user is taken from the request Tines sends — see `findActor` in [request.ts](request.ts), which searches the payload for an email and falls back to a plain "unknown" label if Tines doesn't include one.

This step records the isolation on the case. It does **not** call CrowdStrike to contain the device; add that here if real containment is wanted.

**Connector.** Tyler Tines Stories (`TINES_URL`), via the shared client in [tines.ts](tines.ts).

**Response.** JSON with `case_id`, `isolated_at`, and `isolated_by`.
