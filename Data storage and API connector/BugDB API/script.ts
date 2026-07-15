import { readRequest, json, openDb, buildQuery, clampLimit } from "./lib";

const req = await readRequest();
const db = openDb();

const { where, params } = buildQuery(
  req.query,
  ["bug", "priority", "risk", "status", "product", "component", "ownerEmail", "source", "sourceFinding", "securityCentral"],
  ["cve", "subject"],
);
const limit = clampLimit(req.query);

const rows = db
  .query(`SELECT * FROM bugdb ${where} ORDER BY bug LIMIT ?`)
  .all(...params, limit);

db.close();
json({ count: rows.length, records: rows });
