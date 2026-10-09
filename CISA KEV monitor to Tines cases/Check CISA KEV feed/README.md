Scheduled daily (`cron = "0 14 * * *"`, 14:00 UTC). Fetches the public CISA KEV catalog and emits only vulnerabilities not yet handled.

Reads the handled-CVE set from the `cisa_kev_state` volume (`seen.json`) **read-only**. The downstream [Create Tines cases](<../Create Tines cases/README.md>) step is the only writer.

Output (JSON on stdout):

- First run (no `seen.json`): `{ mode: "baseline", allCveIDs, newVulns: [] }` — tells the downstream step to record the whole catalog without creating cases.
- New entries found: `{ mode: "incremental", catalogVersion, dateReleased, allCveIDs, newVulns: [...] }`.
- No new entries: **zero bytes**, which suppresses the downstream step.

Throws (nonzero exit) if the feed request fails or returns no vulnerabilities, or if `seen.json` exists but cannot be parsed.
