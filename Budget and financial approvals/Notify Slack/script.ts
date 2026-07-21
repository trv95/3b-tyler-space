const CHANNEL = "#3b-demo";

interface Detail {
  label: string;
  value: string;
}
interface Incoming {
  kindLabel?: string;
  caseId?: number | string;
  caseUrl?: string;
  priority?: string;
  title?: string;
  requester?: string;
  requesterEmail?: string;
  amountDisplay?: string;
  neededBy?: string;
  justification?: string;
  details?: Detail[];
}

// Upstream stdout is a full HTTP response; pull out the JSON body.
function extractJson(raw: string): Incoming | null {
  const start = raw.indexOf("{");
  if (start === -1) return null;
  try {
    return JSON.parse(raw.slice(start));
  } catch {
    return null;
  }
}

const raw = await Bun.stdin.text();
const data = extractJson(raw);

if (!data || !data.title) {
  console.error("No usable request payload on stdin; nothing to notify.");
  process.exit(0); // no stdout -> no further steps
}

const priorityEmoji: Record<string, string> = {
  Critical: "🔴",
  High: "🟠",
  Medium: "🟡",
  Low: "🟢",
};
const pEmoji = priorityEmoji[data.priority ?? ""] ?? "⚪";

const detailFields = (data.details ?? [])
  .filter((d) => d.value)
  .map((d) => ({ type: "mrkdwn", text: `*${d.label}:*\n${d.value}` }));

// Slack allows at most 10 fields per section.
const fields = [
  { type: "mrkdwn", text: `*Amount:*\n${data.amountDisplay ?? "—"}` },
  { type: "mrkdwn", text: `*Priority:*\n${pEmoji} ${data.priority ?? "—"}` },
  { type: "mrkdwn", text: `*Requester:*\n${data.requester ?? "—"}` },
  { type: "mrkdwn", text: `*Needed by:*\n${data.neededBy ?? "—"}` },
  ...detailFields,
].slice(0, 10);

const justification = (data.justification ?? "").slice(0, 2800);

const blocks: unknown[] = [
  {
    type: "header",
    text: { type: "plain_text", text: `${data.kindLabel ?? "Approval request"}`, emoji: true },
  },
  {
    type: "section",
    text: { type: "mrkdwn", text: `*${data.title}*\nRequires approval` },
  },
  { type: "section", fields },
  {
    type: "section",
    text: { type: "mrkdwn", text: `*Business justification:*\n${justification || "_None provided_"}` },
  },
];

if (data.caseUrl) {
  blocks.push({
    type: "actions",
    elements: [
      {
        type: "button",
        style: "primary",
        text: {
          type: "plain_text",
          text: data.caseId ? `Open case #${data.caseId}` : "Open case",
          emoji: true,
        },
        url: data.caseUrl,
      },
    ],
  });
}

blocks.push({
  type: "context",
  elements: [
    {
      type: "mrkdwn",
      text: `Submitted by ${data.requester ?? "unknown"} · ${data.requesterEmail ?? ""}`,
    },
  ],
});

const res = await fetch("https://slack.com/api/chat.postMessage", {
  method: "POST",
  headers: { "Content-Type": "application/json; charset=utf-8" },
  body: JSON.stringify({
    channel: CHANNEL,
    text: `${data.kindLabel ?? "Approval request"}: ${data.title} (${data.amountDisplay ?? ""}) needs approval`,
    blocks,
  }),
});

const result = (await res.json()) as { ok: boolean; error?: string; ts?: string };
if (!result.ok) {
  console.error(`Slack post failed: ${result.error}`);
  process.exit(1);
}

console.log(JSON.stringify({ posted: true, channel: CHANNEL, ts: result.ts }));
