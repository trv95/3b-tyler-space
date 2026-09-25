import { Database } from "bun:sqlite";

const TEAM_ID = "e0674154-33df-46f4-8bc0-dcebbcad5eb6";
const CHANNEL_ID = "19:d1c6d30843cf412a806a90988f630ac1@thread.skype";
const GRAPH = `https://graph.microsoft.com/v1.0/teams/${TEAM_ID}/channels/${encodeURIComponent(CHANNEL_ID)}/messages`;

const raw = await Bun.stdin.text();
const body = raw.startsWith("HTTP/")
  ? raw.replace(/^[\s\S]*?(\r?\n){2}/, "").trim()
  : raw.trim();
if (!body) process.exit(0);

const event = JSON.parse(body) as {
  ts: string;
  thread_ts: string | null;
  user: string | null;
  text: string;
};

const db = new Database("/storage/mirror_state/mirror.sqlite");
db.run("PRAGMA journal_mode = WAL");
db.run("CREATE TABLE IF NOT EXISTS thread_map (slack_ts TEXT PRIMARY KEY, teams_id TEXT NOT NULL)");
db.run("CREATE TABLE IF NOT EXISTS mirrored_slack (ts TEXT PRIMARY KEY)");
db.run("CREATE TABLE IF NOT EXISTS mirrored_teams (id TEXT PRIMARY KEY)");

// Messages this workflow itself posted into Slack must not bounce back.
if (db.query("SELECT 1 FROM mirrored_slack WHERE ts = ?").get(event.ts)) process.exit(0);

async function slackDisplayName(userId: string | null): Promise<string> {
  if (!userId) return "Slack";
  const res = await fetch(`https://slack.com/api/users.info?user=${encodeURIComponent(userId)}`);
  const data = (await res.json()) as any;
  if (!data.ok) return "Slack user";
  return data.user?.profile?.display_name || data.user?.real_name || data.user?.name || "Slack user";
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function slackToHtml(text: string): string {
  let out = escapeHtml(text);
  out = out.replace(/&lt;(https?:[^|&]+)\|([^&]*)&gt;/g, '<a href="$1">$2</a>');
  out = out.replace(/&lt;(https?:[^&]+)&gt;/g, '<a href="$1">$1</a>');
  out = out.replace(/```([\s\S]+?)```/g, "<pre>$1</pre>");
  out = out.replace(/`([^`]+)`/g, "<code>$1</code>");
  out = out.replace(/\*([^*\n]+)\*/g, "<b>$1</b>");
  out = out.replace(/_([^_\n]+)_/g, "<i>$1</i>");
  return out.replace(/\n/g, "<br>");
}

const author = await slackDisplayName(event.user);
const html = `<b>${escapeHtml(author)}</b> (via Slack)<br>${slackToHtml(event.text)}`;

const isReply = event.thread_ts && event.thread_ts !== event.ts;
const parentTeamsId = isReply
  ? (db.query("SELECT teams_id FROM thread_map WHERE slack_ts = ?").get(event.thread_ts!) as
      | { teams_id: string }
      | undefined)?.teams_id
  : undefined;

const url = parentTeamsId ? `${GRAPH}/${parentTeamsId}/replies` : GRAPH;
const res = await fetch(url, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ body: { contentType: "html", content: html } }),
});

if (!res.ok) {
  console.error(`Graph post failed (${res.status}): ${await res.text()}`);
  process.exit(1);
}

const posted = (await res.json()) as any;
db.run("INSERT OR IGNORE INTO mirrored_teams (id) VALUES (?)", [posted.id]);
if (!parentTeamsId) {
  db.run("INSERT OR REPLACE INTO thread_map (slack_ts, teams_id) VALUES (?, ?)", [event.ts, posted.id]);
}
db.close();
