Web form where a user enters an IP address and views its VirusTotal enrichment.

**Trigger:** `GET /ip-lookup` (space-authenticated webpage).

The page renders immediately, then POSTs the IP to [`/vt-enrich`](<../VirusTotal Enrich/script.ts>) and displays the result — a threat verdict, detection stats, community votes, and network/geo details (ASN, owner, country, timestamps). Not-found and API errors surface as a clear inline message.
