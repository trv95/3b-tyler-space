Enriches the alert's source IP with recent [urlscan.io](https://urlscan.io) scan activity.

Runs after [VirusTotal Enrichment](<../VirusTotal Enrichment/script.ts>) and before [Databricks Logs](<../Databricks Logs/script.ts>). Reads the alert JSON on stdin, queries the urlscan.io search API for scans referencing `alert.sourceIp`, and appends a `urlscan` object to the payload before passing it downstream.

Uses the urlscan.io search API: `GET https://urlscan.io/api/v1/search/?q=ip:<ip>`.
