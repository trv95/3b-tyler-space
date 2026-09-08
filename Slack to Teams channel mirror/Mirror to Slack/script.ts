import { Database } from "bun:sqlite";

const SLACK_CHANNEL = "C0C096CMZ5Z";
const TEAM_ID = "e0674154-33df-46f4-8bc0-dcebbcad5eb6";
const CHANNEL_ID = "19:d1c6d30843cf412a806a90988f630ac1@thread.skype";
const GRAPH = `https://graph.microsoft.com/v1.0/teams/${TEAM_ID}/channels/${encodeURIComponent(CHANNEL_ID)}/messages`;

const raw = await Bun.stdin.text();
const body = raw.startsWith("HTTP/")
  ? raw.replace(/^[\s\S]*?(\r?\n){2}/, "").trim()
  : raw.trim();
if (!body) process.exit(0);

const payload = JSON.parse(body) as { messages: { resource: string }[] };
const resources = payload.messages ?? [];
if (resources.length === 0) process.exit(0);

const db = new Database("/storage/mirror_state/mirror.sqlite");
db.run("PRAGMA journal_mode = WAL");
db.run("CREATE TABLE IF NOT EXISTS thread_map (slack_ts TEXT PRIMARY KEY, teams_id TEXT NOT NULL)");
db.run("CREATE TABLE IF NOT EXISTS mirrored_slack (ts TEXT PRIMARY KEY)");
db.run("CREATE TABLE IF NOT EXISTS mirrored_teams (id TEXT PRIMARY KEY)");

function htmlToSlack(html: string): string {
  let text = html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div)>/gi, "\n")
    .replace(/<(b|strong)>([\s\S]*?)<\/\1>/gi, "*$2*")
    .replace(/<(i|em)>([\s\S]*?)<\/\1>/gi, "_$2_")
    .replace(/<code>([\s\S]*?)<\/code>/gi, "`$1`")
    .replace(/<pre>([\s\S]*?)<\/pre>/gi, "```$1```")
    .replace(/<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, "<$1|$2>")
    .replace(/<[^>]+>/g, "");
  text = text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
  return text.replace(/\n{3,}/g, "\n\n").trim();
}

for (const { resource } of resources) {
  const messageId = resource.match(/messages\('([^']+)'\)/)?.[1];
  const replyId = resource.match(/replies\('([^']+)'\)/)?.[1];
  const targetId = replyId ?? messageId;
  if (!targetId) continue;

  if (db.query("SELECT 1 FROM mirrored_teams WHERE id = ?").get(targetId)) continue;

  const url = replyId ? `${GRAPH}/${messageId}/replies/${replyId}` : `${GRAPH}/${messageId}`;
  const res = await fetch(url);
  if (!res.ok) {
    console.error(`Graph fetch failed (${res.status}) for ${targetId}: ${await res.text()}`);
    process.exit(1);
  }
  const message = (await res.json()) as any;

  if (message.messageType !== "message" || message.deletedDateTime) continue;
  const content = htmlToSlack(String(message.body?.content ?? ""));
  if (!content) continue;

  const author = message.from?.user?.displayName ?? message.from?.application?.displayName ?? "Teams user";
  const rootTeamsId = replyId ? messageId : targetId;
  const threadTs = (
    db.query("SELECT slack_ts FROM thread_map WHERE teams_id = ?").get(rootTeamsId) as
      | { slack_ts: string }
      | undefined
  )?.slack_ts;

  const post = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      channel: SLACK_CHANNEL,
      text: `*${author}* (via Teams)\n${content}`,
      ...(threadTs ? { thread_ts: threadTs } : {}),
    }),
  });
  const posted = (await post.json()) as any;
  if (!posted.ok) {
    console.error(`Slack post failed for ${targetId}: ${posted.error}`);
    process.exit(1);
  }

  db.run("INSERT OR IGNORE INTO mirrored_slack (ts) VALUES (?)", [posted.ts]);
  if (!replyId) {
    db.run("INSERT OR REPLACE INTO thread_map (slack_ts, teams_id) VALUES (?, ?)", [posted.ts, targetId]);
  }
}

db.close();
