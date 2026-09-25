import { Database } from "bun:sqlite";
import { mkdirSync, rmSync } from "node:fs";

const DIR = "/storage/vulndata";
const DB_PATH = `${DIR}/vuln.db`;

// Extract the embedded DATA object from the fixture HTML.
const html = await Bun.file("mock.html").text();
const m = html.match(/const DATA = (\{[\s\S]*?\});\s*\n/);
if (!m) throw new Error("Could not find DATA object in mock.html");
const data = JSON.parse(m[1]);

mkdirSync(DIR, { recursive: true });
for (const ext of ["", "-wal", "-shm", "-journal"]) {
  try { rmSync(DB_PATH + ext); } catch {}
}
const db = new Database(DB_PATH, { create: true });
db.exec("PRAGMA journal_mode = DELETE;");

db.exec(`
  DROP TABLE IF EXISTS owners;
  DROP TABLE IF EXISTS qualys;
  DROP TABLE IF EXISTS security_central;
  DROP TABLE IF EXISTS bugdb;
  DROP TABLE IF EXISTS meta;

  CREATE TABLE owners (
    application TEXT, service TEXT, owner TEXT, ownerEmail TEXT,
    spoc TEXT, spocEmail TEXT, target TEXT, project TEXT, slack TEXT, component TEXT
  );
  CREATE TABLE qualys (
    findingId TEXT PRIMARY KEY, qid TEXT, priority TEXT, risk TEXT, title TEXT,
    cve TEXT, asset TEXT, service TEXT, ownerEmail TEXT, target TEXT,
    bug TEXT, securityCentral TEXT, remediation TEXT
  );
  CREATE TABLE security_central (
    securityCentralId TEXT PRIMARY KEY, severity TEXT, status TEXT, summary TEXT,
    qid TEXT, cve TEXT, resource TEXT, service TEXT, ownerEmail TEXT,
    bug TEXT, region TEXT, reported TEXT
  );
  CREATE TABLE bugdb (
    bug TEXT PRIMARY KEY, priority TEXT, risk TEXT, severity INTEGER, status TEXT,
    subject TEXT, product TEXT, component TEXT, owner TEXT, ownerEmail TEXT,
    slack TEXT, source TEXT, sourceFinding TEXT, securityCentral TEXT,
    cve TEXT, remediation TEXT
  );
  CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT);
`);

function insertRows(table: string, rows: any[]) {
  if (!rows?.length) return 0;
  const cols = Object.keys(rows[0]);
  const stmt = db.prepare(
    `INSERT OR REPLACE INTO ${table} (${cols.join(",")}) VALUES (${cols.map((c) => "$" + c).join(",")})`,
  );
  const tx = db.transaction((items: any[]) => {
    for (const r of items) {
      const params: Record<string, any> = {};
      for (const c of cols) {
        const v = r[c];
        params["$" + c] = v === undefined || v === null ? null : typeof v === "object" ? JSON.stringify(v) : v;
      }
      stmt.run(params);
    }
  });
  tx(rows);
  return rows.length;
}

const counts = {
  owners: insertRows("owners", data.owners),
  qualys: insertRows("qualys", data.qualys),
  security_central: insertRows("security_central", data.securityCentral),
  bugdb: insertRows("bugdb", data.bugdb),
};

const metaEntries: [string, unknown][] = [
  ["generatedAt", data.generatedAt],
  ["snapshotBuiltAt", data.snapshotBuiltAt],
  ["classification", data.classification],
  ["schemaVersion", data.schemaVersion],
  ["productionDataInOutput", data.productionDataInOutput],
  ["counts", data.counts],
  ["priorityCounts", data.priorityCounts],
  ["severityCounts", data.severityCounts],
];
const metaStmt = db.prepare("INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)");
for (const [k, v] of metaEntries) {
  metaStmt.run(k, typeof v === "object" ? JSON.stringify(v) : String(v));
}

db.close();

console.error(`Seeded ${DB_PATH}`, counts);
console.log(JSON.stringify({ ok: true, db: DB_PATH, counts }));
