Enriches IP addresses with threat reputation from [VirusTotal](https://www.virustotal.com).

Trigger: run manually. Input (stdin) is one of:
- a plain IP string (`8.8.8.8`)
- a comma/whitespace/newline-separated list of IPs
- JSON: `{"ips": ["1.2.3.4", "8.8.8.8"]}` or `{"ip": "1.2.3.4"}`

For each IP it calls `GET https://www.virustotal.com/api/v3/ip_addresses/{ip}` and returns a JSON array summarising the last-analysis verdict counts, reputation, network owner (ASN/AS owner), and country.

Auth is provided by the VirusTotal connector — no key in code.
