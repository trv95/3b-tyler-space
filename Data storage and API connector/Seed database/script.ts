import { Database } from "bun:sqlite";
import { unlinkSync } from "node:fs";

// The seed step can be triggered two ways:
//  - manually (stdin empty)
//  - via its HTTP route (stdin is a raw HTTP request)
// Either way we (re)build the SQLite database from the embedded fixture.

const DB_DIR = "/storage/vulndata";
const DB_PATH = `${DB_DIR}/vuln.db`;

// Extract the embedded DATA object from the mock HTML fixture.
const html = await Bun.file(`${import.meta.dir}/mock-data.html`).text();
const raw = html.split("const DATA = ")[1].split(";\n\n    const TABLES")[0];
const DATA = JSON.parse(raw);

await Bun.$`mkdir -p ${DB_DIR}`.quiet();
// Remove any prior DB (including WAL/SHM sidecars) so readers get a clean file.
for (const p of [DB_PATH, `${DB_PATH}-wal`, `${DB_PATH}-shm`, `${DB_PATH}-journal`]) {
  try { unlinkSync(p); } catch {}
}

const db = new Database(DB_PATH, { create: true });
// Use rollback journalling (not WAL) so read-only mounts don't need -shm files.
db.exec("PRAGMA journal_mode = DELETE;");

db.exec(`
  CREATE TABLE owners (
    application TEXT, service TEXT, owner TEXT, ownerEmail TEXT,
    spoc TEXT, spocEmail TEXT, target TEXT, project TEXT, slack TEXT, component TEXT
  );
  CREATE TABLE qualys (
    findingId TEXT, qid TEXT, priority TEXT, risk TEXT, title TEXT, cve TEXT,
    asset TEXT, service TEXT, ownerEmail TEXT, target TEXT, bug TEXT,
    securityCentral TEXT, remediation TEXT
  );
  CREATE TABLE security_central (
    securityCentralId TEXT, severity TEXT, status TEXT, summary TEXT, qid TEXT,
    cve TEXT, resource TEXT, service TEXT, ownerEmail TEXT, bug TEXT,
    region TEXT, reported TEXT
  );
  CREATE TABLE bugdb (
    bug TEXT, priority TEXT, risk TEXT, severity INTEGER, status TEXT, subject TEXT,
    product TEXT, component TEXT, owner TEXT, ownerEmail TEXT, slack TEXT,
    source TEXT, sourceFinding TEXT, securityCentral TEXT, cve TEXT, remediation TEXT
  );
  CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT);
`);

const insertMany = (table: string, cols: string[], rows: any[]) => {
  const placeholders = cols.map((c) => `$${c}`).join(", ");
  const stmt = db.prepare(
    `INSERT INTO ${table} (${cols.join(", ")}) VALUES (${placeholders})`,
  );
  const tx = db.transaction((items: any[]) => {
    for (const r of items) {
      const params: Record<string, any> = {};
      for (const c of cols) params[`$${c}`] = r[c] ?? null;
      stmt.run(params);
    }
  });
  tx(rows);
};

insertMany(
  "owners",
  ["application", "service", "owner", "ownerEmail", "spoc", "spocEmail", "target", "project", "slack", "component"],
  DATA.owners,
);
insertMany(
  "qualys",
  ["findingId", "qid", "priority", "risk", "title", "cve", "asset", "service", "ownerEmail", "target", "bug", "securityCentral", "remediation"],
  DATA.qualys,
);
insertMany(
  "security_central",
  ["securityCentralId", "severity", "status", "summary", "qid", "cve", "resource", "service", "ownerEmail", "bug", "region", "reported"],
  DATA.securityCentral,
);
insertMany(
  "bugdb",
  ["bug", "priority", "risk", "severity", "status", "subject", "product", "component", "owner", "ownerEmail", "slack", "source", "sourceFinding", "securityCentral", "cve", "remediation"],
  DATA.bugdb,
);

const metaStmt = db.prepare("INSERT INTO meta (key, value) VALUES (?, ?)");
for (const [k, v] of Object.entries({
  generatedAt: DATA.generatedAt,
  snapshotBuiltAt: DATA.snapshotBuiltAt,
  classification: DATA.classification,
  schemaVersion: DATA.schemaVersion,
  seededAt: new Date().toISOString(),
})) {
  metaStmt.run(k, String(v));
}

const summary = {
  ok: true,
  seededAt: new Date().toISOString(),
  counts: {
    owners: DATA.owners.length,
    qualys: DATA.qualys.length,
    securityCentral: DATA.securityCentral.length,
    bugdb: DATA.bugdb.length,
  },
};

db.close();

// If invoked over HTTP, respond with a proper HTTP response; otherwise plain JSON.
const stdin = await Bun.stdin.text();
const body = JSON.stringify(summary, null, 2);
if (stdin.startsWith("GET ") || stdin.startsWith("POST ")) {
  process.stdout.write(
    [
      "HTTP/1.1 200 OK",
      "Content-Type: application/json",
      `Content-Length: ${Buffer.byteLength(body)}`,
      "",
      body,
    ].join("\r\n"),
  );
} else {
  console.log(body);
}
