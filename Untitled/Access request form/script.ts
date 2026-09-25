import {
  TINES_URL,
  TINES_TEAM_ID,
  RECORD_TYPE_ID,
  RECORD_FIELD_USER,
  RECORD_FIELD_TOOL,
  RECORD_FIELD_STATUS,
  APPROVER_CHANNEL,
  APPS,
  parseHttpRequest,
  html,
  decisionUrl,
} from "./lib";

const STORE = "/storage/access_requests";

interface Submission {
  first_name: string;
  last_name: string;
  email: string;
  duration_minutes: number;
  reasoning: string;
  apps: string[];
}

const PAGE_CSS = `
  :root { --accent:#6C5CE7; --accent-soft:#B6AEEC; --ink:#1c1b29; --muted:#6b6a7c; }
  * { box-sizing:border-box; }
  body { margin:0; font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
    background:linear-gradient(160deg,#f4f2ff 0%,#eceafc 100%); color:var(--ink); min-height:100vh; }
  .wrap { max-width:640px; margin:0 auto; padding:56px 24px 80px; }
  .card { background:#fff; border-radius:20px; padding:40px; box-shadow:0 24px 60px -30px rgba(76,60,180,.45);
    border:1px solid #ece9fb; }
  .brand { display:flex; align-items:center; gap:12px; margin-bottom:28px; }
  .brand .dot { width:38px; height:38px; border-radius:11px; background:var(--accent);
    display:grid; place-items:center; color:#fff; font-weight:700; font-size:18px; }
  h1 { font-size:26px; margin:0 0 6px; letter-spacing:-.5px; }
  .sub { color:var(--muted); margin:0 0 30px; font-size:15px; line-height:1.5; }
  label { display:block; font-weight:600; font-size:13px; margin:0 0 7px; }
  .field { margin-bottom:20px; }
  input[type=text], input[type=email], input[type=number], textarea {
    width:100%; padding:12px 14px; border:1.5px solid #e3e0f2; border-radius:11px; font-size:15px;
    font-family:inherit; background:#fbfaff; transition:border-color .15s,box-shadow .15s; }
  input:focus, textarea:focus { outline:none; border-color:var(--accent); box-shadow:0 0 0 3px rgba(108,92,231,.15); }
  textarea { resize:vertical; min-height:84px; }
  .apps { display:flex; gap:10px; flex-wrap:wrap; }
  .apps label { display:flex; align-items:center; gap:9px; font-weight:500; cursor:pointer;
    border:1.5px solid #e3e0f2; padding:11px 16px; border-radius:11px; background:#fbfaff; flex:1; min-width:120px;
    margin:0; transition:all .15s; }
  .apps label:has(input:checked) { border-color:var(--accent); background:#f2effe; color:var(--accent); font-weight:600; }
  .apps input { accent-color:var(--accent); width:17px; height:17px; }
  .hint { color:var(--muted); font-size:12px; margin-top:5px; }
  button { width:100%; margin-top:8px; padding:14px; border:none; border-radius:12px; background:var(--accent);
    color:#fff; font-size:15px; font-weight:700; cursor:pointer; transition:filter .15s; }
  button:hover { filter:brightness(1.07); }
  .err { background:#fdecec; border:1px solid #f5b5b5; color:#a11; padding:12px 14px; border-radius:11px;
    font-size:14px; margin-bottom:22px; }
  .ok-icon { width:64px; height:64px; border-radius:50%; background:#e6f8ee; display:grid; place-items:center;
    margin:0 auto 20px; font-size:30px; }
  .center { text-align:center; }
`;

function formPage(error?: string, values: Partial<Submission> = {}): string {
  const v = (s?: string) => (s ? String(s).replace(/"/g, "&quot;") : "");
  const appBoxes = APPS.map(
    (a) =>
      `<label><input type="checkbox" name="apps" value="${a}" ${
        values.apps?.includes(a) ? "checked" : ""
      }>${a}</label>`,
  ).join("");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Temporary Application Access</title><style>${PAGE_CSS}</style></head><body>
<div class="wrap"><div class="card">
  <div class="brand"><div class="dot">3B</div><strong>Access Management</strong></div>
  <h1>Temporary Application Access</h1>
  <p class="sub">Please fill out the below information to request temporary access to the selected tools. Access is granted for a limited time after approval, then automatically revoked.</p>
  ${error ? `<div class="err">${error}</div>` : ""}
  <form method="POST" action="/temporary-access">
    <div class="field"><label>First name</label><input type="text" name="first_name" required value="${v(values.first_name)}"></div>
    <div class="field"><label>Last name</label><input type="text" name="last_name" required value="${v(values.last_name)}"></div>
    <div class="field"><label>Email</label><input type="email" name="email" required value="${v(values.email)}"></div>
    <div class="field"><label>Application access duration (in minutes)</label>
      <input type="number" name="duration_minutes" min="1" required value="${v(values.duration_minutes ? String(values.duration_minutes) : "")}"></div>
    <div class="field"><label>Reasoning</label>
      <textarea name="reasoning" required>${values.reasoning ? String(values.reasoning).replace(/</g, "&lt;") : ""}</textarea>
      <div class="hint">Please provide a brief summary on why this access is required.</div></div>
    <div class="field"><label>Application request</label><div class="apps">${appBoxes}</div></div>
    <button type="submit">Submit request</button>
  </form>
</div></div></body></html>`;
}

function successPage(): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Request received</title><style>${PAGE_CSS}</style></head><body>
<div class="wrap"><div class="card center">
  <div class="ok-icon">✓</div>
  <h1>Request received</h1>
  <p class="sub">Your submission has been received. You will receive notice via Slack if access has been granted.</p>
</div></div></body></html>`;
}

function parseForm(body: string): Submission {
  const p = new URLSearchParams(body);
  const apps = p.getAll("apps").filter((a) => (APPS as readonly string[]).includes(a));
  return {
    first_name: (p.get("first_name") ?? "").trim(),
    last_name: (p.get("last_name") ?? "").trim(),
    email: (p.get("email") ?? "").trim(),
    duration_minutes: parseInt(p.get("duration_minutes") ?? "", 10),
    reasoning: (p.get("reasoning") ?? "").trim(),
    apps,
  };
}

function validate(s: Submission): string | null {
  if (!s.first_name || !s.last_name) return "First and last name are required.";
  if (!s.email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s.email)) return "A valid email is required.";
  if (!Number.isFinite(s.duration_minutes) || s.duration_minutes < 1)
    return "Duration must be a positive number of minutes.";
  if (!s.reasoning) return "Reasoning is required.";
  if (s.apps.length === 0) return "Select at least one application.";
  return null;
}

async function tines(path: string, method: string, payload: unknown): Promise<any> {
  const res = await fetch(`${TINES_URL}${path}`, {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Tines ${method} ${path} -> ${res.status}: ${text}`);
  return text ? JSON.parse(text) : {};
}

async function slack(method: string, payload: unknown): Promise<any> {
  const res = await fetch(`https://slack.com/api/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify(payload),
  });
  const data = (await res.json()) as any;
  if (!data.ok) throw new Error(`Slack ${method} error: ${data.error}`);
  return data;
}

function caseDescription(s: Submission, statusLine: string): string {
  return [
    "A user has requested temporary access to the selected tool",
    "",
    "| Field | Value |",
    "|-------|-------|",
    `| **Name** | ${s.first_name} ${s.last_name} |`,
    `| **Email** | ${s.email} |`,
    `| **Application** | ${s.apps.join(", ")} |`,
    `| **Reasoning** | ${s.reasoning} |`,
    `| **Time (minutes)** | ${s.duration_minutes} |`,
    `| **Status** | ${statusLine} |`,
  ].join("\n");
}

async function main() {
  const raw = await Bun.stdin.text();
  const req = parseHttpRequest(raw);

  if (req.method === "GET") {
    process.stdout.write(html(200, "OK", formPage()));
    return;
  }
  if (req.method !== "POST") {
    process.stdout.write(html(405, "Method Not Allowed", formPage("Unsupported method.")));
    return;
  }

  const submission = parseForm(req.body);
  const err = validate(submission);
  if (err) {
    process.stdout.write(html(400, "Bad Request", formPage(err, submission)));
    return;
  }

  const id = crypto.randomUUID();
  const now = new Date();

  // 1. Create the Case (Pending approval).
  const caseRes = await tines("/api/v2/cases", "POST", {
    team_id: TINES_TEAM_ID,
    name: `Temporary Application Access Request | ${submission.email}`,
    description: caseDescription(submission, "Pending approval in Slack"),
    priority: "medium",
  });
  const caseId = caseRes.case_id;

  // 2. Create the Record, linked to the Case.
  const recordRes = await tines("/api/v1/records", "POST", {
    record_type_id: RECORD_TYPE_ID,
    case_ids: [String(caseId)],
    field_values: [
      { field_id: String(RECORD_FIELD_USER), value: `${submission.first_name} ${submission.last_name}` },
      { field_id: String(RECORD_FIELD_TOOL), value: submission.apps.join(", ") },
      { field_id: String(RECORD_FIELD_STATUS), value: "Pending approval in Slack" },
    ],
  });
  const recordId = recordRes.id;

  // 3. Persist pending request state.
  await Bun.write(
    `${STORE}/${id}.json`,
    JSON.stringify(
      {
        id,
        ...submission,
        case_id: caseId,
        record_id: recordId,
        status: "pending",
        created_at: now.toISOString(),
        expires_at: null,
        provisioned: {},
      },
      null,
      2,
    ),
  );

  // 4. Post the Slack approval message.
  await slack("chat.postMessage", {
    channel: APPROVER_CHANNEL,
    text: `Temporary access request from ${submission.first_name} ${submission.last_name}`,
    blocks: [
      { type: "section", text: { type: "mrkdwn", text: "A user is requesting temporary access to an application:" } },
      {
        type: "section",
        fields: [
          { type: "mrkdwn", text: `*User:*\n\n${submission.first_name} ${submission.last_name} (${submission.email})` },
          { type: "mrkdwn", text: `*Application:*\n\n${submission.apps.join(", ")}` },
          { type: "mrkdwn", text: `*Duration:*\n\n${submission.duration_minutes} minutes` },
          { type: "mrkdwn", text: `*Reasoning:*\n\n${submission.reasoning}` },
        ],
      },
      {
        type: "actions",
        elements: [
          { type: "button", text: { type: "plain_text", emoji: true, text: "Approve" }, style: "primary", url: decisionUrl(id, "yes") },
          { type: "button", text: { type: "plain_text", emoji: true, text: "Deny" }, style: "danger", url: decisionUrl(id, "no") },
        ],
      },
    ],
  });

  process.stdout.write(html(200, "OK", successPage()));
}

main().catch((e) => {
  console.error(e);
  process.stdout.write(html(500, "Internal Server Error", formPage("Something went wrong submitting your request. Please try again.")));
});
