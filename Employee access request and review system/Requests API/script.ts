import { audit, db, now, uid } from "./db";
import { jsonResponse, parseHttpRequest, readStdin, routeBase } from "./http";
import { lookupEmployee } from "./bamboo";
import { FALLBACK_CHANNEL, postMessage, resolveDm } from "./slack";

const EXPIRY_DAYS = 3;

const raw = await readStdin();
const request = parseHttpRequest(raw);
if (!request) {
  console.error("Requests API expects an HTTP request on stdin");
  process.exit(1);
}

const caller = (request.headers["x-3b-authenticated-email"] ?? "").toLowerCase();

if (request.method === "GET") {
  const requester = (request.query.get("requester") ?? caller).toLowerCase();
  const requests = requester
    ? db.query("SELECT * FROM requests WHERE lower(requester_email) = ? ORDER BY created_at DESC").all(requester)
    : db.query("SELECT * FROM requests ORDER BY created_at DESC LIMIT 200").all();
  const grants = requester
    ? db.query("SELECT * FROM grants WHERE lower(employee_email) = ? ORDER BY granted_at DESC").all(requester)
    : db.query("SELECT * FROM grants ORDER BY granted_at DESC LIMIT 200").all();
  console.log(jsonResponse(200, { requester, requests, grants }));
  process.exit(0);
}

if (request.method !== "POST") {
  console.log(jsonResponse(405, { error: "Use GET to list requests or POST to create one" }));
  process.exit(0);
}

let payload: Record<string, unknown>;
try {
  payload = JSON.parse(request.body || "{}");
} catch {
  console.log(jsonResponse(400, { error: "Body must be JSON" }));
  process.exit(0);
}

const requesterEmail = String(payload.requester_email ?? caller ?? "").trim().toLowerCase();
const system = String(payload.system ?? "").trim();
const accessLevel = String(payload.access_level ?? "").trim();
const justification = String(payload.justification ?? "").trim();

if (!requesterEmail || !system || !accessLevel || !justification) {
  console.log(
    jsonResponse(400, {
      error: "requester_email, system, access_level and justification are required",
    }),
  );
  process.exit(0);
}

const duplicatePending = db
  .query(
    "SELECT * FROM requests WHERE lower(requester_email) = ? AND system = ? AND access_level = ? AND status = 'pending'",
  )
  .get(requesterEmail, system, accessLevel) as { id: string } | null;
if (duplicatePending) {
  audit(requesterEmail, "request.duplicate_blocked", "request", duplicatePending.id, { system, accessLevel });
  console.log(
    jsonResponse(409, {
      error: "A pending request for this access already exists",
      duplicate_of: duplicatePending.id,
      status: "pending",
    }),
  );
  process.exit(0);
}

const existingGrant = db
  .query(
    "SELECT * FROM grants WHERE lower(employee_email) = ? AND system = ? AND access_level = ? AND status IN ('active','revocation_pending')",
  )
  .get(requesterEmail, system, accessLevel) as { id: string } | null;
if (existingGrant) {
  audit(requesterEmail, "request.duplicate_blocked", "grant", existingGrant.id, { system, accessLevel });
  console.log(
    jsonResponse(409, {
      error: "This access is already granted",
      duplicate_of: existingGrant.id,
      status: "granted",
    }),
  );
  process.exit(0);
}

const employee = await lookupEmployee(requesterEmail);
if (!employee) {
  audit(requesterEmail, "request.rejected_unknown_employee", "request", null, { system, accessLevel });
  console.log(jsonResponse(404, { error: `No BambooHR employee found for ${requesterEmail}` }));
  process.exit(0);
}

const id = uid("req");
const token = crypto.randomUUID().replaceAll("-", "");
const expiresAt = new Date(Date.now() + EXPIRY_DAYS * 86_400_000).toISOString();
const escalated = employee.managerEmail ? 0 : 1;

let approverEmail: string | null = employee.managerEmail;
let channel = FALLBACK_CHANNEL;
if (approverEmail) {
  const dm = await resolveDm(approverEmail);
  if (dm) channel = dm;
  else approverEmail = null;
}

db.query(
  `INSERT INTO requests (id, created_at, requester_email, requester_name, employee_id, department, job_title,
     manager_name, manager_email, system, access_level, justification, status, approver_email, approver_channel,
     escalated, decision_token, expires_at)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?)`,
).run(
  id,
  now(),
  employee.email.toLowerCase(),
  employee.name,
  employee.employeeId,
  employee.department,
  employee.jobTitle,
  employee.managerName,
  employee.managerEmail,
  system,
  accessLevel,
  justification,
  approverEmail,
  channel,
  approverEmail ? escalated : 1,
  token,
  expiresAt,
);
audit(requesterEmail, "request.created", "request", id, {
  system,
  accessLevel,
  department: employee.department,
  jobTitle: employee.jobTitle,
  managerEmail: employee.managerEmail,
  escalated: approverEmail ? Boolean(escalated) : true,
});

const base = routeBase();
const decisionUrl = (choice: string) =>
  `${base}/decision?id=${id}&token=${token}&choice=${choice}`;
const headline = approverEmail
  ? `Access request from ${employee.name} needs your approval`
  : `Access request from ${employee.name} has no manager in BambooHR — access team approval needed`;

await postMessage(channel, headline, [
  { type: "header", text: { type: "plain_text", text: "Access request" } },
  {
    type: "section",
    fields: [
      { type: "mrkdwn", text: `*Requester*\n${employee.name}\n${employee.email}` },
      { type: "mrkdwn", text: `*Role*\n${employee.jobTitle ?? "Unknown"}` },
      { type: "mrkdwn", text: `*Department*\n${employee.department ?? "Unknown"}` },
      { type: "mrkdwn", text: `*Manager*\n${employee.managerName ?? "None on record"}` },
      { type: "mrkdwn", text: `*System*\n${system}` },
      { type: "mrkdwn", text: `*Access level*\n${accessLevel}` },
    ],
  },
  { type: "section", text: { type: "mrkdwn", text: `*Justification*\n${justification}` } },
  {
    type: "context",
    elements: [
      { type: "mrkdwn", text: `Request \`${id}\` · expires ${expiresAt.slice(0, 10)} if no decision` },
    ],
  },
  {
    type: "actions",
    elements: [
      { type: "button", style: "primary", text: { type: "plain_text", text: "Approve" }, url: decisionUrl("approve") },
      { type: "button", style: "danger", text: { type: "plain_text", text: "Decline" }, url: decisionUrl("decline") },
    ],
  },
]);
audit("system", "request.approval_sent", "request", id, { channel, approverEmail, escalated: !approverEmail });

console.log(
  jsonResponse(201, {
    id,
    status: "pending",
    expires_at: expiresAt,
    requester: {
      email: employee.email,
      name: employee.name,
      department: employee.department,
      job_title: employee.jobTitle,
      manager_name: employee.managerName,
      manager_email: employee.managerEmail,
    },
    approval: { channel, approver_email: approverEmail, escalated: !approverEmail },
  }),
);
