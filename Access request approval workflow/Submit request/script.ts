// Access request submission handler.
// Parses the form JSON from the HTTP request body, creates a Tines case,
// and posts an interactive approval message to Slack.

const TINES_BASE = (process.env.TINES_URL || "").replace(/^https:\/\/www\./, "https://").replace(/\/$/, "");
const TEAM_ID = 19060; // Demo team
const SLACK_CHANNEL = "C0BJY8Q9SBT"; // #3b-notifications

type Req = {
  name?: string;
  email?: string;
  system?: string;
  level?: string;
  duration?: string;
  reason?: string;
};

function httpResponse(status: number, bodyObj: unknown): string {
  const body = JSON.stringify(bodyObj);
  return [
    `HTTP/1.1 ${status} ${status === 200 ? "OK" : "Error"}`,
    "Content-Type: application/json",
    `Content-Length: ${Buffer.byteLength(body)}`,
    "",
    body,
  ].join("\r\n");
}

// Extract the body from an RFC 7230 HTTP request on stdin.
function parseRequestBody(raw: string): string {
  const idx = raw.indexOf("\r\n\r\n");
  if (idx === -1) return "";
  return raw.slice(idx + 4);
}

async function main() {
  const raw = await Bun.stdin.text();
  const body = parseRequestBody(raw);

  let data: Req;
  try {
    data = JSON.parse(body || "{}");
  } catch {
    process.stdout.write(httpResponse(400, { ok: false, error: "Invalid JSON body" }));
    return;
  }

  const name = (data.name || "").trim();
  const email = (data.email || "").trim();
  const system = (data.system || "").trim();
  const level = (data.level || "").trim();
  const duration = (data.duration || "").trim();
  const reason = (data.reason || "").trim();

  if (!name || !email || !reason) {
    process.stdout.write(httpResponse(400, { ok: false, error: "Missing required fields" }));
    return;
  }

  const description = [
    `**Access request** submitted via the request form.`,
    ``,
    `- **Requester:** ${name} (${email})`,
    `- **System / resource:** ${system}`,
    `- **Access level:** ${level}`,
    `- **Duration:** ${duration}`,
    ``,
    `**Justification**`,
    reason,
  ].join("\n");

  // 1. Create the Tines case.
  const caseRes = await fetch(`${TINES_BASE}/api/v2/cases/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      team_id: TEAM_ID,
      name: `Access request: ${name} → ${system} (${level})`,
      priority: level.toLowerCase() === "admin" || level.toLowerCase() === "elevated" ? "high" : "medium",
      status: "open",
      description,
      metadata: { requester_email: email, system, level, duration },
    }),
  });

  if (!caseRes.ok) {
    const t = await caseRes.text();
    console.error("Tines case creation failed:", caseRes.status, t);
    process.stdout.write(httpResponse(502, { ok: false, error: "Failed to create case" }));
    return;
  }

  const kase = (await caseRes.json()) as { case_id: number; url: string };

  // Context carried on the Slack buttons so the action handler can act.
  const ctx = JSON.stringify({
    case_id: kase.case_id,
    case_url: kase.url,
    name,
    email,
    system,
    level,
    duration,
  });

  // 2. Post the interactive approval message to Slack.
  const blocks = [
    {
      type: "header",
      text: { type: "plain_text", text: "🔐 New access request", emoji: true },
    },
    {
      type: "section",
      fields: [
        { type: "mrkdwn", text: `*Requester:*\n${name}\n${email}` },
        { type: "mrkdwn", text: `*System:*\n${system}` },
        { type: "mrkdwn", text: `*Access level:*\n${level}` },
        { type: "mrkdwn", text: `*Duration:*\n${duration}` },
      ],
    },
    {
      type: "section",
      text: { type: "mrkdwn", text: `*Justification:*\n${reason}` },
    },
    {
      type: "context",
      elements: [{ type: "mrkdwn", text: `Documented as <${kase.url}|Tines case #${kase.case_id}>` }],
    },
    {
      type: "actions",
      block_id: "access_decision",
      elements: [
        {
          type: "button",
          style: "primary",
          text: { type: "plain_text", text: "Approve", emoji: true },
          action_id: "approve",
          value: ctx,
        },
        {
          type: "button",
          style: "danger",
          text: { type: "plain_text", text: "Deny", emoji: true },
          action_id: "deny",
          value: ctx,
        },
      ],
    },
  ];

  const slackRes = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      channel: SLACK_CHANNEL,
      text: `New access request from ${name} for ${system} (${level})`,
      blocks,
    }),
  });
  const slackJson = (await slackRes.json()) as { ok: boolean; error?: string };
  if (!slackJson.ok) {
    console.error("Slack post failed:", slackJson.error);
    // Case was created; surface partial success but signal the Slack issue.
    process.stdout.write(
      httpResponse(200, { ok: true, case_id: kase.case_id, case_url: kase.url, slack_error: slackJson.error }),
    );
    return;
  }

  process.stdout.write(httpResponse(200, { ok: true, case_id: kase.case_id, case_url: kase.url }));
}

main();
