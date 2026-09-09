Runs after [Get CrowdStrike alert](<../Get CrowdStrike alert/README.md>).

Appends a **sample** `host` record for the alerting device — hostname, OS, domain/OU, external and local IP, MAC, agent version, containment status, criticality, first/last seen, last login user, hardware metadata, RTR state. No CrowdStrike API call is made; it fails only if the upstream payload has no `device_id`.

The `host.external_ip` it produces is what [Enrich IP with VirusTotal](<../Enrich IP with VirusTotal/README.md>) enriches.

Output: the upstream payload plus `host`. See [script.ts](script.ts).

To return to live data, restore the `GET /devices/entities/devices/v2` call and reattach the CrowdStrike connector.
