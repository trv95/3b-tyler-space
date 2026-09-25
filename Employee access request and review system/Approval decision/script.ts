import { audit, db, now, uid } from "./db";
import { htmlResponse, parseHttpRequest, readStdin } from "./http";
import { postMessage, resolveDm } from "./slack";

type RequestRow = {
  id: string;
  requester_email: string;
  requester_name: string | null;
  department: string | null;
  job_title: string | null;
  manager_email: string | null;
  system: string;
  access_level: string;
  status: string;
  decision_token: string;
  expires_at: string;
  decided_at: string | null;
  decided_by: string | null;
  escalated: number;
};

const escape = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function page(title: string, body: string, tone: "ok" | "warn" | "bad") {
  const accent = tone === "ok" ? "#047857" : tone === "warn" ? "#b45309" : "#b91c1c";
  return htmlResponse(
    200,
    `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escape(title)}</title></head>
<body style="margin:0;font-family:ui-sans-serif,system-ui,sans-serif;background:#f8fafc;color:#0f172a">
<div style="max-width:34rem;margin:4rem auto;background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:2rem">
<h1 style="margin:0 0 .75rem;font-size:1.25rem;color:${accent}">${escape(title)}</h1>
${body}
</div></body></html>`,
  );
}

const raw = await readStdin();
const request = parseHttpRequest(raw);
if (!request) {
  console.error("Approval decision expects an HTTP request on stdin");
  process.exit(1);
}

const id = request.query.get("id") ?? "";
const token = request.query.get("token") ?? "";
const choice = (request.query.get("choice") ?? "").toLowerCase();
const decider = (request.headers["x-3b-authenticated-email"] ?? "unknown").toLowerCase();

if (!id || !token || (choice !== "approve" && choice !== "decline")) {
  console.log(page("Invalid decision link", "<p>The link is missing an id, token or choice.</p>", "bad"));
  process.exit(0);
}

const row = db.query("SELECT * FROM requests WHERE id = ?").get(id) as RequestRow | null;
if (!row || row.decision_token !== token) {
  audit(decider, "decision.rejected_bad_token", "request", id, { choice });
  console.log(page("Decision link not recognised", "<p>This approval link is no longer valid.</p>", "bad"));
  process.exit(0);
}

if (row.status !== "pending") {
  console.log(
    page(
      `Already ${escape(row.status)}`,
      `<p>Request <code>${escape(row.id)}</code> for <b>${escape(row.system)} · ${escape(row.access_level)}</b> was already ${escape(row.status)}${row.decided_by ? ` by ${escape(row.decided_by)}` : ""}${row.decided_at ? ` on ${escape(row.decided_at.slice(0, 16).replace("T", " "))}` : ""}.</p>`,
      "warn",
    ),
  );
  process.exit(0);
}

if (Date.parse(row.expires_at) < Date.now()) {
  db.query("UPDATE requests SET status = 'expired', decided_at = ?, decision_note = ? WHERE id = ?").run(
    now(),
    "Approval window elapsed before a decision was recorded",
    row.id,
  );
  audit("system", "request.expired", "request", row.id, { attemptedChoice: choice, by: decider });
  console.log(
    page(
      "Approval window expired",
      `<p>Request <code>${escape(row.id)}</code> expired on ${escape(row.expires_at.slice(0, 10))}. The requester needs to submit a new request.</p>`,
      "warn",
    ),
  );
  process.exit(0);
}

const status = choice === "approve" ? "approved" : "declined";
db.query("UPDATE requests SET status = ?, decided_at = ?, decided_by = ?, decision_note = ? WHERE id = ?").run(
  status,
  now(),
  decider,
  choice === "approve" ? "Approved via Slack approval link" : "Declined via Slack approval link",
  row.id,
);

let grantId: string | null = null;
if (status === "approved") {
  grantId = uid("grant");
  db.query(
    `INSERT INTO grants (id, request_id, employee_email, employee_name, department, job_title, manager_email,
       system, access_level, granted_at, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
  ).run(
    grantId,
    row.id,
    row.requester_email,
    row.requester_name,
    row.department,
    row.job_title,
    row.manager_email,
    row.system,
    row.access_level,
    now(),
  );
  audit(decider, "grant.created", "grant", grantId, { requestId: row.id, system: row.system, accessLevel: row.access_level });
}
audit(decider, `request.${status}`, "request", row.id, {
  system: row.system,
  accessLevel: row.access_level,
  escalated: Boolean(row.escalated),
  grantId,
});

const dm = await resolveDm(row.requester_email);
if (dm) {
  await postMessage(
    dm,
    `Your access request for ${row.system} (${row.access_level}) was ${status}.`,
    [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Access request ${status}*\n*System:* ${row.system}\n*Access level:* ${row.access_level}\n*Decided by:* ${decider}\n*Request:* \`${row.id}\``,
        },
      },
    ],
  );
  audit("system", "requester.notified", "request", row.id, { status });
}

console.log(
  page(
    status === "approved" ? "Access approved" : "Access declined",
    `<p>Request <code>${escape(row.id)}</code> for <b>${escape(row.requester_name ?? row.requester_email)}</b> — ${escape(row.system)} · ${escape(row.access_level)} — has been recorded as <b>${status}</b>.</p>
<p style="color:#475569;font-size:.9rem">The requester has been notified in Slack and the decision is in the audit log.</p>`,
    status === "approved" ? "ok" : "bad",
  ),
);
