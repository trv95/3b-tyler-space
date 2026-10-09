Monitors the CISA Known Exploited Vulnerabilities (KEV) catalog and opens a Tines case for each newly added vulnerability.

## Flow

1. [Check CISA KEV feed](<Check CISA KEV feed/README.md>) runs daily on a cron, fetches the KEV catalog, and diffs it against the CVE IDs already handled. It forwards only new vulnerabilities.
2. [Create Tines cases](<Create Tines cases/README.md>) opens one Tines case per new vulnerability and records each CVE as handled.

## State and first run

Handled CVE IDs are stored in the shared named volume `cisa_kev_state` (`seen.json`). The feed step mounts it read-only; the case step is the sole writer and marks a CVE seen only after its case is created, so a Tines outage is retried on the next run instead of dropping vulnerabilities.

The **first run against an empty volume seeds a baseline** — it records the entire current catalog (~1,300 CVEs) as handled **without** creating any cases. Only vulnerabilities CISA adds after that produce cases. Each draft branch has its own empty volume, so a draft's first run seeds its own baseline.

## External services

- CISA KEV feed (public, unauthenticated): `https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json`
- Tines Cases API via the **Tyler Tines Stories** connector.

## Common changes

- Destination team: `TEAM_ID` in [Create Tines cases/script.ts](<Create Tines cases/script.ts>).
- Schedule: `cron` in [Check CISA KEV feed/config.toml](<Check CISA KEV feed/config.toml>).
- Case priority rule: `priorityFor` in the case step (currently ransomware-linked → `high`, else `medium`).
