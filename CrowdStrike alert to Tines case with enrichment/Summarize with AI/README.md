Runs after [Enrich IP with VirusTotal](<../Enrich IP with VirusTotal/README.md>).

Sends the assembled alert, host, and IP enrichment to Claude (`POST /messages` on the **Anthropic** connector, base URL from `ANTHROPIC_BASE_URL`) and asks it to write the case content as a SOC analyst would. The model is forced through a single `emit_case` tool so the response is schema-validated rather than free text.

The evidence is wrapped in an `<evidence>` block and explicitly labelled untrusted, so alert content (filenames, command lines, domains) can't redirect the model.

Appends `case_draft`:

| Field | Used by |
| --- | --- |
| `case_name` | case title |
| `priority` | `critical` / `high` / `medium` / `low` / `info` |
| `description` | case description markdown — summary, detection details, assessment, next steps |
| `host_note` | the "Host details" case note |
| `ip_note` | the "IP enrichment" case note |
| `slack_summary` | the Slack message body |

See [script.ts](script.ts).
