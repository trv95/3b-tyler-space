Entry point for the workflow. Emits a realistic **sample CrowdStrike Falcon detection** so the enrichment and case-creation flow can be exercised end-to-end without a live CrowdStrike connection.

**Trigger:** HTTP route `POST /crowdstrike-sample`. Any request (GET or POST) returns the same canned detection — the body is ignored. If a JSON body *is* supplied it is shallow-merged over the sample, so you can override fields (e.g. `severity`) while testing.

**Output:** a single detection object shaped like the CrowdStrike Detects API, including the indicators the next step enriches:

- `sha256` — file hash of the flagged process
- `local_ip` / `external_ip` — host addresses
- `domain` — the domain the process beaconed to

Feeds into [the VirusTotal enrichment step](<../VirusTotal enrichment/script.ts>).
