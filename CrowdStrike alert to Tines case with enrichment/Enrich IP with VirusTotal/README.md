Runs after [Look up host](<../Look up host/README.md>).

Enriches the host's external IP with `GET https://www.virustotal.com/api/v3/ip_addresses/<ip>` using the **VirusTotal** connector, and appends `ip_enrichment` with the analysis verdict counts, reputation, ASN and owner, network, country, community votes, last analysis date, and the list of engines that flagged the address.

Degrades gracefully rather than failing the run:

- no external IP on the host → `ip_enrichment: null`
- VirusTotal 404 → `ip_enrichment: { ip, found: false }`

Any other non-2xx response fails the step. See [script.ts](script.ts).
