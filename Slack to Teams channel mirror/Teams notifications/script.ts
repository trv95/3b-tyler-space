const CHANNEL_ID = "19:d1c6d30843cf412a806a90988f630ac1@thread.skype";
const CLIENT_STATE = "slack-teams-mirror";

const raw = await Bun.stdin.text();
const sep = raw.indexOf("\r\n\r\n");
const head = sep === -1 ? raw : raw.slice(0, sep);
const body = sep === -1 ? "" : raw.slice(sep + 4);
const requestLine = head.split("\r\n")[0] ?? "";
const target = requestLine.split(" ")[1] ?? "/";

function respond(text: string, contentType: string) {
  const bytes = new TextEncoder().encode(text);
  process.stdout.write(
    `HTTP/1.1 200 OK\r\nContent-Type: ${contentType}\r\nContent-Length: ${bytes.length}\r\n\r\n${text}`,
  );
}

// Graph validates the endpoint by echoing this token back as plain text.
const query = new URLSearchParams(target.includes("?") ? target.slice(target.indexOf("?") + 1) : "");
const validationToken = query.get("validationToken");
if (validationToken) {
  respond(validationToken, "text/plain");
  process.exit(0);
}

let parsed: any = {};
try {
  parsed = JSON.parse(body);
} catch {
  respond("", "text/plain");
  process.exit(0);
}

const notifications = (parsed.value ?? []).filter(
  (n: any) => n.clientState === CLIENT_STATE && typeof n.resource === "string",
);

const messages = notifications
  .filter((n: any) => n.changeType === "created" && n.resource.includes(CHANNEL_ID))
  .map((n: any) => ({ resource: n.resource }));

respond(messages.length ? JSON.stringify({ messages }) : "", "application/json");
