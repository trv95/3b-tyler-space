import { Database } from "bun:sqlite";

const DB_PATH = "/storage/se-requests/requests.sqlite";

function respond(status: number, body: unknown) {
  const payload = JSON.stringify(body);
  const reason = status === 200 ? "OK" : status === 405 ? "Method Not Allowed" : "Bad Request";
  process.stdout.write(
    [
      `HTTP/1.1 ${status} ${reason}`,
      "Content-Type: application/json",
      `Content-Length: ${Buffer.byteLength(payload)}`,
      "",
      payload,
    ].join("\r\n")
  );
}

const raw = await Bun.stdin.text();
const separator = raw.indexOf("\r\n\r\n");
const head = separator === -1 ? raw : raw.slice(0, separator);
const body = separator === -1 ? "" : raw.slice(separator + 4);
const method = head.split(/\r?\n/, 1)[0]?.split(" ")[0] ?? "";

if (method !== "POST") {
  respond(405, { error: "Use POST" });
  process.exit(0);
}

const parsed = JSON.parse(body) as Record<string, unknown>;
const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const action = str(parsed.action) || (parsed.remove === true ? "remove" : "upsert");
const step = str(parsed.step);
const title = str(parsed.title);
const notes = str(parsed.notes);
const status = str(parsed.status) === "done" ? "done" : "outstanding";

const db = new Database(DB_PATH, { create: true });
db.run("PRAGMA journal_mode = DELETE");
db.run(`
  CREATE TABLE IF NOT EXISTS requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    step TEXT NOT NULL,
    title TEXT NOT NULL,
    notes TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    UNIQUE (step)
  )
`);

const columns = db
  .query<{ name: string }, []>("PRAGMA table_info(requests)")
  .all()
  .map((c) => c.name);
if (!columns.includes("status")) {
  db.run("ALTER TABLE requests ADD COLUMN status TEXT NOT NULL DEFAULT 'outstanding'");
}
if (!columns.includes("source")) {
  db.run("ALTER TABLE requests ADD COLUMN source TEXT NOT NULL DEFAULT 'guide'");
}

function fail(message: string): never {
  db.close();
  respond(400, { error: message });
  process.exit(0);
}

if (action === "remove") {
  if (!step) fail("step is required");
  db.run("DELETE FROM requests WHERE step = ?", [step]);
} else if (action === "status") {
  if (!step) fail("step is required");
  db.run("UPDATE requests SET status = ? WHERE step = ?", [status, step]);
} else if (action === "add") {
  if (!title) fail("title is required");
  db.run(
    `INSERT INTO requests (step, title, notes, created_at, status, source)
     VALUES (?, ?, ?, ?, ?, 'manual')`,
    [`manual:${crypto.randomUUID()}`, title, notes.slice(0, 4000), new Date().toISOString(), status]
  );
} else {
  if (!step || !title) fail("step and title are required");
  db.run(
    `INSERT INTO requests (step, title, notes, created_at, status, source)
     VALUES (?, ?, ?, ?, 'outstanding', 'guide')
     ON CONFLICT (step) DO UPDATE SET title = excluded.title, notes = excluded.notes, created_at = excluded.created_at`,
    [step, title, notes.slice(0, 4000), new Date().toISOString()]
  );
}

const { count } = db
  .query<{ count: number }, []>("SELECT COUNT(*) AS count FROM requests WHERE status = 'outstanding'")
  .get()!;
db.close();

console.error(`${action} ${step || "(manual)"} — ${count} outstanding`);
respond(200, { ok: true, outstanding: count });
