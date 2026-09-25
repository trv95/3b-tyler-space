Runs after [Enrich IP with VirusTotal](<../Enrich IP with VirusTotal/README.md>).

Searches urlscan.io for scans whose page resolved to the host's external IP — `GET https://urlscan.io/api/v1/search/?q=page.ip:"<ip>"` using the **urlscan** connector — and appends `urlscan_enrichment` with the total scan count, unique domains seen on that IP, how many scans urlscan judged malicious, a search link, and up to ten recent scans (URL, domain, server, ASN, tags, result link, screenshot).

With no external IP on the host it emits `urlscan_enrichment: null` rather than failing. Any non-2xx response fails the step. See [script.ts](script.ts).
