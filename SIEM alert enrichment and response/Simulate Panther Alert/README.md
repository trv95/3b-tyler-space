Entry point of the workflow. Runs manually (no route) and emits a **simulated Panther SIEM alert** as JSON on stdout, which flows downstream for enrichment.

The sample alert models an impossible-travel / suspicious-login detection for user **`sberniard`**, including a source IP address that gets enriched by VirusTotal and correlated against Databricks logs.

Output shape:
```json
{
  "alert": {
    "id": "...", "title": "...", "severity": "HIGH",
    "source": "Panther",
    "affectedUser": "sberniard",
    "sourceIp": "185.220.101.47",
    "detectedAt": "..."
  }
}
```
