Provides security analysts with a private web form for enriching a public IP address in VirusTotal and sharing the resulting reputation summary in Slack.

Space members open `/ip-enrichment`, enter an IPv4 or IPv6 address, and submit it. The browser calls the private `/ip-enrichment-submit` helper, which validates the address, reads the VirusTotal report, and posts a formatted summary to `#3b-demo`. The result is also returned to the page.

Both routes are restricted to members of this space. VirusTotal access is read-only; Slack is write-enabled and sends one message per successful submission. No enrichment data is persisted.

Common failures are invalid or non-public addresses, missing VirusTotal records, connector authorization problems, and Slack channel access errors. Review the `Enrich and notify` execution logs for the upstream status and request ID. To change the presentation, edit [`Enrichment form/App.tsx`](<Enrichment form/App.tsx>); to change validation or the Slack message, edit [`Enrich and notify/script.ts`](<Enrich and notify/script.ts>).
