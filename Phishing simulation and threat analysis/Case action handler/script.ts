const raw = await Bun.stdin.text();
const separator = raw.indexOf("\r\n\r\n");
const head = separator === -1 ? raw : raw.slice(0, separator);
const rawBody = separator === -1 ? "" : raw.slice(separator + 4);
const lines = head.split("\r\n");
const requestTarget = lines[0]?.split(" ")[1] ?? "/";
const headers = new Map<string, string>();
for (const line of lines.slice(1)) {
  const i = line.indexOf(":");
  if (i > 0) headers.set(line.slice(0, i).trim().toLowerCase(), line.slice(i + 1).trim());
}
const method = (lines[0]?.split(" ")[0] ?? "GET").toUpperCase();
const query = new URL(requestTarget, "https://placeholder.invalid").searchParams;

// The Tines case action button is clicked in the browser, so the request is cross-origin:
// without a preflight response and CORS headers the click fails silently.
const cors = [
  "access-control-allow-origin: *",
  "access-control-allow-methods: GET, POST, OPTIONS",
  "access-control-allow-headers: content-type",
  "access-control-max-age: 86400",
].join("\r\n");

if (method === "OPTIONS") {
  process.stdout.write(`HTTP/1.1 204 No Content\r\n${cors}\r\ncontent-length: 0\r\n\r\n`);
  process.exit(0);
}

let body: any = {};
try {
  body = JSON.parse(rawBody);
} catch {}

const param = (name: string) => query.get(name) ?? (body?.[name] != null ? String(body[name]) : "");

const action = param("action");
const caseId = param("case_id");
const caseActionId = param("case_action_id");
const sender = param("sender") || "the reported sender";
const subject = param("subject") || "the reported message";

const clickedBy =
  headers.get("x-3b-authenticated-email") ||
  body?.user?.email ||
  body?.email ||
  "an analyst in Tines Cases";

const base = (process.env.TINES_URL ?? "")
  .replace(/^(?:https?:\/\/)+/i, "https://")
  .replace(/^https:\/\/www\./i, "https://")
  .replace(/\/+$/, "");
if (base === "https://") throw new Error("TINES_URL is not set — is the Tines connector attached to this step?");

if (!caseId || !caseActionId || !["block-sender", "remove-from-inboxes"].includes(action)) {
  const message = JSON.stringify({ error: "case_id, case_action_id and a valid action are required" });
  process.stdout.write(
    `HTTP/1.1 400 Bad Request\r\n${cors}\r\ncontent-type: application/json\r\ncontent-length: ${Buffer.byteLength(message)}\r\n\r\n${message}`,
  );
  process.exit(0);
}

const tines = async (path: string, init: RequestInit) => {
  const response = await fetch(`${base}/api/v2${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...(init.headers ?? {}) },
  });
  if (!response.ok) throw new Error(`Tines ${init.method} ${path} failed: ${response.status} ${await response.text()}`);
  return response;
};

await tines(`/cases/${caseId}/actions/${caseActionId}`, { method: "DELETE" });

const when = new Date();
const timestamp = when.toISOString().replace("T", " ").replace(/\.\d+Z$/, " UTC");

const pluralise = (n: number, singular: string, plural = `${singular}s`) => `${n} ${n === 1 ? singular : plural}`;

let noteTitle: string;
let noteColor: string;
let noteContent: string;
if (action === "block-sender") {
  noteTitle = "Sender blocked";
  noteColor = "red";
  noteContent = [
    `\`${sender}\` has been added to the tenant-wide block list, so future mail from this address will be rejected at the gateway.`,
    "",
    `- **Blocked by:** ${clickedBy}`,
    `- **Blocked at:** ${timestamp}`,
    `- **Scope:** all mailboxes, inbound only`,
    "",
    "_Simulated containment action — no real mail flow rule was changed._",
  ].join("\n");
} else {
  const seed = [...`${caseId}:${sender}`].reduce((a, c) => a + c.charCodeAt(0), 0);
  const inboxes = 3 + (seed % 26);
  const opened = seed % 5;
  const clicked = opened === 0 ? 0 : seed % 3;
  noteTitle = "Message removed from all inboxes";
  noteColor = "gold";
  noteContent = [
    `A tenant-wide search for \`${subject}\` from \`${sender}\` returned **${pluralise(inboxes, "additional mailbox", "additional mailboxes")}** holding a copy of the message.`,
    "",
    `- **Copies found:** ${inboxes} mailboxes (${pluralise(opened, "recipient")} opened it, ${pluralise(clicked, "recipient")} clicked a link)`,
    `- **Copies removed:** ${inboxes} of ${inboxes} — soft delete, recoverable for 30 days`,
    `- **Removed by:** ${clickedBy}`,
    `- **Removed at:** ${timestamp}`,
    "",
    "The email has been removed from all inboxes. Recipients who interacted with the message should be prioritised for credential reset and endpoint review.",
    "",
    "_Simulated remediation action — no real mailboxes were modified._",
  ].join("\n");
}

await tines(`/cases/${caseId}/notes`, {
  method: "POST",
  body: JSON.stringify({ title: noteTitle, content: noteContent, color: noteColor }),
});

const payload = JSON.stringify({ case_id: Number(caseId), action, case_action_id: Number(caseActionId), performed_by: clickedBy });
console.error(`Handled case action "${action}" on case ${caseId}`);
process.stdout.write(
  `HTTP/1.1 200 OK\r\n${cors}\r\ncontent-type: application/json\r\ncontent-length: ${Buffer.byteLength(payload)}\r\n\r\n${payload}`,
);
