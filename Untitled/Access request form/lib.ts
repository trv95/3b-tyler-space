// Shared helpers for the Access request form step.

export const TINES_URL = process.env.TINES_URL ?? "";
export const BRANCH_ID = process.env._3B_BRANCH_ID ?? "";

// ---- Tenant-specific configuration (from the Tines export) ----
// Tines team that Cases/Records are created in.
export const TINES_TEAM_ID = "19060";
// "Access Request" record type + its user-defined field ids (from the export).
export const RECORD_TYPE_ID = 10822;
export const RECORD_FIELD_USER = 30594; // "User"
export const RECORD_FIELD_TOOL = 30595; // "Tool"
export const RECORD_FIELD_STATUS = 107817; // "Status"

// Slack channel that approval requests are posted to.
export const APPROVER_CHANNEL = "#3b-demo";

// Public host serving this workflow's routes.
export const SPACE_HOST = "tyler-space.se-demo.3b.run";
// Decision route path + its external_id (minted by the platform, filled in below).
export const DECISION_PATH = "/access-decision";
export const DECISION_EXTERNAL_ID = "__FILL_AFTER_MINT__";

export const APPS = ["Tines", "Okta", "Jira"] as const;

export interface ParsedRequest {
  method: string;
  path: string;
  query: URLSearchParams;
  headers: Record<string, string>;
  body: string;
}

// Parse a raw RFC 7230 HTTP request from stdin.
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

export function httpResponse(
  status: number,
  statusText: string,
  contentType: string,
  body: string,
): string {
  const bytes = Buffer.byteLength(body);
  return [
    `HTTP/1.1 ${status} ${statusText}`,
    `Content-Type: ${contentType}`,
    `Content-Length: ${bytes}`,
    "Connection: close",
    "",
    body,
  ].join("\r\n");
}

export function html(status: number, statusText: string, body: string): string {
  return httpResponse(status, statusText, "text/html; charset=utf-8", body);
}

// Build the absolute URL a Slack button links to for an approval decision.
export function decisionUrl(id: string, decision: "yes" | "no"): string {
  const params = new URLSearchParams({
    external_id: DECISION_EXTERNAL_ID,
    id,
    decision,
  });
  if (BRANCH_ID) params.set("branch", BRANCH_ID);
  return `https://${SPACE_HOST}${DECISION_PATH}?${params.toString()}`;
}
