import { readRequest, json, openDb, buildQuery, clampLimit, parseRecords, upsert } from "./lib";

const COLS = ["findingId", "qid", "priority", "risk", "title", "cve", "asset", "service", "ownerEmail", "target", "bug", "securityCentral", "remediation"];
const KEY = "findingId";

const req = await readRequest();

if (req.method === "POST") {
  const db = openDb(false);
  try {
    const records = parseRecords(req.body);
    const result = upsert(db, "qualys", KEY, COLS, records);
    json({ ok: true, ...result });
  } catch (e: any) {
    json({ ok: false, error: e?.message ?? String(e) }, 400);
  } finally {
    db.close();
  }
} else if (req.method === "GET") {
  const db = openDb();
  const { where, params } = buildQuery(
    req.query,
    ["findingId", "qid", "priority", "risk", "asset", "service", "ownerEmail", "target", "bug", "securityCentral"],
    ["cve", "title"],
  );
  const limit = clampLimit(req.query);
  const rows = db.query(`SELECT * FROM qualys ${where} ORDER BY findingId LIMIT ?`).all(...params, limit);
  db.close();
  json({ count: rows.length, records: rows });
} else {
  json({ ok: false, error: `Method ${req.method} not allowed` }, 405);
}
