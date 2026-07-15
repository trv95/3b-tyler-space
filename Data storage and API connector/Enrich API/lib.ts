import { Database } from "bun:sqlite";

export const DB_PATH = "/storage/vulndata/vuln.db";

export type ReqInfo = { method: string; path: string; query: URLSearchParams };

/** Parse the raw RFC 7230 request from stdin into method/path/query. */
export async function readRequest(): Promise<ReqInfo> {
  const raw = await Bun.stdin.text();
  const firstLine = raw.split("\r\n")[0] || raw.split("\n")[0] || "";
  const [method = "GET", target = "/"] = firstLine.split(" ");
  const url = new URL(target, "http://local");
  return { method, path: url.pathname, query: url.searchParams };
}

export function json(body: unknown, status = 200): void {
  const text = JSON.stringify(body, null, 2);
  const reason = status === 200 ? "OK" : status === 400 ? "Bad Request" : status === 404 ? "Not Found" : "Error";
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

export function openDb(): Database {
  return new Database(DB_PATH, { readonly: true });
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
