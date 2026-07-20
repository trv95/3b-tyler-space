Creates a **case in Tines** from the enriched CrowdStrike detection, so an analyst has a single record to triage.

**Trigger:** upstream — receives the detection + `enrichment` object on stdin from [the VirusTotal enrichment step](<../VirusTotal enrichment/script.ts>).

**What it does:** maps the alert into a Tines case via the [Tines Cases API](https://www.tines.com/docs/api/) (`POST {TINES_URL}/api/v1/cases`):

- **name** — detection name + hostname
- **priority** — derived from the VirusTotal `worst_verdict` (malicious → `high`, suspicious → `medium`, else `low`)
- **description** — summary of the host, indicators, and per-indicator VT verdicts
- **fields** — structured key/values (detection id, severity, indicators, VT verdict)

**Connector:** `tines` — base URL comes from the injected `TINES_URL` env var; auth is injected automatically.

**Output:** the created case object (id, name, priority) as JSON — also the workflow's HTTP response.
