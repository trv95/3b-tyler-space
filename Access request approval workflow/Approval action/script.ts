// Handles Slack Approve / Deny button clicks for access requests.
// Slack delivers an interactive payload as `application/x-www-form-urlencoded`
// with a single `payload` field containing JSON. We update the Tines case and
// respond with a replacement Slack message showing the decision.

const TINES_BASE = (process.env.TINES_URL || "").replace(/^https:\/\/www\./, "https://").replace(/\/$/, "");

function parseRequestBody(raw: string): string {
  const idx = raw.indexOf("\r\n\r\n");
  return idx === -1 ? "" : raw.slice(idx + 4);
}

// A 200 response whose JSON body is a Slack message replaces the original message.
function slackReplace(bodyObj: unknown): string {
  const body = JSON.stringify(bodyObj);
  return [
    "HTTP/1.1 200 OK",
    "Content-Type: application/json",
    `Content-Length: ${Buffer.byteLength(body)}`,
    "",
    body,
  ].join("\r\n");
}

function ok200(text = "ok"): string {
  return [
    "HTTP/1.1 200 OK",
    "Content-Type: text/plain",
    `Content-Length: ${Buffer.byteLength(text)}`,
    "",
    text,
  ].join("\r\n");
}

type Ctx = {
  case_id: number;
  case_url: string;
  name: string;
  email: string;
  system: string;
  level: string;
  duration: string;
};

async function main() {
  const raw = await Bun.stdin.text();
  const body = parseRequestBody(raw);

  const params = new URLSearchParams(body);
  const payloadStr = params.get("payload");
  if (!payloadStr) {
    process.stdout.write(ok200("no payload"));
    return;
  }

  const payload = JSON.parse(payloadStr);
  const action = payload.actions?.[0];
  if (!action) {
    process.stdout.write(ok200("no action"));
    return;
  }

  const decision = action.action_id as "approve" | "deny";
  const ctx = JSON.parse(action.value) as Ctx;
  const approver =
    payload.user?.name || payload.user?.username || payload.user?.id || "an approver";
  const approved = decision === "approve";
  const verb = approved ? "approved" : "denied";

  // 1. Comment on the Tines case, and close it on approval.
  const comment = `Access request **${verb}** by *${approver}* via Slack.`;
  await fetch(`${TINES_BASE}/api/v2/cases/${ctx.case_id}/comments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ value: comment }),
  }).catch((e) => console.error("comment failed", e));

  // Close the case to reflect the completed decision.
  await fetch(`${TINES_BASE}/api/v2/cases/${ctx.case_id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: "closed" }),
  }).catch((e) => console.error("close failed", e));

  // 2. Replace the Slack message with the outcome.
  const emoji = approved ? "✅" : "🚫";
  const blocks = [
    {
      type: "header",
      text: { type: "plain_text", text: `${emoji} Access request ${verb}`, emoji: true },
    },
    {
      type: "section",
      fields: [
        { type: "mrkdwn", text: `*Requester:*\n${ctx.name}\n${ctx.email}` },
        { type: "mrkdwn", text: `*System:*\n${ctx.system}` },
        { type: "mrkdwn", text: `*Access level:*\n${ctx.level}` },
        { type: "mrkdwn", text: `*Duration:*\n${ctx.duration}` },
      ],
    },
    {
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `${emoji} *${verb.toUpperCase()}* by *${approver}* · <${ctx.case_url}|Tines case #${ctx.case_id}>`,
        },
      ],
    },
  ];

  process.stdout.write(
    slackReplace({
      replace_original: true,
      text: `Access request ${verb} by ${approver}`,
      blocks,
    }),
  );
}

main();
