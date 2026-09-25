import { Database } from "bun:sqlite";

const source = "/storage/access_state/state.db";

let database: Database | null = null;
if (await Bun.file(source).exists()) {
  const snapshot = "/tmp/access-state.db";
  await Bun.write(snapshot, Bun.file(source));
  database = new Database(snapshot, { readonly: true });
}
export const db = database;

export function all<T = Record<string, unknown>>(sql: string, ...params: unknown[]): T[] {
  if (!db) return [];
  return db.query(sql).all(...(params as never[])) as T[];
}
