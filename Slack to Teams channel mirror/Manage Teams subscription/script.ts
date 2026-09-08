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

const storedId = (
  db.query("SELECT value FROM settings WHERE key = 'subscription_id'").get() as { value: string } | undefined
)?.value;

// Draft and live have separate volumes, so the stored id may be missing while a
// subscription for this channel already exists; ask Graph before creating one.
async function discover(): Promise<string[]> {
  const res = await fetch(SUBSCRIPTIONS);
  if (!res.ok) {
    console.error(`List subscriptions failed (${res.status}): ${await res.text()}`);
    return [];
  }
  const body = (await res.json()) as { value?: { id: string; resource: string; notificationUrl: string }[] };
  return (body.value ?? [])
    .filter((s) => s.resource === RESOURCE && s.notificationUrl === NOTIFICATION_URL)
    .map((s) => s.id);
}

async function remove(id: string): Promise<void> {
  const res = await fetch(`${SUBSCRIPTIONS}/${id}`, { method: "DELETE" });
  console.error(res.ok ? `Deleted duplicate subscription ${id}` : `Delete ${id} failed (${res.status})`);
}

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

const discovered = await discover();
const candidates = storedId && discovered.includes(storedId)
  ? [storedId, ...discovered.filter((id) => id !== storedId)]
  : discovered;

let active: string | null = null;
for (const id of candidates) {
  if (active === null) {
    if (await renew(id)) active = id;
  } else {
    await remove(id);
  }
}

if (active === null) {
  await create();
} else {
  db.run("INSERT OR REPLACE INTO settings (key, value) VALUES ('subscription_id', ?)", [active]);
}

db.close();
