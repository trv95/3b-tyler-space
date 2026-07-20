Enriches a CrowdStrike detection with VirusTotal reputation data and opens a triage case in Tines. Built as a demonstration flow — the alert is a canned sample rather than a live CrowdStrike feed — so it can be run end-to-end on demand.

## Trigger

`POST /crowdstrike-sample` (space-authenticated). Any request returns the same sample detection; a JSON body is optionally shallow-merged over it to override fields while testing.

## Flow

1. **[Sample alert](<Sample alert/script.ts>)** — emits a sample CrowdStrike Falcon detection with a file hash, domain, and external IP.
2. **[VirusTotal enrichment](<VirusTotal enrichment/script.ts>)** — looks each indicator up in [VirusTotal v3](https://docs.virustotal.com/reference/overview), records analysis stats + a verdict per indicator, and rolls up a `worst_verdict`.
3. **[Create Tines case](<Create Tines case/script.ts>)** — creates a case via the [Tines Cases API v2](https://www.tines.com/docs/api/), with priority derived from the VirusTotal verdict (malicious → critical, suspicious → high, harmless → low, else medium). The created case is the HTTP response.

## Connectors

- **virusTotal** — read-only reputation lookups.
- **tines** — lists teams (`GET /api/v1/teams`) to pick a target team, then creates the case (`POST /api/v2/cases/`).

## Side effects

Read-only against VirusTotal; **writes** a new case to Tines on every run. The Tines team is auto-selected as the first team returned — to pin a specific team, hardcode `team_id` in [Create Tines case/script.ts](<Create Tines case/script.ts>).
