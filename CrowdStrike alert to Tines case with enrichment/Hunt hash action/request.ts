export type ParsedRequest = {
  method: string;
  params: URLSearchParams;
  headers: Record<string, string>;
  body: string;
  json: any;
};

export async function readRequest(): Promise<ParsedRequest> {
  const raw = await Bun.stdin.text();
  const separator = raw.indexOf("\r\n\r\n");
  const head = separator === -1 ? raw : raw.slice(0, separator);
  const body = separator === -1 ? "" : raw.slice(separator + 4);

  const lines = head.split("\r\n");
  const [method = "GET", target = "/"] = lines[0]?.split(" ") ?? [];

  const headers: Record<string, string> = {};
  for (const line of lines.slice(1)) {
    const colon = line.indexOf(":");
    if (colon > 0) headers[line.slice(0, colon).trim().toLowerCase()] = line.slice(colon + 1).trim();
  }

  let json: any;
  try {
    json = body.trim() ? JSON.parse(body) : undefined;
  } catch {
    json = undefined;
  }

  return {
    method,
    params: new URL(target, "http://localhost").searchParams,
    headers,
    body,
    json,
  };
}

const EMAIL_KEYS = ["email", "user_email", "actor_email", "triggered_by", "clicked_by", "requester_email"];

export function findActor(payload: any, headers: Record<string, string>): string {
  const fromHeader = headers["x-3b-authenticated-email"] || headers["email"];
  if (fromHeader) return fromHeader;

  const seen = new Set<any>();
  const walk = (value: any): string | undefined => {
    if (!value || typeof value !== "object" || seen.has(value)) return undefined;
    seen.add(value);
    for (const [key, child] of Object.entries(value)) {
      if (typeof child === "string" && EMAIL_KEYS.includes(key) && child.includes("@")) return child;
      const nested = walk(child);
      if (nested) return nested;
    }
    return undefined;
  };

  return walk(payload) ?? "unknown (case action clicked in Tines)";
}

export function httpResponse(status: string, body: string): string {
  return [
    `HTTP/1.1 ${status}`,
    "Content-Type: application/json",
    `Content-Length: ${Buffer.byteLength(body)}`,
    "",
    body,
  ].join("\r\n");
}
