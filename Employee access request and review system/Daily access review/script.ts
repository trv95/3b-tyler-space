import { audit, db, now, uid } from "./db";
import { routeBase } from "./http";
import { FALLBACK_CHANNEL, postMessage, resolveDm } from "./slack";

type PendingRow = {
  id: string;
  requester_email: string;
  system: string;
  access_level: string;
  expires_at: string;
};

const expired = db
  .query("SELECT * FROM requests WHERE status = 'pending' AND expires_at < ?")
  .all(now()) as PendingRow[];

for (const row of expired) {
  db.query("UPDATE requests SET status = 'expired', decided_at = ?, decision_note = ? WHERE id = ?").run(
    now(),
    "No approval decision within the approval window",
    row.id,
  );
  audit("system", "request.expired", "request", row.id, { system: row.system, accessLevel: row.access_level });
  const dm = await resolveDm(row.requester_email);
  if (dm) {
    await postMessage(
      dm,
      `Your access request for ${row.system} (${row.access_level}) expired without a decision.`,
    );
    audit("system", "requester.notified", "request", row.id, { status: "expired" });
  }
}

const activeGrants = db
  .query("SELECT * FROM grants WHERE status = 'active' ORDER BY employee_email, system")
  .all() as { id: string; employee_email: string }[];

const openCycle = db.query("SELECT * FROM review_cycles WHERE status = 'open'").get() as
  | { id: string; opened_at: string }
  | null;

let cycleId: string;
if (openCycle) {
  cycleId = openCycle.id;
  db.query("UPDATE review_cycles SET grant_count = ? WHERE id = ?").run(activeGrants.length, cycleId);
  audit("system", "review_cycle.reused", "review_cycle", cycleId, { grantCount: activeGrants.length });
} else {
  cycleId = uid("cycle");
  db.query(
    "INSERT INTO review_cycles (id, opened_at, status, grant_count) VALUES (?, ?, 'open', ?)",
  ).run(cycleId, now(), activeGrants.length);
  audit("system", "review_cycle.opened", "review_cycle", cycleId, { grantCount: activeGrants.length });
}

const reviewUrl = `${routeBase()}/review`;
const attested = db
  .query("SELECT COUNT(DISTINCT grant_id) AS c FROM attestations WHERE cycle_id = ?")
  .get(cycleId) as { c: number };
const outstanding = activeGrants.length - attested.c;

if (activeGrants.length > 0) {
  await postMessage(FALLBACK_CHANNEL, `Daily access review: ${outstanding} grant(s) awaiting attestation.`, [
    { type: "header", text: { type: "plain_text", text: "Daily access review" } },
    {
      type: "section",
      fields: [
        { type: "mrkdwn", text: `*Review cycle*\n\`${cycleId}\`` },
        { type: "mrkdwn", text: `*Active grants*\n${activeGrants.length}` },
        { type: "mrkdwn", text: `*Awaiting attestation*\n${outstanding}` },
        { type: "mrkdwn", text: `*Requests expired today*\n${expired.length}` },
      ],
    },
    {
      type: "actions",
      elements: [
        {
          type: "button",
          style: "primary",
          text: { type: "plain_text", text: "Open access review" },
          url: reviewUrl,
        },
      ],
    },
  ]);
  audit("system", "review_cycle.notified", "review_cycle", cycleId, { channel: FALLBACK_CHANNEL });
}

console.log(
  JSON.stringify({
    review_cycle: cycleId,
    active_grants: activeGrants.length,
    awaiting_attestation: outstanding,
    expired_requests: expired.map((r) => ({ id: r.id, system: r.system, access_level: r.access_level })),
    review_url: reviewUrl,
  }),
);
