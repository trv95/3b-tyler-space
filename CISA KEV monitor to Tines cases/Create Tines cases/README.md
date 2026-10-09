Runs after [Check CISA KEV feed](<../Check CISA KEV feed/README.md>). Creates Tines cases on the tenant reached through the **Tyler Tines Stories** connector, in team `TEAM_ID` (107557).

Behavior by upstream `mode`:

- `baseline`: records every CVE in `allCveIDs` into `cisa_kev_state/seen.json` and creates **no** cases.
- `incremental`: for each vulnerability, `POST /api/v2/cases` (tagged `cisa-kev`, `3b-automation`; priority `high` when linked to a known ransomware campaign, else `medium`) then `POST /api/v2/cases/<id>/notes` with a KEV details note. Each CVE is marked seen only after its case is created, and the seen-set is persisted in a `finally` block so partial progress survives a mid-batch failure.

This step is the sole writer of `cisa_kev_state`. It mounts the volume writable.

The connector's `TINES_URL` is stored with a duplicated scheme and a non-resolving `www.` prefix, so the step derives candidate base URLs from it rather than using it verbatim (same quirk as the CrowdStrike workflow's case step).

Output: `{ mode, cases_created, cases: [{ cveID, case_id, url }] }`.

Change the destination team via `TEAM_ID` at the top of [script.ts](script.ts).
