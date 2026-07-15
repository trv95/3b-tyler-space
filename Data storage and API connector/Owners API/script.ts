import { readRequest, json, openDb, buildQuery, clampLimit } from "./lib";

const req = await readRequest();
const db = openDb();

const { where, params } = buildQuery(
  req.query,
  ["service", "ownerEmail", "target", "application", "project"],
);
const limit = clampLimit(req.query);

const rows = db
  .query(`SELECT * FROM owners ${where} ORDER BY service LIMIT ?`)
  .all(...params, limit);

db.close();
json({ count: rows.length, records: rows });
