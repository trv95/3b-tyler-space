import { all } from "./db";
import { jsonResponse, parseHttpRequest, readStdin } from "./http";

const raw = await readStdin();
const request = parseHttpRequest(raw);

const decisions = all(
  `SELECT r.id AS request_id, r.created_at, r.requester_email, r.requester_name, r.department, r.job_title,
          r.manager_name, r.manager_email, r.system, r.access_level, r.justification, r.status,
          r.approver_email, r.escalated, r.expires_at, r.decided_at, r.decided_by, r.decision_note,
          g.id AS grant_id, g.status AS grant_status
   FROM requests r
   LEFT JOIN grants g ON g.request_id = r.id
   ORDER BY r.created_at DESC
   LIMIT 500`,
);

const revocationCases = all(
  `SELECT c.tines_case_id, c.case_url, c.created_at, c.cycle_id, g.id AS grant_id, g.employee_email,
          g.system, g.access_level, g.status AS grant_status, a.reviewer_email, a.note AS reviewer_note
   FROM revocation_cases c
   JOIN grants g ON g.id = c.grant_id
   LEFT JOIN attestations a ON a.grant_id = g.id AND a.decision = 'revoke'
   ORDER BY c.created_at DESC
   LIMIT 500`,
);

const auditTrail = all(
  "SELECT id, at, actor, action, entity, entity_id, detail FROM audit_log ORDER BY id DESC LIMIT 500",
);

const payload = {
  generated_at: new Date().toISOString(),
  summary: {
    requests: decisions.length,
    approved: decisions.filter((d) => d.status === "approved").length,
    declined: decisions.filter((d) => d.status === "declined").length,
    expired: decisions.filter((d) => d.status === "expired").length,
    pending: decisions.filter((d) => d.status === "pending").length,
    escalated_no_manager: decisions.filter((d) => d.escalated === 1).length,
    revocation_cases: revocationCases.length,
  },
  approval_decisions: decisions,
  revocation_cases: revocationCases,
  audit_log: auditTrail,
};

console.log(request ? jsonResponse(200, payload) : JSON.stringify(payload));
