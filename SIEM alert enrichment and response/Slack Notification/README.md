Posts a Slack notification summarizing the alert and linking to the newly created Tines case, via [`chat.postMessage`](https://api.slack.com/methods/chat.postMessage).

Reads the full enriched JSON (including `case.link`) from stdin and sends a formatted Block Kit message. Auth via a Slack connector.
