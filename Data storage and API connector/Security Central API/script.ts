import { readRequest, json, openDb, buildQuery, clampLimit } from "./lib";

const req = await readRequest();
const db = openDb();

const { where, params } = buildQuery(
  req.query,
  ["service", "ownerEmail", "severity", "status", "qid", "bug", "securityCentralId", "resource", "region"],
  ["cve", "summary"],
);
const limit = clampLimit(req.query);

const rows = db
  .query(`SELECT * FROM security_central ${where} ORDER BY securityCentralId LIMIT ?`)
  .all(...params, limit);

db.close();
json({ count: rows.length, records: rows });
