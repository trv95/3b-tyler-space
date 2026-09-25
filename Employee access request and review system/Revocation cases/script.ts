import { audit, db, now, uid } from "./db";

type Pending = {
  id: string;
  employee_email: string;
  employee_name: string | null;
  department: string | null;
  job_title: string | null;
  manager_email: string | null;
  system: string;
  access_level: string;
  granted_at: string;
  request_id: string;
  cycle_id: string | null;
  reviewer_email: string | null;
  note: string | null;
};

const rawBase = process.env.TINES_URL ?? "";
const base = `https://${rawBase.replace(/^(https?:\/\/)+/, "").replace(/^www\./, "")}`.replace(/\/$/, "");

async function tinesTeamId(): Promise<string> {
  const response = await fetch(`${base}/api/v1/teams`, { headers: { accept: "application/json" } });
  if (!response.ok) throw new Error(`Tines teams lookup failed: ${response.status}`);
  const data = (await response.json()) as { teams?: { id: number; name: string }[] };
  const team = data.teams?.[0];
  if (!team) throw new Error("No Tines team available to create cases in");
  return String(team.id);
}

const pending = db
  .query(
    `SELECT g.*, a.cycle_id, a.reviewer_email, a.note
     FROM grants g
     LEFT JOIN attestations a ON a.grant_id = g.id AND a.decision = 'revoke'
     LEFT JOIN revocation_cases c ON c.grant_id = g.id
     WHERE g.status = 'revocation_pending' AND c.grant_id IS NULL`,
  )
  .all() as Pending[];

if (pending.length === 0) {
  console.log(JSON.stringify({ revocation_cases: [], created: 0 }));
  process.exit(0);
}

const teamId = await tinesTeamId();
const created: Record<string, unknown>[] = [];

for (const grant of pending) {
  const description = [
    `Access marked for revocation during access review \`${grant.cycle_id ?? "unknown cycle"}\`.`,
    "",
    `- **Employee:** ${grant.employee_name ?? grant.employee_email} (${grant.employee_email})`,
    `- **Department:** ${grant.department ?? "Unknown"}`,
    `- **Role:** ${grant.job_title ?? "Unknown"}`,
    `- **Manager:** ${grant.manager_email ?? "None on record"}`,
    `- **System:** ${grant.system}`,
    `- **Access level:** ${grant.access_level}`,
    `- **Granted at:** ${grant.granted_at}`,
    `- **Originating request:** ${grant.request_id}`,
    `- **Reviewer:** ${grant.reviewer_email ?? "unknown"}`,
    `- **Reviewer note:** ${grant.note ?? "none"}`,
  ].join("\n");

  const response = await fetch(`${base}/api/v2/cases`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      team_id: teamId,
      name: `Revoke ${grant.system} (${grant.access_level}) for ${grant.employee_name ?? grant.employee_email}`,
      description,
      priority: "medium",
      status: "open",
      tag_names: ["access-review", "revocation"],
      metadata: {
        grant_id: grant.id,
        request_id: grant.request_id,
        review_cycle: grant.cycle_id,
        employee_email: grant.employee_email,
        system: grant.system,
        access_level: grant.access_level,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Tines case creation failed for grant ${grant.id}: ${response.status} ${await response.text()}`,
    );
  }
  const caseData = (await response.json()) as { case_id: number; url?: string; name: string };

  db.query(
    "INSERT INTO revocation_cases (id, grant_id, cycle_id, tines_case_id, case_url, created_at) VALUES (?, ?, ?, ?, ?, ?)",
  ).run(uid("case"), grant.id, grant.cycle_id, String(caseData.case_id), caseData.url ?? null, now());
  db.query("UPDATE grants SET status = 'revocation_case_open' WHERE id = ?").run(grant.id);
  audit("system", "revocation_case.created", "grant", grant.id, {
    caseId: caseData.case_id,
    url: caseData.url,
    cycleId: grant.cycle_id,
  });

  created.push({
    grant_id: grant.id,
    employee_email: grant.employee_email,
    system: grant.system,
    access_level: grant.access_level,
    review_cycle: grant.cycle_id,
    tines_case_id: caseData.case_id,
    case_url: caseData.url ?? null,
  });
}

console.log(JSON.stringify({ revocation_cases: created, created: created.length }));
