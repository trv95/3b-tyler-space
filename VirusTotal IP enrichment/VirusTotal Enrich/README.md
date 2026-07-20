JSON API that enriches a single IP address using the [VirusTotal API v3](https://docs.virustotal.com/reference/ip-object).

**Trigger:** `POST /vt-enrich` (space-authenticated), called by the [IP Lookup UI](<../IP Lookup UI/App.tsx>).

**Request:** `{ "ip": "8.8.8.8" }`

**Response (200):** compact summary — `reputation`, `stats` (malicious/suspicious/harmless/undetected/timeout), community `votes`, `country`, `asn`, `as_owner`, `network`, `regional_internet_registry`, and analysis timestamps.

Errors return a JSON `{ "error": "..." }` with an appropriate status: 400 (bad/missing IP), 404 (not found), 429 (rate limited), 502 (auth or upstream failure).

Auth to VirusTotal (`x-apikey`) is injected by the connector proxy — see [script.ts](script.ts).
