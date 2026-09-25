const CHANNEL = "#3b-demo";

const payload = JSON.parse(await Bun.stdin.text());
const c = payload.tines_case;
const draft = payload.case_draft ?? {};
if (!c?.url) {
  console.error("Upstream payload had no Tines case URL");
  process.exit(1);
}

const priority = String(c.priority ?? draft.priority ?? "unknown").toUpperCase();

if (c.deduplicated) {
  console.error(`Case ${c.case_id} was already announced for this alert; not re-posting.`);
  console.log(JSON.stringify({ case_id: c.case_id, case_url: c.url, skipped: "duplicate_alert", channel: CHANNEL }));
  process.exit(0);
}

const blocks = [
  {
    type: "header",
    text: { type: "plain_text", text: `CrowdStrike alert → Tines case #${c.case_id}` },
  },
  {
    type: "section",
    fields: [
      { type: "mrkdwn", text: `*Case*\n<${c.url}|${c.name ?? `Case ${c.case_id}`}>` },
      { type: "mrkdwn", text: `*Priority*\n${priority}` },
      { type: "mrkdwn", text: `*Host*\n${payload.host?.hostname ?? "unknown"}` },
      {
        type: "mrkdwn",
        text: `*External IP*\n${payload.host?.external_ip ?? "n/a"} (VT ${payload.ip_enrichment?.stats?.malicious ?? 0} malicious)`,
      },
    ],
  },
  {
    type: "section",
    text: { type: "mrkdwn", text: draft.slack_summary ?? "No summary available." },
  },
  {
    type: "actions",
    elements: [
      { type: "button", text: { type: "plain_text", text: "Open case" }, url: c.url },
      ...(payload.alert?.falcon_host_link
        ? [
            {
              type: "button",
              text: { type: "plain_text", text: "View in Falcon" },
              url: payload.alert.falcon_host_link,
            },
          ]
        : []),
    ],
  },
];

const response = await fetch("https://slack.com/api/chat.postMessage", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    channel: CHANNEL,
    text: `${priority} CrowdStrike alert on ${payload.host?.hostname ?? "unknown host"} — Tines case #${c.case_id}: ${c.url}`,
    blocks,
    unfurl_links: false,
  }),
});

const result = await response.json();
if (!response.ok || !result.ok) {
  throw new Error(`Slack post failed: ${response.status} ${JSON.stringify(result)}`);
}

console.error(`Posted to ${CHANNEL} (ts ${result.ts})`);
console.log(JSON.stringify({ case_id: c.case_id, case_url: c.url, slack_ts: result.ts, channel: CHANNEL }));
