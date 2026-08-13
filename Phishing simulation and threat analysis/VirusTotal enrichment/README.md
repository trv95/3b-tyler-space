Looks up every extracted indicator in VirusTotal. Input comes from [Extract IOCs](<../Extract IOCs/README.md>).

Endpoints used, all on `https://www.virustotal.com/api/v3` via the VirusTotal connector:

| Indicator | Endpoint |
| --- | --- |
| Header IPs | `GET /ip_addresses/{ip}` |
| Sender and URL domains | `GET /domains/{domain}` |
| Body URLs | `GET /urls/{base64url-id}` |
| Attachments | `GET /files/{sha256}` |

Lookups run concurrently. A `404` is recorded as `found: false` rather than an error — that is meaningful signal, since freshly registered phishing infrastructure usually has no VirusTotal record. Any other non-2xx response fails the step.

Output adds a `virustotal` object with per-indicator `last_analysis_stats`, selected attributes, and a summary listing flagged indicators, unknown indicators, and the worst detection count. Nothing is submitted to VirusTotal — hash and URL-id lookups only, so no sample or URL is uploaded.
