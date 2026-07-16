import { readRequest, json, openDb, buildQuery, clampLimit, parseRecords, upsert } from "./lib";

const COLS = ["securityCentralId", "severity", "status", "summary", "qid", "cve", "resource", "service", "ownerEmail", "bug", "region", "reported"];
const KEY = "securityCentralId";

const req = await readRequest();

if (req.method === "POST") {
  const db = openDb(false);
  try {
    const records = parseRecords(req.body);
    const result = upsert(db, "security_central", KEY, COLS, records);
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
    ["securityCentralId", "severity", "status", "qid", "resource", "service", "ownerEmail", "bug", "region"],
    ["cve", "summary"],
  );
  const limit = clampLimit(req.query);
  const rows = db.query(`SELECT * FROM security_central ${where} ORDER BY securityCentralId LIMIT ?`).all(...params, limit);
  db.close();
  json({ count: rows.length, records: rows });
} else {
  json({ ok: false, error: `Method ${req.method} not allowed` }, 405);
}
