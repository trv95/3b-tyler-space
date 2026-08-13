Creates the investigation case in Tines with every enrichment detail attached. Input comes from [AI risk analysis](<../AI risk analysis/README.md>).

`POST {TINES_URL}/api/v2/cases` via the **Tyler Tines Stories** connector, into team `107557` (AD Case Management). The team ID is the `TEAM_ID` constant at the top of [script.ts](script.ts).

The case carries:

- **Name** with the subject and risk score; **description** with the AI summary, justification, techniques, and recommended actions
- **Priority** mapped from the risk score — ≥85 critical, ≥65 high, ≥40 medium, otherwise low
- **Tags** `phishing`, `simulation`, and the verdict; **metadata** with score, verdict, sender, message id, and detection counts
- **Tasks** created from the AI's recommended actions (first six)
- **Note blocks** for the reported message, an enrichment summary, and per-indicator tables for header IPs, sender domains, URLs, and attachments
- **A file block** with the raw `.eml` and each attachment stored base64-encoded so it cannot be opened and executed by accident

URLs and body text are defanged (`hxxp`, `[.]`) in the case so no one clicks them from the timeline.

This step writes to Tines — every run creates a new case. Output is `{ case_id, case_url, priority, risk_score, verdict, indicators_flagged }`.

## Case actions

After the case is created, two webhook case actions are attached, both pointing at [the Case action handler step](<../Case action handler/script.ts>) with the action name, case id, case action id, sender, and subject as query params:

- **Block Sender** — removes itself, then adds a note recording the blocked sender, who clicked, and when.
- **Remove from inboxes** — removes itself, then adds a note with simulated inbox-sweep results and confirms removal from all inboxes.
