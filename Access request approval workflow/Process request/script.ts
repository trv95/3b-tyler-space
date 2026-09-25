// Central access-request processor.
// Receives a normalized request on stdin from any trigger (web form, Slack
// slash command, or Saviynt webhook), creates a Tines case, and posts an
// interactive approval message to Slack. Emits an HTTP response tailored to
// the trigger `source` so it can serve as the responder for each route.

const TINES_BASE = (process.env.TINES_URL || "").replace(/^https:\/\/www\./, "https://").replace(/\/$/, "");
const TEAM_ID = 19060; // Demo team
const SLACK_CHANNEL = "C0BJY8Q9SBT"; // #3b-notifications

type Source = "form" | "slash" | "saviynt";

type NormalizedRequest = {
  source: Source;
  name: string;
  email: string;
  system: string;
  level: string;
  duration: string;
  reason: string;
};

function jsonResponse(status: number, bodyObj: unknown): string {
  const body = JSON.stringify(bodyObj);
  return [
    `HTTP/1.1 ${status} ${status === 200 ? "OK" : "Error"}`,
    "Content-Type: application/json",
    `Content-Length: ${Buffer.byteLength(body)}`,
    "",
    body,
  ].join("\r\n");
}

// A Slack slash command expects a 200 with a message payload it will render.
function slackResponse(text: string): string {
  const body = JSON.stringify({ response_type: "ephemeral", text });
  return [
    "HTTP/1.1 200 OK",
    "Content-Type: application/json",
    `Content-Length: ${Buffer.byteLength(body)}`,
    "",
    body,
  ].join("\r\n");
}

function respond(source: Source, status: number, payload: { ok: boolean; case_id?: number; case_url?: string; error?: string; slack_error?: string }) {
  if (source === "slash") {
    const text = payload.ok
      ? `:white_check_mark: Access request submitted${payload.case_id ? ` as case #${payload.case_id}` : ""}. An approver has been notified.`
      : `:warning: Could not submit your request: ${payload.error || "unknown error"}`;
    process.stdout.write(slackResponse(text));
  } else {
    process.stdout.write(jsonResponse(status, payload));
  }
}

async function main() {
  const raw = await Bun.stdin.text();

  let data: NormalizedRequest;
  try {
    data = JSON.parse(raw || "{}");
  } catch {
    process.stdout.write(jsonResponse(400, { ok: false, error: "Invalid normalized payload" }));
    return;
  }

  const source: Source = data.source || "form";
  const name = (data.name || "").trim();
  const email = (data.email || "").trim();
  const system = (data.system || "").trim() || "(unspecified)";
  const level = (data.level || "").trim() || "Standard";
  const duration = (data.duration || "").trim() || "(unspecified)";
  const reason = (data.reason || "").trim() || "(no justification provided)";

  if (!name) {
    respond(source, 400, { ok: false, error: "Missing requester name" });
    return;
  }

  const description = [
    `**Access request** submitted via **${source}**.`,
    ``,
    `- **Requester:** ${name}${email ? ` (${email})` : ""}`,
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
      metadata: { requester_email: email, system, level, duration, source },
    }),
  });

  if (!caseRes.ok) {
    const t = await caseRes.text();
    console.error("Tines case creation failed:", caseRes.status, t);
    respond(source, 502, { ok: false, error: "Failed to create case" });
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
        { type: "mrkdwn", text: `*Requester:*\n${name}${email ? `\n${email}` : ""}` },
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
      elements: [{ type: "mrkdwn", text: `Via *${source}* · documented as <${kase.url}|Tines case #${kase.case_id}>` }],
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
    respond(source, 200, { ok: true, case_id: kase.case_id, case_url: kase.url, slack_error: slackJson.error });
    return;
  }

  respond(source, 200, { ok: true, case_id: kase.case_id, case_url: kase.url });
}

main();
