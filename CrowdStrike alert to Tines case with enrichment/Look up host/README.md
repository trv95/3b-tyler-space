Runs after [Get CrowdStrike alert](<../Get CrowdStrike alert/README.md>).

Looks up the device that raised the alert via `GET /devices/entities/devices/v2?ids=<device_id>` using the **CrowdStrike** connector, and appends a trimmed `host` object — hostname, OS, domain/OU, external and local IP, MAC, agent version, containment status, criticality, first/last seen, last login user, hardware and cloud metadata, RTR state.

The `host.external_ip` it produces is what [Enrich IP with VirusTotal](<../Enrich IP with VirusTotal/README.md>) enriches.

Output: the upstream payload plus `host`. See [script.ts](script.ts).
