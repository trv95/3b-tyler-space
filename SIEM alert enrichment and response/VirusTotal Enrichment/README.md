Enriches the alert's `sourceIp` using the [VirusTotal IP address report API](https://docs.virustotal.com/reference/ip-info) (`GET https://www.virustotal.com/api/v3/ip_addresses/{ip}`).

Reads the alert JSON from stdin, adds a `virustotal` object (reputation, malicious/suspicious vendor counts, country, ASN, tags) and passes the merged object downstream.

Auth via a VirusTotal connector (API key injected by the proxy).
