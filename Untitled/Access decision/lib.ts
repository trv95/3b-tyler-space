// Shared helpers + config for the Access decision step.

export const TINES_URL = process.env.TINES_URL ?? "";

// ---- Tenant-specific configuration ----
export const TINES_TEAM_ID = "19060";

// Okta org base URL (SSWS auth injected by the Okta connector).
// TODO(human): set to your Okta org, e.g. "https://acme.okta.com".
export const OKTA_ORG_URL = "https://example.okta.com";

// Jira Cloud base URL (basic auth injected by the Jira connector).
// TODO(human): set to your Jira site, e.g. "https://acme.atlassian.net".
export const JIRA_BASE_URL = "https://example.atlassian.net";
// Jira products granted to new users (see export: "jira-servicedesk").
export const JIRA_PRODUCTS = ["jira-servicedesk"];

export const SPACE_HOST = "tyler-space.se-demo.3b.run";

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

export interface ParsedRequest {
  method: string;
  path: string;
  query: URLSearchParams;
  headers: Record<string, string>;
  body: string;
}

export function parseHttpRequest(raw: string): ParsedRequest {
  const sepIdx = raw.indexOf("\r\n\r\n");
  const headPart = sepIdx === -1 ? raw : raw.slice(0, sepIdx);
  const body = sepIdx === -1 ? "" : raw.slice(sepIdx + 4);
  const lines = headPart.split("\r\n");
  const requestLine = lines.shift() ?? "";
  const [method = "GET", target = "/"] = requestLine.split(" ");
  const headers: Record<string, string> = {};
  for (const line of lines) {
    const i = line.indexOf(":");
    if (i > 0) headers[line.slice(0, i).trim().toLowerCase()] = line.slice(i + 1).trim();
  }
  const url = new URL(target, `https://${SPACE_HOST}`);
  return { method: method.toUpperCase(), path: url.pathname, query: url.searchParams, headers, body };
}

export function html(status: number, statusText: string, body: string): string {
  const bytes = Buffer.byteLength(body);
  return [
    `HTTP/1.1 ${status} ${statusText}`,
    "Content-Type: text/html; charset=utf-8",
    `Content-Length: ${bytes}`,
    "Connection: close",
    "",
    body,
  ].join("\r\n");
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

export async function slack(method: string, payload: unknown): Promise<any> {
  const res = await fetch(`https://slack.com/api/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify(payload),
  });
  const data = (await res.json()) as any;
  if (!data.ok) throw new Error(`Slack ${method} error: ${data.error}`);
  return data;
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

export function fmtTime(iso: string): string {
  return new Date(iso).toUTCString();
}

const PAGE_CSS = `
  body { margin:0; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
    background:linear-gradient(160deg,#f4f2ff,#eceafc); min-height:100vh; display:grid; place-items:center; color:#1c1b29; }
  .card { background:#fff; border-radius:20px; padding:44px; max-width:460px; text-align:center;
    box-shadow:0 24px 60px -30px rgba(76,60,180,.45); border:1px solid #ece9fb; margin:24px; }
  .icon { width:66px; height:66px; border-radius:50%; display:grid; place-items:center; margin:0 auto 20px; font-size:32px; }
  .ok { background:#e6f8ee; } .no { background:#fdecec; } .warn { background:#fff5e6; }
  h1 { font-size:23px; margin:0 0 8px; } p { color:#6b6a7c; line-height:1.55; margin:0; }
`;

export function resultPage(kind: "ok" | "no" | "warn", title: string, message: string): string {
  const icon = kind === "ok" ? "✓" : kind === "no" ? "✕" : "!";
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>
<style>${PAGE_CSS}</style></head><body><div class="card">
<div class="icon ${kind}">${icon}</div><h1>${title}</h1><p>${message}</p></div></body></html>`;
}
