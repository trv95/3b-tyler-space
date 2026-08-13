An on-demand phishing triage demo. Hit **Run** on [Simulate reported email](<Simulate reported email/README.md>) and the workflow behaves as if a user had just forwarded a suspicious message to the report-phishing inbox: it fabricates the email, extracts indicators, enriches them in VirusTotal, has Claude score the risk, and opens a fully populated Tines case.

**Trigger.** Manual only — there is no route, schedule, or inbound email address. Nothing is ever actually sent or received; the reported message is generated in code.

**The flow.**

1. [Simulate reported email](<Simulate reported email/README.md>) builds a synthetic RFC 822 message with a spoofed sender, failing SPF/DKIM/DMARC, three header IPs, two URLs (one known-bad), and two attachments — one of them the EICAR test string, so VirusTotal returns genuine detections.
2. [Extract IOCs](<Extract IOCs/README.md>) parses headers, routing IPs, sender addresses and domains, body URLs, and MIME attachments (with SHA-256/MD5).
3. [VirusTotal enrichment](<VirusTotal enrichment/README.md>) looks each indicator up by IP, domain, URL id, and file hash.
4. [AI risk analysis](<AI risk analysis/README.md>) asks Claude for a 1–100 risk score, verdict, confidence, summary, justification, techniques, and recommended actions.
5. [Create Tines case](<Create Tines case/README.md>) opens the case with all of the above as note blocks, tables, tasks, metadata, and file evidence.

**External services.** VirusTotal (read-only lookups — nothing is submitted), the Anthropic API, and the Tines API.

**Side effects.** Only the last step writes anywhere: every run creates a new Tines case in team `107557` (AD Case Management). Steps 1–4 are read-only, so they are safe to re-run freely.

**Pointers for common changes.**

- Change the simulated email — sender, URLs, attachments, pressure tactics — in [Simulate reported email/script.ts](<Simulate reported email/script.ts>).
- Change scoring guidance or the output schema in the prompt in [AI risk analysis/script.ts](<AI risk analysis/script.ts>).
- Change the Tines team, priority thresholds, tags, or case layout in [Create Tines case/script.ts](<Create Tines case/script.ts>) (`TEAM_ID` is the first line).
- Add another enrichment source by inserting a step between VirusTotal enrichment and AI risk analysis; keep passing the whole payload through so later steps still see everything.

**Operational notes.** VirusTotal free-tier keys are rate-limited to a few lookups per minute — a burst of runs can surface `429`s from that step. Indicators with no VirusTotal record are reported as unknown rather than clean, which is deliberate: newly registered phishing infrastructure usually has no record yet.
