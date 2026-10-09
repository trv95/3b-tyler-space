Receives authenticated `POST /ip-enrichment-submit` requests from the enrichment form. It validates that the submitted address is a public IPv4 or IPv6 address, retrieves reports from VirusTotal and AbuseIPDB in parallel, derives a combined determination, and posts the summary to Slack.

Input is JSON with an `ip` string. Output includes VirusTotal analysis counts, AbuseIPDB confidence score, report count, Tor status and network context, report links, enrichment time, and Slack delivery metadata. Every successful enrichment is sent to `#3b-demo` (`C0BKQMP3LSU`) and persisted as an independent history record after Slack confirms delivery.

External endpoints are `GET https://www.virustotal.com/api/v3/ip_addresses/{ip}`, `GET https://api.abuseipdb.com/api/v2/check`, and `POST https://slack.com/api/chat.postMessage`. Each uses its attached connector. Consequential outcomes are appended to the shared audit trail.
