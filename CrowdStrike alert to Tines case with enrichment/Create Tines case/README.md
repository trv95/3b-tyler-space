Runs after [Summarize with AI](<../Summarize with AI/README.md>).

Creates the case in the **AD Case Management** team (`team_id` 107557) on the Tines tenant reached through the **Tyler Tines Stories** connector:

1. `POST /api/v2/cases` with the AI-drafted name, description, and priority, tagged `crowdstrike` and `3b-automation`, plus metadata carrying the CrowdStrike composite ID, device ID, hostname, external IP, and Falcon link.
2. `POST /api/v2/cases/<case_id>/notes` twice — "Host details" (blue) and "IP enrichment" (gold).

This step writes to Tines, but is idempotent per alert: it records the `case_id` for each CrowdStrike `composite_id` in the `crowdstrike-cases` volume (exclusive writer). If a record already exists, the step makes no API calls and re-emits the existing case with `tines_case.deduplicated = true`, which makes [Notify Slack](<../Notify Slack/README.md>) skip re-posting. Alerts arriving without a `composite_id` are not deduplicated.

The connector's `TINES_URL` is stored with a duplicated scheme and a `www.` prefix that doesn't resolve, so the step derives candidate base URLs from it instead of using it verbatim. Fixing the connector value would let that fallback go away — see [script.ts](script.ts).

Output: the upstream payload plus `tines_case` (`case_id`, `url`, `name`, `priority`, `actions`, and `deduplicated` on a repeat alert).

Change the destination team by editing `TEAM_ID` at the top of [script.ts](script.ts).
