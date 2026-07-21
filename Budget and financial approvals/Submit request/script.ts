import {
  KIND_META,
  buildDescription,
  currency,
  fieldLabel,
  normalizeRequest,
  priorityFor,
  type SubmitPayload,
} from "./request";

const TEAM_ID = "19060";

// --- read HTTP request body from stdin -------------------------------------

function parseBody(raw: string): string {
  const sep = raw.indexOf("\r\n\r\n");
  if (sep !== -1) return raw.slice(sep + 4);
  const sep2 = raw.indexOf("\n\n");
  if (sep2 !== -1) return raw.slice(sep2 + 2);
  return raw; // already just a body (e.g. piped test input)
}

function respond(status: number, body: unknown): never {
  const json = JSON.stringify(body);
  process.stdout.write(
    [
      `HTTP/1.1 ${status} ${status === 200 ? "OK" : "Error"}`,
      "Content-Type: application/json",
      `Content-Length: ${Buffer.byteLength(json)}`,
      "",
      json,
    ].join("\r\n"),
  );
  process.exit(0);
}

// A failure response for the form, without emitting stdout to Slack.
function fail(status: number, message: string): never {
  console.error(`submit failed (${status}): ${message}`);
  respond(status, { error: message });
}

const raw = await Bun.stdin.text();

let payload: SubmitPayload;
try {
  payload = JSON.parse(parseBody(raw));
} catch {
  fail(400, "Request body must be valid JSON");
}

const request = normalizeRequest(payload);
if ("error" in request) fail(400, request.error);

const meta = KIND_META[request.kind];
const description = buildDescription(request);

// --- create the Tines case -------------------------------------------------

const base = (process.env.TINES_URL || "")
  .replace(/\/$/, "")
  .replace("://www.", "://");
if (!base) fail(500, "Tines connector is not configured (missing TINES_URL)");

const caseName = `[${meta.label}] ${request.fields.title}`;

const metadata: Record<string, string> = {
  request_type: meta.label,
  requester: request.fields.requester_name,
  requester_email: request.fields.requester_email,
  amount: `${currency(request.fields.amount)}`,
  needed_by: request.fields.needed_by,
};
for (const key of meta.fieldKeys) {
  metadata[key] = String(request.fields[key] ?? "");
}

let caseRes: Response;
try {
  caseRes = await fetch(`${base}/api/v2/cases/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      team_id: TEAM_ID,
      name: caseName,
      priority: priorityFor(request.fields.priority),
      status: "open",
      description,
      author_email: request.fields.requester_email,
      metadata,
    }),
  });
} catch (e) {
  fail(502, `Could not reach Tines: ${e instanceof Error ? e.message : String(e)}`);
}

const caseText = await caseRes.text();
if (!caseRes.ok) {
  fail(502, `Tines case creation failed (${caseRes.status}): ${caseText.slice(0, 300)}`);
}

let created: { case_id?: number | string; url?: string };
try {
  created = JSON.parse(caseText);
} catch {
  fail(502, "Tines returned a non-JSON response");
}

const caseId = created.case_id ?? "";
const caseUrl = created.url ?? "";

// --- emit enriched payload for the Slack step ------------------------------

const forSlack = {
  kind: request.kind,
  kindLabel: meta.label,
  caseId,
  caseUrl,
  priority: request.fields.priority,
  title: request.fields.title,
  requester: request.fields.requester_name,
  requesterEmail: request.fields.requester_email,
  amountDisplay: currency(request.fields.amount),
  neededBy: request.fields.needed_by,
  justification: request.fields.justification,
  details: meta.fieldKeys.map((k) => ({
    label: fieldLabel(request.kind, k),
    value: String(request.fields[k] ?? ""),
  })),
};

// stdout half 1: response to the form is written last, but we must emit the
// Slack payload to stdout. Since stdout is both the HTTP response and the
// downstream input, we send the Slack payload downstream and let a dedicated
// response go to the browser. To do both, we write the Slack JSON to stdout
// (downstream input) — the form reads caseId/caseUrl from the SAME JSON.
respond(200, { caseId, caseUrl, ...forSlack });
