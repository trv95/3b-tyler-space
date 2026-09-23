Provides security analysts with a private web interface for enriching public IP addresses in VirusTotal, sharing reputation summaries in Slack, and reviewing a persistent history of determinations.

Space members open `/ip-enrichment`, enter an IPv4 or IPv6 address, and submit it. The browser calls `/ip-enrichment-submit`, which validates the address, reads VirusTotal, posts a formatted summary to `#3b-demo`, and records the successful result. The interface reads `/ip-enrichment-history` to display all records newest-first.

All routes are restricted to members of this space. VirusTotal access is read-only; Slack sends one message per successful submission. History is stored only after Slack confirms delivery and persists across Live runs. Draft history is isolated from Live history.

Common failures are invalid or non-public addresses, missing VirusTotal records, connector authorization problems, and Slack channel access errors. Review the `Enrich and notify` execution logs for upstream status and request IDs. To change presentation, edit [`Enrichment form/App.tsx`](<Enrichment form/App.tsx>); to change enrichment or persistence behavior, edit [`Enrich and notify/script.ts`](<Enrich and notify/script.ts>).
