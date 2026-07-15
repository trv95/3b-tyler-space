// Posts a Slack notification linking to the created Tines case.
const data = JSON.parse(await Bun.stdin.text());
const alert = data.alert ?? {};
const vt = data.virustotal ?? {};
const caseLink = data.case?.link;

const channel = process.env.SLACK_CHANNEL || "#security-alerts";

const text = `:rotating_light: *${alert.severity ?? "ALERT"}* — ${alert.title ?? "SIEM alert"}`;

const blocks = [
  { type: "header", text: { type: "plain_text", text: "🚨 SIEM Alert Enriched" } },
  {
    type: "section",
    fields: [
      { type: "mrkdwn", text: `*Severity:*\n${alert.severity ?? "?"}` },
      { type: "mrkdwn", text: `*Affected user:*\n${alert.affectedUser ?? "?"}` },
      { type: "mrkdwn", text: `*Source IP:*\n${alert.sourceIp ?? "?"}` },
      { type: "mrkdwn", text: `*VT malicious/suspicious:*\n${vt.malicious ?? "n/a"} / ${vt.suspicious ?? "n/a"}` },
    ],
  },
  {
    type: "section",
    text: { type: "mrkdwn", text: (data.summary ?? alert.description ?? "").slice(0, 2900) },
  },
  ...(caseLink
    ? [{
        type: "actions",
        elements: [{
          type: "button",
          text: { type: "plain_text", text: "Open Tines Case" },
          url: caseLink,
          style: "primary",
        }],
      }]
    : []),
];

const res = await fetch("https://slack.com/api/chat.postMessage", {
  method: "POST",
  headers: { "content-type": "application/json; charset=utf-8" },
  body: JSON.stringify({ channel, text, blocks }),
});

const result = (await res.json()) as any;
if (!result.ok) {
  console.error(`Slack error: ${JSON.stringify(result)}`);
  process.exit(1);
}

console.log(JSON.stringify({ ok: true, ts: result.ts, channel: result.channel, case: data.case }));
