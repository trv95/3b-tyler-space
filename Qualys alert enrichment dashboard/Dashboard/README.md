The vulnerability report webpage — a dark "threat console" that renders enriched Qualys findings.

Open **`/vuln-report`** in a browser (`route_auth = "space"`). This is the manual entry point for the workflow: loading the page triggers the report.

The React app renders its shell immediately, then fetches JSON client-side from [`/vuln-report-data`](<../Fetch alerts/script.ts>) (the [Fetch alerts](<../Fetch alerts/README.md>) step). It forwards the page's query string on that fetch so the `?branch=…` parameter carries through on draft builds.

Features: priority stat strip (P0–P3) that doubles as a filter, free-text search across title/CVE/service/owner/asset, and an expandable detail row per finding showing the enrichment (Security Central + BugDB) and the resolved service owner / routing.

Built with React + Tailwind; fonts are Chakra Petch (display) and JetBrains Mono (body/data).
