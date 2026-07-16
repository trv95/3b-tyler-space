import { Database } from "bun:sqlite";

export const DB_PATH = "/storage/vulndata/vuln.db";

export type ReqInfo = { method: string; path: string; query: URLSearchParams; body: string };

/** Parse the raw RFC 7230 request from stdin into method/path/query/body. */
export async function readRequest(): Promise<ReqInfo> {
  const raw = await Bun.stdin.text();
  const sep = raw.indexOf("\r\n\r\n") !== -1 ? "\r\n\r\n" : "\n\n";
  const headerPart = raw.split(sep)[0] || "";
  const body = raw.slice(headerPart.length + sep.length);
  const firstLine = headerPart.split(/\r?\n/)[0] || "";
  const [method = "GET", target = "/"] = firstLine.split(" ");
  const url = new URL(target, "http://local");
  return { method, path: url.pathname, query: url.searchParams, body };
}

export function json(body: unknown, status = 200): void {
  const text = JSON.stringify(body, null, 2);
  const reason =
    status === 200 ? "OK"
    : status === 400 ? "Bad Request"
    : status === 404 ? "Not Found"
    : status === 405 ? "Method Not Allowed"
    : "Error";
  process.stdout.write(
    [
      `HTTP/1.1 ${status} ${reason}`,
      "Content-Type: application/json",
      `Content-Length: ${Buffer.byteLength(text)}`,
      "",
      text,
    ].join("\r\n"),
  );
}

export function openDb(readonly = true): Database {
  return new Database(DB_PATH, readonly ? { readonly: true } : { readwrite: true });
}

/**
 * Build a WHERE clause from allowed filters.
 * exact filters match with =, like filters match with LIKE %..%.
 */
export function buildQuery(
  q: URLSearchParams,
  exact: string[],
  like: string[] = [],
): { where: string; params: any[] } {
  const clauses: string[] = [];
  const params: any[] = [];
  for (const f of exact) {
    const v = q.get(f);
    if (v !== null && v !== "") {
      clauses.push(`${f} = ?`);
      params.push(v);
    }
  }
  for (const f of like) {
    const v = q.get(f);
    if (v !== null && v !== "") {
      clauses.push(`${f} LIKE ?`);
      params.push(`%${v}%`);
    }
  }
  return { where: clauses.length ? `WHERE ${clauses.join(" AND ")}` : "", params };
}

export function clampLimit(q: URLSearchParams, def = 100, max = 500): number {
  const n = parseInt(q.get("limit") || "", 10);
  if (Number.isNaN(n) || n <= 0) return def;
  return Math.min(n, max);
}

/** Parse a POST body into an array of records. Accepts a single object or { records: [...] }. */
export function parseRecords(body: string): any[] {
  const trimmed = (body || "").trim();
  if (!trimmed) throw new Error("Request body is empty");
  let parsed: any;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    throw new Error("Request body is not valid JSON");
  }
  const records = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed?.records)
      ? parsed.records
      : [parsed];
  if (records.length === 0) throw new Error("No records provided");
  for (const r of records) {
    if (typeof r !== "object" || r === null || Array.isArray(r)) {
      throw new Error("Each record must be a JSON object");
    }
  }
  return records;
}

export type UpsertResult = { inserted: number; updated: number; keys: any[] };

/**
 * Insert-or-update records into `table`, keyed on `keyCol`.
 * Only columns in `allowedCols` are written; unknown fields are ignored.
 * Each record must include a non-empty `keyCol`.
 */
export function upsert(
  db: Database,
  table: string,
  keyCol: string,
  allowedCols: string[],
  records: any[],
): UpsertResult {
  const result: UpsertResult = { inserted: 0, updated: 0, keys: [] };
  const findStmt = db.prepare(`SELECT COUNT(*) AS n FROM ${table} WHERE ${keyCol} = ?`);

  const tx = db.transaction((items: any[]) => {
    for (const r of items) {
      const key = r[keyCol];
      if (key === undefined || key === null || key === "") {
        throw new Error(`Each record must include a non-empty "${keyCol}"`);
      }
      const cols = allowedCols.filter((c) => c in r);
      if (!cols.includes(keyCol)) cols.push(keyCol);

      const existing = (findStmt.get(key) as { n: number }).n > 0;
      if (existing) {
        const setCols = cols.filter((c) => c !== keyCol);
        if (setCols.length > 0) {
          const setClause = setCols.map((c) => `${c} = ?`).join(", ");
          db.prepare(`UPDATE ${table} SET ${setClause} WHERE ${keyCol} = ?`).run(
            ...setCols.map((c) => r[c] ?? null),
            key,
          );
        }
        result.updated++;
      } else {
        const placeholders = cols.map(() => "?").join(", ");
        db.prepare(`INSERT INTO ${table} (${cols.join(", ")}) VALUES (${placeholders})`).run(
          ...cols.map((c) => r[c] ?? null),
        );
        result.inserted++;
      }
      result.keys.push(key);
    }
  });
  tx(records);
  return result;
}
