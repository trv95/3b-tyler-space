// Access request form handler.
// Parses the form JSON from the HTTP request body, normalizes it into the
// common request shape, and forwards it to the Process request step, which
// creates the Tines case, posts to Slack, and produces the HTTP response.

type Req = {
  name?: string;
  email?: string;
  system?: string;
  level?: string;
  duration?: string;
  reason?: string;
};

function badRequest(msg: string): string {
  const body = JSON.stringify({ ok: false, error: msg });
  return [
    "HTTP/1.1 400 Error",
    "Content-Type: application/json",
    `Content-Length: ${Buffer.byteLength(body)}`,
    "",
    body,
  ].join("\r\n");
}

// Extract the body from an RFC 7230 HTTP request on stdin.
function parseRequestBody(raw: string): string {
  const idx = raw.indexOf("\r\n\r\n");
  if (idx === -1) return "";
  return raw.slice(idx + 4);
}

async function main() {
  const raw = await Bun.stdin.text();
  const body = parseRequestBody(raw);

  let data: Req;
  try {
    data = JSON.parse(body || "{}");
  } catch {
    process.stdout.write(badRequest("Invalid JSON body"));
    return;
  }

  const name = (data.name || "").trim();
  const email = (data.email || "").trim();
  const reason = (data.reason || "").trim();

  if (!name || !email || !reason) {
    process.stdout.write(badRequest("Missing required fields"));
    return;
  }

  // Forward the normalized request to Process request (the responder).
  process.stdout.write(
    JSON.stringify({
      source: "form",
      name,
      email,
      system: (data.system || "").trim(),
      level: (data.level || "").trim(),
      duration: (data.duration || "").trim(),
      reason,
    }),
  );
}

main();
