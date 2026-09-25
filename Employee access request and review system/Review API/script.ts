import { audit, db, now, uid } from "./db";
import { jsonResponse, parseHttpRequest, readStdin } from "./http";

type Cycle = { id: string; opened_at: string; status: string; grant_count: number };

const raw = await readStdin();
const request = parseHttpRequest(raw);
if (!request) {
  console.error("Review API expects an HTTP request on stdin");
  process.exit(1);
}

const reviewer = (request.headers["x-3b-authenticated-email"] ?? "").toLowerCase();

function currentCycle(): Cycle | null {
  return (db.query("SELECT * FROM review_cycles WHERE status = 'open' ORDER BY opened_at DESC").get() ??
    db.query("SELECT * FROM review_cycles ORDER BY opened_at DESC").get()) as Cycle | null;
}

if (request.method === "GET") {
  const cycle = currentCycle();
  const grants = db
    .query(
      `SELECT g.*, r.justification, r.decided_by AS approved_by, r.decided_at AS approved_at,
              a.decision AS attestation, a.reviewer_email AS attested_by, a.created_at AS attested_at, a.note AS attestation_note,
              c.tines_case_id, c.case_url
       FROM grants g
       LEFT JOIN requests r ON r.id = g.request_id
       LEFT JOIN attestations a ON a.grant_id = g.id AND a.cycle_id = ?
       LEFT JOIN revocation_cases c ON c.grant_id = g.id
       WHERE g.status IN ('active','revocation_pending','revocation_case_open')
       ORDER BY g.employee_email, g.system`,
    )
    .all(cycle?.id ?? "") as Record<string, unknown>[];
  console.log(
    jsonResponse(200, {
      reviewer,
      cycle,
      grants,
      summary: {
        total: grants.length,
        attested: grants.filter((g) => g.attestation).length,
        revocations_pending: grants.filter((g) => g.status === "revocation_pending").length,
      },
    }),
  );
  process.exit(0);
}

if (request.method !== "POST") {
  console.log(jsonResponse(405, { error: "Use GET to load the review or POST to submit attestations" }));
  process.exit(0);
}

let payload: { attestations?: { grant_id?: string; decision?: string; note?: string }[] };
try {
  payload = JSON.parse(request.body || "{}");
} catch {
  console.log(jsonResponse(400, { error: "Body must be JSON" }));
  process.exit(0);
}

const items = payload.attestations ?? [];
if (items.length === 0) {
  console.log(jsonResponse(400, { error: "attestations must be a non-empty array" }));
  process.exit(0);
}

let cycle = currentCycle();
if (!cycle || cycle.status !== "open") {
  const id = uid("cycle");
  db.query("INSERT INTO review_cycles (id, opened_at, status, grant_count) VALUES (?, ?, 'open', 0)").run(id, now());
  cycle = { id, opened_at: now(), status: "open", grant_count: 0 };
  audit(reviewer || "system", "review_cycle.opened", "review_cycle", id, { reason: "attestation submitted with no open cycle" });
}

const recorded: Record<string, unknown>[] = [];
const skipped: Record<string, unknown>[] = [];

for (const item of items) {
  const grantId = String(item.grant_id ?? "");
  const decision = String(item.decision ?? "").toLowerCase();
  if (!grantId || (decision !== "keep" && decision !== "revoke")) {
    skipped.push({ grant_id: grantId, reason: "decision must be keep or revoke" });
    continue;
  }
  const grant = db.query("SELECT * FROM grants WHERE id = ?").get(grantId) as
    | { id: string; status: string; employee_email: string; system: string; access_level: string }
    | null;
  if (!grant) {
    skipped.push({ grant_id: grantId, reason: "unknown grant" });
    continue;
  }
  const already = db
    .query("SELECT * FROM attestations WHERE cycle_id = ? AND grant_id = ?")
    .get(cycle.id, grantId) as { decision: string } | null;
  if (already) {
    skipped.push({ grant_id: grantId, reason: `already attested as ${already.decision} in this cycle` });
    continue;
  }

  db.query(
    "INSERT INTO attestations (id, cycle_id, grant_id, reviewer_email, decision, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
  ).run(uid("att"), cycle.id, grantId, reviewer || "unknown", decision, item.note ?? null, now());

  if (decision === "revoke" && grant.status === "active") {
    db.query("UPDATE grants SET status = 'revocation_pending' WHERE id = ?").run(grantId);
  }
  audit(reviewer || "unknown", `attestation.${decision}`, "grant", grantId, {
    cycleId: cycle.id,
    system: grant.system,
    accessLevel: grant.access_level,
    employee: grant.employee_email,
    note: item.note ?? null,
  });
  recorded.push({
    grant_id: grantId,
    decision,
    employee_email: grant.employee_email,
    system: grant.system,
    access_level: grant.access_level,
  });
}

console.log(
  jsonResponse(200, {
    cycle_id: cycle.id,
    reviewer: reviewer || "unknown",
    recorded,
    skipped,
    revocations: recorded.filter((r) => r.decision === "revoke").length,
  }),
);
