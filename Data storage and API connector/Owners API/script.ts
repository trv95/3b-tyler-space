import { readRequest, json, openDb, buildQuery, clampLimit, parseRecords, upsert } from "./lib";

const COLS = ["application", "service", "owner", "ownerEmail", "spoc", "spocEmail", "target", "project", "slack", "component"];
const KEY = "service";

const req = await readRequest();

if (req.method === "POST") {
  const db = openDb(false);
  try {
    const records = parseRecords(req.body);
    const result = upsert(db, "owners", KEY, COLS, records);
    json({ ok: true, ...result });
  } catch (e: any) {
    json({ ok: false, error: e?.message ?? String(e) }, 400);
  } finally {
    db.close();
  }
} else if (req.method === "GET") {
  const db = openDb();
  const { where, params } = buildQuery(req.query, ["service", "ownerEmail", "target", "application", "project"]);
  const limit = clampLimit(req.query);
  const rows = db.query(`SELECT * FROM owners ${where} ORDER BY service LIMIT ?`).all(...params, limit);
  db.close();
  json({ count: rows.length, records: rows });
} else {
  json({ ok: false, error: `Method ${req.method} not allowed` }, 405);
}
