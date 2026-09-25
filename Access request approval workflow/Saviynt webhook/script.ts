// Saviynt webhook notification handler.
// Saviynt can POST a JSON notification when an access request is raised. Field
// names vary by Saviynt configuration, so this maps a range of common keys
// defensively, normalizes the request, and forwards it to Process request,
// which creates the Tines case, posts to Slack, and responds.

function parseRequestBody(raw: string): string {
  const idx = raw.indexOf("\r\n\r\n");
  if (idx === -1) return "";
  return raw.slice(idx + 4);
}

function ok(bodyObj: unknown): string {
  const body = JSON.stringify(bodyObj);
  return [
    "HTTP/1.1 200 OK",
    "Content-Type: application/json",
    `Content-Length: ${Buffer.byteLength(body)}`,
    "",
    body,
  ].join("\r\n");
}

// Pick the first non-empty string among candidate keys (case-insensitive),
// searching the top level and one level of nesting.
function pick(obj: Record<string, any>, keys: string[]): string {
  const lower: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) lower[k.toLowerCase()] = v;
  for (const key of keys) {
    const v = lower[key.toLowerCase()];
    if (typeof v === "string" && v.trim()) return v.trim();
    if (typeof v === "number") return String(v);
  }
  return "";
}

async function main() {
  const raw = await Bun.stdin.text();
  const body = parseRequestBody(raw);

  let data: Record<string, any>;
  try {
    data = JSON.parse(body || "{}");
  } catch {
    process.stdout.write(ok({ ok: false, error: "Invalid JSON body" }));
    return;
  }

  // Saviynt often nests the payload under `requestData` / `eventData` / `request`.
  const src = { ...data, ...(data.requestData || data.eventData || data.request || {}) };

  const name = pick(src, ["user", "username", "userName", "requestor", "requestedFor", "beneficiary", "displayName"]) || "Saviynt user";
  const email = pick(src, ["email", "userEmail", "emailAddress", "requestorEmail"]);
  const system = pick(src, ["endpoint", "endpointName", "system", "application", "securitySystem", "resource"]);
  const level = pick(src, ["entitlement", "entitlementValue", "accessLevel", "role", "entitlementName"]);
  const duration = pick(src, ["duration", "validUntil", "endDate", "expiryDate", "accessDuration"]);
  const reason = pick(src, ["justification", "businessJustification", "reason", "comments", "description"]);

  // Forward the normalized request to Process request (the responder).
  process.stdout.write(
    JSON.stringify({
      source: "saviynt",
      name,
      email,
      system,
      level,
      duration,
      reason,
    }),
  );
}

main();
