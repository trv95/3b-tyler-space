Look up the reputation of an IP address against [VirusTotal](https://www.virustotal.com) from a simple web form.

**Flow**

- [IP Lookup UI](<IP Lookup UI/App.tsx>) — a webpage at `GET /ip-lookup` where a user enters an IPv4/IPv6 address. On submit it POSTs to the enrichment endpoint and renders the result: a threat verdict, per-vendor detection stats, reputation, community votes, ASN/owner, network, registry, geolocation, and analysis timestamps.
- [VirusTotal Enrich](<VirusTotal Enrich/script.ts>) — a JSON API at `POST /vt-enrich` that validates the IP, calls VirusTotal API v3, and returns a compact summary. Not-found (404), rate-limit (429), auth, and upstream failures return a clear `{ "error": … }` message that the UI surfaces inline.

Both routes are space-authenticated. VirusTotal credentials are supplied by a connector — no secrets in code. This workflow is read-only; it makes no changes to external systems.
