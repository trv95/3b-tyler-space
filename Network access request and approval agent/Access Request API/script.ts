import { mkdir } from "node:fs/promises";
import { Database } from "bun:sqlite";

const raw = await Bun.stdin.text();
const separator = raw.includes("\r\n\r\n") ? "\r\n\r\n" : "\n\n";
const head = raw.split(separator)[0] || "GET / HTTP/1.1";
const first = head.split(/\r?\n/)[0];
const [method, target] = first.split(" ");
const url = new URL(target || "/", "https://workflow.local");
const bodyText = raw.includes(separator) ? raw.split(separator).slice(1).join(separator) : "";
let body: any = {};
try { body = bodyText ? JSON.parse(bodyText) : {}; } catch { respond(400, { error: "invalid_json" }); }
const actor = header(raw, "x-3b-authenticated-email") || body.requester_email || "anonymous";
const action = body.action || url.searchParams.get("action") || url.pathname.split("/").pop();

await mkdir("/storage/network_access", { recursive: true });
const db = new Database("/storage/network_access/access.sqlite", { create: true });
db.exec(`PRAGMA journal_mode=WAL;
CREATE TABLE IF NOT EXISTS requests (id TEXT PRIMARY KEY, requester_email TEXT NOT NULL, requester_name TEXT, requester_type TEXT, department TEXT, role TEXT, access_type TEXT, segment TEXT, justification TEXT, device_json TEXT, location TEXT, starts_at TEXT, ends_at TEXT, duration_days REAL, risk TEXT, flags_json TEXT, status TEXT, approver TEXT, decision_reason TEXT, policy_rule TEXT, provision_json TEXT, created_at TEXT, updated_at TEXT, revoked_at TEXT);
CREATE TABLE IF NOT EXISTS audit (id INTEGER PRIMARY KEY AUTOINCREMENT, request_id TEXT, event TEXT, actor TEXT, detail_json TEXT, created_at TEXT);
CREATE INDEX IF NOT EXISTS idx_req_requester ON requests(requester_email);
CREATE INDEX IF NOT EXISTS idx_req_segment ON requests(segment);
CREATE INDEX IF NOT EXISTS idx_req_status ON requests(status);
CREATE INDEX IF NOT EXISTS idx_audit_request ON audit(request_id);`);

const now = new Date();
const policies = [
  { match: /guest|visitor/i, risk: "Low", max: 7, rule: "guest-temporary" },
  { match: /finance|hr|payroll|regulated|production|prod/i, risk: "High", max: 7, rule: "sensitive-segment" },
  { match: /engineering|internal|department/i, risk: "Medium", max: 30, rule: "internal-standard" },
  { match: /.*/, risk: "Low", max: 14, rule: "general-vpn" }
];

if (method === "POST" && action === "evaluate") {
  const policy = policies.find(p => p.match.test(`${body.access_type} ${body.segment}`))!;
  const flags: string[] = [];
  const days = Number(body.duration_days || ((Date.parse(body.ends_at)-Date.parse(body.starts_at))/86400000));
  if (Number.isFinite(days) && days > policy.max) flags.push(`Requested duration exceeds the ${policy.risk} risk maximum of ${policy.max} days`);
  if (body.requester_type === "contractor" && !/guest/i.test(body.access_type || "")) flags.push("Contractor request for internal access");
  const dept = String(body.department || "").toLowerCase();
  const seg = String(body.segment || "").toLowerCase();
  if (dept && seg && ["finance","hr","engineering","marketing"].some(d => seg.includes(d) && !dept.includes(d))) flags.push("Requester department does not match the target segment");
  if (body.requester_type === "contractor" && !body.sponsor_email) flags.push("Active employee sponsor is required");
  const effectiveRisk = body.requester_type === "contractor" && !/guest/i.test(body.access_type || "") ? "High" : policy.risk;
  respond(200, { risk: effectiveRisk, flags, max_duration_days: effectiveRisk === "High" ? 7 : effectiveRisk === "Medium" ? 30 : policy.max, policy_rule: policy.rule, route: effectiveRisk === "High" || (effectiveRisk === "Medium" && flags.length) ? "human" : "auto" });
}

if (method === "POST" && action === "submit") {
  const id = `NAR-${now.toISOString().slice(0,10).replaceAll("-","")}-${crypto.randomUUID().slice(0,8).toUpperCase()}`;
  const evaluation = body.evaluation || {};
  const auto = evaluation.route === "auto";
  const status = auto ? "approved" : "pending_approval";
  const approver = auto ? "auto-approved" : (evaluation.risk === "High" ? "network-security" : body.manager_email || body.sponsor_email || "requester-manager");
  const provision = auto ? { adapter: "simulation", group: body.segment || body.access_type, expires_at: body.ends_at, registration_code: `NET-${crypto.randomUUID().slice(0,6).toUpperCase()}` } : null;
  db.query(`INSERT INTO requests VALUES ($id,$email,$name,$type,$department,$role,$access,$segment,$justification,$device,$location,$starts,$ends,$days,$risk,$flags,$status,$approver,NULL,$rule,$provision,$created,$updated,NULL)`).run({ $id:id,$email:actor,$name:body.requester_name||null,$type:body.requester_type||null,$department:body.department||null,$role:body.role||null,$access:body.access_type||null,$segment:body.segment||null,$justification:body.justification||null,$device:JSON.stringify(body.device||{}),$location:body.location||null,$starts:body.starts_at||now.toISOString(),$ends:body.ends_at||null,$days:body.duration_days||null,$risk:evaluation.risk||null,$flags:JSON.stringify(evaluation.flags||[]),$status:status,$approver:approver,$rule:evaluation.policy_rule||null,$provision:provision?JSON.stringify(provision):null,$created:now.toISOString(),$updated:now.toISOString() });
  audit(id,"request_submitted",actor,{ risk:evaluation.risk, flags:evaluation.flags, status });
  if (auto) audit(id,"access_provisioned","policy-engine",provision);
  respond(201,{ id,status,risk:evaluation.risk,approver,provision, message:auto?"Access approved and provisioned.":"Request submitted for human approval." });
}

if (method === "POST" && action === "decision") {
  const id = body.id;
  const row:any = db.query("SELECT * FROM requests WHERE id=?").get(id);
  if (!row) respond(404,{error:"not_found"});
  if (row.status !== "pending_approval") respond(409,{error:"already_decided",status:row.status});
  const approved = body.decision === "approve";
  const provision = approved ? { adapter:"simulation", group:row.segment||row.access_type, expires_at:row.ends_at, registration_code:`NET-${crypto.randomUUID().slice(0,6).toUpperCase()}` } : null;
  db.query("UPDATE requests SET status=?, approver=?, decision_reason=?, provision_json=?, updated_at=? WHERE id=?").run(approved?"approved":"denied",actor,body.reason||null,provision?JSON.stringify(provision):null,now.toISOString(),id);
  audit(id,approved?"human_approved":"human_denied",actor,{reason:body.reason||null});
  if (approved) audit(id,"access_provisioned",actor,provision);
  respond(200,{id,status:approved?"approved":"denied",provision});
}

if (method === "GET" && action === "status") {
  const id=url.searchParams.get("id");
  const row:any=id?db.query("SELECT * FROM requests WHERE id=? AND requester_email=?").get(id,actor):db.query("SELECT * FROM requests WHERE requester_email=? ORDER BY created_at DESC LIMIT 1").get(actor);
  if (!row) respond(404,{error:"not_found"});
  respond(200, normalize(row));
}

if (method === "GET" && action === "report") {
  const rows:any[]=db.query("SELECT * FROM requests ORDER BY created_at DESC LIMIT 500").all();
  respond(200,{requests:rows.map(normalize)});
}
respond(404,{error:"not_found"});

function audit(requestId:string,event:string,who:string,detail:any){db.query("INSERT INTO audit(request_id,event,actor,detail_json,created_at) VALUES(?,?,?,?,?)").run(requestId,event,who,JSON.stringify(detail),new Date().toISOString());}
function normalize(r:any){return {...r,device:JSON.parse(r.device_json||"{}"),flags:JSON.parse(r.flags_json||"[]"),provision:r.provision_json?JSON.parse(r.provision_json):null,device_json:undefined,flags_json:undefined,provision_json:undefined};}
function header(s:string,n:string){return s.match(new RegExp(`^${n}:\\s*(.+)$`,"im"))?.[1]?.trim();}
function respond(code:number,data:any):never{const text=JSON.stringify(data);console.log(`HTTP/1.1 ${code} ${code<300?"OK":"Error"}\r\nContent-Type: application/json\r\nCache-Control: no-store\r\nContent-Length: ${Buffer.byteLength(text)}\r\n\r\n${text}`);process.exit(0);}
