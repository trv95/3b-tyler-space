// Config + helpers for the Revoke expired access cron step.

export const TINES_URL = process.env.TINES_URL ?? "";

// Must match the values in the Access decision step.
export const OKTA_ORG_URL = "https://example.okta.com";
export const JIRA_BASE_URL = "https://example.atlassian.net";

export interface RequestState {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  duration_minutes: number;
  reasoning: string;
  apps: string[];
  case_id: number;
  record_id: number;
  status: "pending" | "approved" | "denied" | "revoked";
  created_at: string;
  expires_at: string | null;
  provisioned: {
    Okta?: { userId: string };
    Jira?: { accountId: string };
    Tines?: { userId: string | number };
  };
}

export async function tines(path: string, method: string, payload?: unknown): Promise<any> {
  const res = await fetch(`${TINES_URL}${path}`, {
    method,
    headers: { "content-type": "application/json" },
    body: payload === undefined ? undefined : JSON.stringify(payload),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Tines ${method} ${path} -> ${res.status}: ${text}`);
  return text ? JSON.parse(text) : {};
}

export function caseDescription(s: RequestState, statusLine: string): string {
  return [
    "A user has requested temporary access to the selected tool",
    "",
    "| Field | Value |",
    "|-------|-------|",
    `| **Name** | ${s.first_name} ${s.last_name} |`,
    `| **Email** | ${s.email} |`,
    `| **Application** | ${s.apps.join(", ")} |`,
    `| **Reasoning** | ${s.reasoning} |`,
    `| **Time (minutes)** | ${s.duration_minutes} |`,
    `| **Status** | ${statusLine} |`,
  ].join("\n");
}

// ---- Per-app revocation (mirrors the Tines "revoke" branches) ----

export async function revokeOkta(userId: string): Promise<void> {
  // Deactivate, then delete (Okta requires deactivation before deletion).
  const deact = await fetch(`${OKTA_ORG_URL}/api/v1/users/${userId}/lifecycle/deactivate`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
  });
  if (!deact.ok && deact.status !== 404) {
    throw new Error(`Okta deactivate ${userId} -> ${deact.status}: ${await deact.text()}`);
  }
  const del = await fetch(`${OKTA_ORG_URL}/api/v1/users/${userId}`, {
    method: "DELETE",
    headers: { accept: "application/json" },
  });
  if (!del.ok && del.status !== 404) {
    throw new Error(`Okta delete ${userId} -> ${del.status}: ${await del.text()}`);
  }
}

export async function revokeJira(accountId: string): Promise<void> {
  const res = await fetch(`${JIRA_BASE_URL}/rest/api/3/user?accountId=${encodeURIComponent(accountId)}`, {
    method: "DELETE",
    headers: { accept: "application/json" },
  });
  if (!res.ok && res.status !== 404) {
    throw new Error(`Jira delete ${accountId} -> ${res.status}: ${await res.text()}`);
  }
}

export async function revokeTines(userId: string | number): Promise<void> {
  const res = await fetch(`${TINES_URL}/api/v1/admin/users/${userId}`, {
    method: "DELETE",
    headers: { "content-type": "application/json" },
  });
  if (!res.ok && res.status !== 404) {
    throw new Error(`Tines delete user ${userId} -> ${res.status}: ${await res.text()}`);
  }
}
