Posts an approval notification to Slack for a submitted approval request.

**Trigger:** runs after [Submit request](<../Submit request/script.ts>), whose stdout
(the HTTP response it returned to the form) is this step's stdin.

**What it does:**

1. Extracts the JSON body from the upstream HTTP response.
2. Builds a [Block Kit](https://api.slack.com/block-kit) message summarizing the
   request — type, amount, priority, requester, type-specific details, and the
   business justification — with a button linking to the created Tines case.
3. Posts it to `#3b-demo` via `POST https://slack.com/api/chat.postMessage`.

Auth is provided by the Slack connector. The destination channel is the
`CHANNEL` constant in [script.ts](script.ts).
