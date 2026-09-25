// Slack slash command handler for /access-request.
// Slack POSTs an application/x-www-form-urlencoded body. The command text is
// parsed as pipe-separated args:  system | level | duration | reason
// The invoking Slack user becomes the requester. Normalizes and forwards to
// Process request, which creates the case, posts to Slack, and responds.

function parseRequestBody(raw: string): string {
  const idx = raw.indexOf("\r\n\r\n");
  if (idx === -1) return "";
  return raw.slice(idx + 4);
}

function ephemeral(text: string): string {
  const body = JSON.stringify({ response_type: "ephemeral", text });
  return [
    "HTTP/1.1 200 OK",
    "Content-Type: application/json",
    `Content-Length: ${Buffer.byteLength(body)}`,
    "",
    body,
  ].join("\r\n");
}

async function main() {
  const raw = await Bun.stdin.text();
  const body = parseRequestBody(raw);
  const params = new URLSearchParams(body);

  const text = (params.get("text") || "").trim();
  const userName = params.get("user_name") || "";
  const userId = params.get("user_id") || "";

  if (!text) {
    // No args: guide the user on the expected format.
    process.stdout.write(
      ephemeral(
        "Usage: `/access-request <system> | <access level> | <duration> | <reason>`\n" +
          "Example: `/access-request AWS Production | Admin | 30 days | Deploying the new billing service`",
      ),
    );
    return;
  }

  const parts = text.split("|").map((p) => p.trim());
  const [system = "", level = "", duration = "", ...rest] = parts;
  const reason = rest.join(" | ").trim();

  const name = userName || userId || "Slack user";

  // Forward the normalized request to Process request (the responder).
  process.stdout.write(
    JSON.stringify({
      source: "slash",
      name,
      email: "",
      system,
      level,
      duration,
      reason,
    }),
  );
}

main();
