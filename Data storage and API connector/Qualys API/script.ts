import { readRequest, json, openDb, buildQuery, clampLimit } from "./lib";

const req = await readRequest();
const db = openDb();

const { where, params } = buildQuery(
  req.query,
  ["service", "ownerEmail", "priority", "risk", "qid", "bug", "findingId", "target", "asset"],
  ["cve", "title"],
);
const limit = clampLimit(req.query);

const rows = db
  .query(`SELECT * FROM qualys ${where} ORDER BY findingId LIMIT ?`)
  .all(...params, limit);

db.close();
json({ count: rows.length, records: rows });
