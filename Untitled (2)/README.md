Produces a daily sales-focused email briefing in Slack. At 7:00 AM America/Los_Angeles, the workflow gathers unread Gmail received since the prior successful briefing, enriches known senders with Salesforce open-opportunity context, summarizes and stack-ranks every message, and sends the result to `#3b-demo`.

External services: Gmail (read), Salesforce (read), Anthropic (summarization and ranking), and Slack (message post). The workflow retains only its last successful run timestamp and local delivery date; it does not persist email bodies. If delivery fails, the cursor does not advance and the step retries safely.

Common changes are in [`Send ranked email briefing/script.ts`](<Send ranked email briefing/script.ts>); scheduling and retry settings are in [`Send ranked email briefing/config.toml`](<Send ranked email briefing/config.toml>).
