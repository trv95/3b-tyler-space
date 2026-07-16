import { readRequest, json, openDb, buildQuery, clampLimit, parseRecords, upsert } from "./lib";

const COLS = ["bug", "priority", "risk", "severity", "status", "subject", "product", "component", "owner", "ownerEmail", "slack", "source", "sourceFinding", "securityCentral", "cve", "remediation"];
const KEY = "bug";

const req = await readRequest();

if (req.method === "POST") {
  const db = openDb(false);
  try {
    const records = parseRecords(req.body);
    const result = upsert(db, "bugdb", KEY, COLS, records);
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
    ["bug", "priority", "risk", "status", "product", "component", "ownerEmail", "source", "sourceFinding", "securityCentral"],
    ["cve", "subject"],
  );
  const limit = clampLimit(req.query);
  const rows = db.query(`SELECT * FROM bugdb ${where} ORDER BY bug LIMIT ?`).all(...params, limit);
  db.close();
  json({ count: rows.length, records: rows });
} else {
  json({ ok: false, error: `Method ${req.method} not allowed` }, 405);
}
