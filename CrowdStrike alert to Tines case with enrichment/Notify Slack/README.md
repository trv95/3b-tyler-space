Final step, runs after [Create Tines case](<../Create Tines case/README.md>).

Posts a Block Kit message to `#3b-demo` via `POST https://slack.com/api/chat.postMessage` using the **Tyler Slack** connector: case number and link, priority, hostname, external IP with the VirusTotal malicious count, the AI-written summary, and buttons to open the case and the Falcon detection.

This step sends a real message. The channel is the `CHANNEL` constant at the top of [script.ts](script.ts); the bot must be a member of it.

Output: `{ case_id, case_url, slack_ts, channel }`.
