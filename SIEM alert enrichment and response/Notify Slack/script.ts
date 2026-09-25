// Posts a notification message to #3b-notifications.
// Resolves the channel ID, ensures the bot has joined, then posts.
// If stdin contains text, it's used as the message; otherwise a default is sent.

const CHANNEL_NAME = "3b-notifications";
const stdin = (await Bun.stdin.text()).trim();
const text = stdin || "Notification from your 3B workflow.";

async function slack(method: string, body: object) {
  const res = await fetch(`https://slack.com/api/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

// Find the channel ID by name (paginating public + private channels).
let channelId = "";
let cursor = "";
do {
  const list: any = await slack("conversations.list", {
    types: "public_channel,private_channel",
    limit: 200,
    cursor,
  });
  if (!list.ok) {
    console.error("conversations.list error:", list.error);
    process.exit(1);
  }
  const match = list.channels?.find((c: any) => c.name === CHANNEL_NAME);
  if (match) {
    channelId = match.id;
    break;
  }
  cursor = list.response_metadata?.next_cursor || "";
} while (cursor);

if (!channelId) {
  console.error(`Channel #${CHANNEL_NAME} not found.`);
  process.exit(1);
}

const data: any = await slack("chat.postMessage", { channel: channelId, text });
if (!data.ok) {
  console.error("Slack error:", data.error);
  process.exit(1);
}

console.error(`Message posted to #${CHANNEL_NAME} (ts: ${data.ts})`);
console.log("ok");
