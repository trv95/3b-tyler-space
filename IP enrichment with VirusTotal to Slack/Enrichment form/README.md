Provides the authenticated web interface at `/ip-enrichment` for submitting a public IPv4 or IPv6 address.

The browser sends submissions to `/ip-enrichment-submit` and reads `/ip-enrichment-history`. The page displays the combined VirusTotal and AbuseIPDB determination, including detection counts, AbuseIPDB confidence and report count, country, network context, timestamp, and report links. Successful results are listed newest-first.
