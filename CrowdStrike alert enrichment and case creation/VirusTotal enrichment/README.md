Takes the CrowdStrike detection from [the Sample alert step](<../Sample alert/script.ts>) and enriches its indicators against [VirusTotal API v3](https://docs.virustotal.com/reference/overview).

**Trigger:** upstream — receives the detection JSON on stdin.

**What it does:** pulls the `sha256`, `domain`, and `external_ip` indicators out of the detection and looks each one up:

| Indicator | Endpoint |
|-----------|----------|
| file hash | `GET /api/v3/files/{sha256}` |
| domain    | `GET /api/v3/domains/{domain}` |
| IP        | `GET /api/v3/ip_addresses/{ip}` |

For each it records the `last_analysis_stats` (harmless / malicious / suspicious counts), a computed verdict, and the VT permalink. A `worst_verdict` (`malicious` > `suspicious` > `harmless`/`unknown`) is rolled up across all indicators to drive case priority downstream.

**Connector:** `virusTotal` — auth is injected automatically; the API key is never in code.

**Output:** the original detection plus an `enrichment` object, passed to [the Create Tines case step](<../Create Tines case/script.ts>).
