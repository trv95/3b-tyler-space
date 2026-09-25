import { Database } from "bun:sqlite";

const DB_PATH = "/storage/vulndata/vuln.db";

const TABLES: Record<string, string> = {
  owners: "owners",
  qualys: "qualys",
  security_central: "security_central",
  securityCentral: "security_central",
  bugdb: "bugdb",
};

// ---- Parse the raw HTTP request from stdin ----
const raw = await Bun.stdin.text();
const headerEnd = raw.indexOf("\r\n\r\n");
const head = headerEnd === -1 ? raw : raw.slice(0, headerEnd);
const body = headerEnd === -1 ? "" : raw.slice(headerEnd + 4);
const [requestLine = "GET / HTTP/1.1"] = head.split("\r\n");
const [method = "GET", target = "/"] = requestLine.split(" ");
const url = new URL(target, "http://x");
const q = url.searchParams;

function respond(status: number, obj: unknown) {
  const bodyStr = JSON.stringify(obj, null, 2);
  const bytes = Buffer.byteLength(bodyStr);
  process.stdout.write(
    [
      `HTTP/1.1 ${status} ${status === 200 ? "OK" : "Error"}`,
      "Content-Type: application/json",
      `Content-Length: ${bytes}`,
      "",
      bodyStr,
    ].join("\r\n"),
  );
}

let db: Database;
try {
  db = new Database(DB_PATH, { readonly: true });
} catch {
  respond(503, { error: "Database not seeded yet. Run the 'Seed database' step first." });
  process.exit(0);
}

try {
  // Raw read-only SQL via POST { "sql": "SELECT ..." } or ?sql=
  const sql = method === "POST" && body.trim() ? (JSON.parse(body).sql as string) : q.get("sql");
  if (sql) {
    if (!/^\s*(select|with)\b/i.test(sql) || /;\s*\S/.test(sql.trim())) {
      respond(400, { error: "Only a single read-only SELECT/WITH statement is allowed." });
    } else {
      const rows = db.query(sql).all();
      respond(200, { count: rows.length, rows });
    }
    process.exit(0);
  }

  const table = q.get("table");

  // No table -> overview
  if (!table) {
    const meta: Record<string, unknown> = {};
    for (const { key, value } of db.query("SELECT key, value FROM meta").all() as any[]) {
      try {
        meta[key] = JSON.parse(value);
      } catch {
        meta[key] = value;
      }
    }
    const counts: Record<string, number> = {};
    for (const t of ["owners", "qualys", "security_central", "bugdb"]) {
      counts[t] = (db.query(`SELECT COUNT(*) c FROM ${t}`).get() as any).c;
    }
    respond(200, {
      description: "Sample vulnerability dataset. Query a table with ?table=, filter with ?search=/?priority=/?service=/?ownerEmail=, or run read-only SQL via ?sql= or POST { sql }.",
      tables: Object.keys(counts),
      counts,
      meta,
    });
    process.exit(0);
  }

  const realTable = TABLES[table];
  if (!realTable) {
    respond(400, { error: `Unknown table '${table}'. Valid: ${Object.keys(TABLES).join(", ")}` });
    process.exit(0);
  }

  // Column names for this table
  const cols = (db.query(`PRAGMA table_info(${realTable})`).all() as any[]).map((c) => c.name);

  const where: string[] = [];
  const params: Record<string, string> = {};

  // Exact-match filters on any real column
  for (const [key, val] of q.entries()) {
    if (["table", "search", "limit", "offset", "sql"].includes(key)) continue;
    if (cols.includes(key)) {
      where.push(`${key} = $${key}`);
      params[`$${key}`] = val;
    }
  }

  // Free-text search across all columns
  const search = q.get("search");
  if (search) {
    where.push("(" + cols.map((c) => `CAST(${c} AS TEXT) LIKE $search`).join(" OR ") + ")");
    params["$search"] = `%${search}%`;
  }

  const limit = Math.min(parseInt(q.get("limit") || "500", 10) || 500, 1000);
  const offset = parseInt(q.get("offset") || "0", 10) || 0;

  const whereSql = where.length ? "WHERE " + where.join(" AND ") : "";
  const total = (db.query(`SELECT COUNT(*) c FROM ${realTable} ${whereSql}`).get(params) as any).c;
  const rows = db
    .query(`SELECT * FROM ${realTable} ${whereSql} LIMIT ${limit} OFFSET ${offset}`)
    .all(params);

  respond(200, { table: realTable, total, count: rows.length, limit, offset, rows });
} catch (err: any) {
  respond(400, { error: String(err?.message || err) });
}
