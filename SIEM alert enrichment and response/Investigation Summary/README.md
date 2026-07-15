Uses the Anthropic Claude API to turn the accumulated enrichment (Panther alert + VirusTotal + Databricks logs) into an **analyst-ready investigative summary**: what happened, why it matters, key indicators, and recommended next steps.

Reads the merged JSON from stdin, adds a `summary` (markdown string) field, and passes everything downstream.

Auth via an Anthropic connector.
