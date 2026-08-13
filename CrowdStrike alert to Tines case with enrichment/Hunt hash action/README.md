Handles a click on the **Hunt Hash** case action that [Create Tines case](<../Create Tines case/README.md>) adds to every case it opens.

**Trigger.** `POST /cs-hunt-hash`, called by Tines when the case action button is clicked. The route is authenticated with an unguessable `external_id`, which Tines supplies as a query parameter configured on the case action.

**Query parameters.** `case_id` (required), `action_id`, `sha256`, `md5`, `filename` — all set when the case action is created.

**What it does.**

1. Deletes the case action (`DELETE /api/v2/cases/{case_id}/actions/{action_id}`) so it can only be clicked once.
2. Looks the file hash up in VirusTotal (`GET https://www.virustotal.com/api/v3/files/{hash}`), preferring the SHA-256.
3. Adds a gold note titled "File hash enrichment" to the case with a detail table, flagging engines, observed names, a VirusTotal link, and who ran the hunt.

A 404 from VirusTotal and an alert with no hash at all are both handled — the note says so plainly rather than failing.

**Connectors.** Tyler Tines Stories (`TINES_URL`) and Weindorf - VirusTotal.

**Response.** JSON with `case_id`, `hash`, and `hunted_by`.
