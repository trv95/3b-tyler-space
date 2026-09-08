import { Database } from "bun:sqlite";

const TEAM_ID = "e0674154-33df-46f4-8bc0-dcebbcad5eb6";
const CHANNEL_ID = "19:d1c6d30843cf412a806a90988f630ac1@thread.skype";
const RESOURCE = `/teams/${TEAM_ID}/channels/${CHANNEL_ID}/messages`;
const NOTIFICATION_URL =
  "https://tyler-space.se-demo.3b.run/teams-notifications?external_id=DJwrzUj3QigvJ2ARl5jOi";
const CLIENT_STATE = "slack-teams-mirror";
const SUBSCRIPTIONS = "https://graph.microsoft.com/v1.0/subscriptions";

// Teams channel-message subscriptions may not live longer than 60 minutes.
const expiration = () => new Date(Date.now() + 55 * 60 * 1000).toISOString();

const db = new Database("/storage/mirror_state/mirror.sqlite");
db.run("PRAGMA journal_mode = WAL");
db.run("CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)");

const existingId = (
  db.query("SELECT value FROM settings WHERE key = 'subscription_id'").get() as { value: string } | undefined
)?.value;

async function renew(id: string): Promise<boolean> {
  const res = await fetch(`${SUBSCRIPTIONS}/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ expirationDateTime: expiration() }),
  });
  if (res.ok) {
    console.error(`Renewed subscription ${id}`);
    return true;
  }
  console.error(`Renew failed (${res.status}): ${await res.text()}`);
  return false;
}

async function create(): Promise<void> {
  const res = await fetch(SUBSCRIPTIONS, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      changeType: "created",
      notificationUrl: NOTIFICATION_URL,
      resource: RESOURCE,
      expirationDateTime: expiration(),
      clientState: CLIENT_STATE,
    }),
  });
  if (!res.ok) {
    console.error(`Create subscription failed (${res.status}): ${await res.text()}`);
    process.exit(1);
  }
  const sub = (await res.json()) as any;
  db.run("INSERT OR REPLACE INTO settings (key, value) VALUES ('subscription_id', ?)", [sub.id]);
  console.error(`Created subscription ${sub.id}`);
}

if (existingId) {
  if (!(await renew(existingId))) {
    db.run("DELETE FROM settings WHERE key = 'subscription_id'");
    await create();
  }
} else {
  await create();
}

db.close();
