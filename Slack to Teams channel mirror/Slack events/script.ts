const SLACK_CHANNEL = "C0C096CMZ5Z";

const raw = await Bun.stdin.text();
const sep = raw.indexOf("\r\n\r\n");
const body = sep === -1 ? "" : raw.slice(sep + 4);

function respond(payload: unknown | null, contentType = "application/json") {
  const text = payload === null ? "" : typeof payload === "string" ? payload : JSON.stringify(payload);
  const bytes = new TextEncoder().encode(text);
  process.stdout.write(
    `HTTP/1.1 200 OK\r\nContent-Type: ${contentType}\r\nContent-Length: ${bytes.length}\r\n\r\n${text}`,
  );
}

let event: any = {};
try {
  event = JSON.parse(body);
} catch {
  respond(null, "text/plain");
  process.exit(0);
}

// Slack's one-time endpoint handshake.
if (event.type === "url_verification") {
  respond(String(event.challenge ?? ""), "text/plain");
  process.exit(0);
}

const inner = event.event ?? {};
const mirrorable =
  event.type === "event_callback" &&
  inner.type === "message" &&
  inner.channel === SLACK_CHANNEL &&
  !inner.bot_id &&
  !inner.subtype &&
  typeof inner.text === "string" &&
  inner.text.length > 0;

if (!mirrorable) {
  respond(null, "text/plain");
  process.exit(0);
}

// The response body doubles as this step's output: the downstream mirror step
// reads everything after the header separator.
respond({
  ts: inner.ts,
  thread_ts: inner.thread_ts ?? null,
  user: inner.user ?? null,
  text: inner.text,
});
