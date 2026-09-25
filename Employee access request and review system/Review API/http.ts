export type ParsedRequest = {
  method: string;
  path: string;
  query: URLSearchParams;
  headers: Record<string, string>;
  body: string;
};

export async function readStdin(): Promise<string> {
  return await new Response(Bun.stdin.stream()).text();
}

export function parseHttpRequest(raw: string): ParsedRequest | null {
  const match = raw.match(/^([A-Z]+) (\S+) HTTP\/\d(?:\.\d)?\r?\n/);
  if (!match) return null;
  const separator = raw.indexOf("\r\n\r\n");
  const headerBlock = separator === -1 ? raw : raw.slice(0, separator);
  const body = separator === -1 ? "" : raw.slice(separator + 4);
  const headers: Record<string, string> = {};
  for (const line of headerBlock.split(/\r?\n/).slice(1)) {
    const idx = line.indexOf(":");
    if (idx > 0) headers[line.slice(0, idx).trim().toLowerCase()] = line.slice(idx + 1).trim();
  }
  const url = new URL(match[2], "http://internal");
  return { method: match[1], path: url.pathname, query: url.searchParams, headers, body };
}

function respond(status: number, statusText: string, contentType: string, body: string): string {
  const bytes = Buffer.byteLength(body);
  return [
    `HTTP/1.1 ${status} ${statusText}`,
    `content-type: ${contentType}`,
    `content-length: ${bytes}`,
    "cache-control: no-store",
    "",
    body,
  ].join("\r\n");
}

const STATUS_TEXT: Record<number, string> = {
  200: "OK",
  201: "Created",
  400: "Bad Request",
  401: "Unauthorized",
  403: "Forbidden",
  404: "Not Found",
  405: "Method Not Allowed",
  409: "Conflict",
  410: "Gone",
  500: "Internal Server Error",
};

export function jsonResponse(status: number, payload: unknown): string {
  return respond(status, STATUS_TEXT[status] ?? "OK", "application/json; charset=utf-8", JSON.stringify(payload));
}

export function htmlResponse(status: number, html: string): string {
  return respond(status, STATUS_TEXT[status] ?? "OK", "text/html; charset=utf-8", html);
}

export function routeBase(): string {
  const branch = process.env._3B_BRANCH_ID;
  const host = "https://tyler-space.se-demo.3b.run";
  return branch ? `${host}/__3b/branch/${branch}` : host;
}
