import { Database } from "bun:sqlite";

export const db = new Database("/storage/access_state/state.db", { create: true });
db.exec("PRAGMA journal_mode = WAL");
db.exec(`
CREATE TABLE IF NOT EXISTS requests (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  requester_email TEXT NOT NULL,
  requester_name TEXT,
  employee_id TEXT,
  department TEXT,
  job_title TEXT,
  manager_name TEXT,
  manager_email TEXT,
  system TEXT NOT NULL,
  access_level TEXT NOT NULL,
  justification TEXT,
  status TEXT NOT NULL,
  approver_email TEXT,
  approver_channel TEXT,
  escalated INTEGER NOT NULL DEFAULT 0,
  decision_token TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  decided_at TEXT,
  decided_by TEXT,
  decision_note TEXT
);
CREATE TABLE IF NOT EXISTS grants (
  id TEXT PRIMARY KEY,
  request_id TEXT NOT NULL,
  employee_email TEXT NOT NULL,
  employee_name TEXT,
  department TEXT,
  job_title TEXT,
  manager_email TEXT,
  system TEXT NOT NULL,
  access_level TEXT NOT NULL,
  granted_at TEXT NOT NULL,
  status TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS review_cycles (
  id TEXT PRIMARY KEY,
  opened_at TEXT NOT NULL,
  closed_at TEXT,
  status TEXT NOT NULL,
  grant_count INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS attestations (
  id TEXT PRIMARY KEY,
  cycle_id TEXT NOT NULL,
  grant_id TEXT NOT NULL,
  reviewer_email TEXT NOT NULL,
  decision TEXT NOT NULL,
  note TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS revocation_cases (
  id TEXT PRIMARY KEY,
  grant_id TEXT NOT NULL UNIQUE,
  cycle_id TEXT,
  tines_case_id TEXT,
  case_url TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  at TEXT NOT NULL,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id TEXT,
  detail TEXT
);
CREATE INDEX IF NOT EXISTS idx_requests_dedupe ON requests (requester_email, system, access_level, status);
CREATE INDEX IF NOT EXISTS idx_grants_status ON grants (status);
`);

export const now = () => new Date().toISOString();
export const uid = (prefix: string) => `${prefix}_${crypto.randomUUID().replaceAll("-", "").slice(0, 12)}`;

export function audit(
  actor: string,
  action: string,
  entity: string,
  entityId: string | null,
  detail: unknown = null,
) {
  db.query(
    "INSERT INTO audit_log (at, actor, action, entity, entity_id, detail) VALUES (?, ?, ?, ?, ?, ?)",
  ).run(now(), actor, action, entity, entityId, detail == null ? null : JSON.stringify(detail));
}
