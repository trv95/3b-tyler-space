Takes a single CrowdStrike Falcon alert, enriches it, has Claude write it up as a SOC analyst would, opens a Tines case, and announces it in Slack. Built for demoing triage-to-case automation.

**Trigger.** Manual — run [Get CrowdStrike alert](<Get CrowdStrike alert/README.md>) and the rest of the chain follows. There is no HTTP route and no schedule. By default it picks up the newest endpoint-protection alert with status `new`; pass `{"composite_id": "..."}` as input to target a specific one.

**The flow.**

```mermaid
graph LR
  A[Get CrowdStrike alert] --> B[Look up host]
  B --> C[Enrich IP with VirusTotal]
  C --> D[Summarize with AI]
  D --> E[Create Tines case]
  E --> F[Notify Slack]
```

Each step appends to a single JSON payload that accumulates `alert`, `host`, `ip_enrichment`, `case_draft`, and finally `tines_case`.

**External services.** CrowdStrike Falcon (alerts and devices APIs), VirusTotal (IP reputation), Anthropic (Claude, for the write-up), Tines (case and notes APIs, team **AD Case Management**), Slack (`#3b-demo`).

**Side effects.** Read-only up to and including the AI step. [Create Tines case](<Create Tines case/README.md>) opens a real case with two notes, and [Notify Slack](<Notify Slack/README.md>) posts a real message. There is no deduplication, so each run produces a new case.

**Operational notes.** The alert step exits non-zero when no alert matches, which stops the run cleanly. Missing IP enrichment is tolerated and reported in the case note rather than failing. The Tines connector's `TINES_URL` is currently malformed (duplicated scheme, unresolvable `www.` prefix) and [Create Tines case/script.ts](<Create Tines case/script.ts>) works around it — worth fixing at the connector.

**Common changes.** Destination Tines team: `TEAM_ID` in [Create Tines case/script.ts](<Create Tines case/script.ts>). Slack channel: `CHANNEL` in [Notify Slack/script.ts](<Notify Slack/script.ts>). Alert selection filter or the fields carried forward: [Get CrowdStrike alert/script.ts](<Get CrowdStrike alert/script.ts>). Case wording, priority mapping, and note layout: the prompt in [Summarize with AI/script.ts](<Summarize with AI/script.ts>).
