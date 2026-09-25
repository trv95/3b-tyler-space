const DAYS = 180;
const ASSIGNMENT_GROUP = "InfoSec";

type Analyst = { name: string; tier: string; skill: number; load: number };

const ANALYSTS: Analyst[] = [
  { name: "Priya Raghunathan", tier: "Tier 3", skill: 1.35, load: 1.2 },
  { name: "Marcus Oyelaran", tier: "Tier 2", skill: 1.1, load: 1.35 },
  { name: "Dana Whitfield", tier: "Tier 2", skill: 1.0, load: 1.0 },
  { name: "Ethan Kobayashi", tier: "Tier 1", skill: 0.82, load: 1.15 },
  { name: "Sofia Delacroix", tier: "Tier 3", skill: 1.28, load: 0.85 },
  { name: "Tobias Lindqvist", tier: "Tier 1", skill: 0.7, load: 0.95 },
  { name: "Aisha Mwangi", tier: "Tier 2", skill: 1.05, load: 1.1 },
];

const CATEGORIES = [
  { name: "Phishing", weight: 0.28, effortHours: 3, autoTriage: true },
  { name: "Malware", weight: 0.14, effortHours: 9 },
  { name: "Vulnerability remediation", weight: 0.17, effortHours: 26 },
  { name: "Access review", weight: 0.13, effortHours: 6 },
  { name: "Data loss prevention", weight: 0.1, effortHours: 11 },
  { name: "Cloud misconfiguration", weight: 0.09, effortHours: 18 },
  { name: "Insider risk", weight: 0.05, effortHours: 34 },
  { name: "Third-party risk", weight: 0.04, effortHours: 40 },
];

const SOURCES = ["Email ingest", "Self-service portal", "SIEM alert", "EDR alert", "Walk-up / Slack"];
const BUSINESS_SERVICES = ["Corporate IT", "Payments platform", "Customer data platform", "Manufacturing OT", "HR systems"];

// SLA targets in hours: [response, resolution] per ServiceNow priority.
const SLA: Record<string, [number, number]> = {
  "1 - Critical": [0.5, 8],
  "2 - High": [2, 24],
  "3 - Moderate": [8, 72],
  "4 - Low": [24, 240],
};

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const rand = rng(20260728);

function pickWeighted<T extends { weight: number }>(items: T[]): T {
  const total = items.reduce((a, i) => a + i.weight, 0);
  let r = rand() * total;
  for (const item of items) {
    r -= item.weight;
    if (r <= 0) return item;
  }
  return items[items.length - 1];
}

function pick<T>(items: T[]): T {
  return items[Math.floor(rand() * items.length)];
}

// Log-normal-ish positive skew: most tickets fast, a long tail of stragglers.
function skewed(median: number, sigma: number): number {
  const u = Math.max(rand(), 1e-6);
  const v = Math.max(rand(), 1e-6);
  const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  return median * Math.exp(sigma * z);
}

const now = new Date("2026-07-28T22:00:00Z");
const start = new Date(now.getTime() - DAYS * 864e5);

function priorityFor(): string {
  const r = rand();
  if (r < 0.06) return "1 - Critical";
  if (r < 0.29) return "2 - High";
  if (r < 0.78) return "3 - Moderate";
  return "4 - Low";
}

const incidents: Record<string, unknown>[] = [];
let seq = 1043500;

for (let day = 0; day < DAYS; day++) {
  const date = new Date(start.getTime() + day * 864e5);
  const dow = date.getUTCDay();
  const weekend = dow === 0 || dow === 6;
  // Volume grows ~35% over the window, with a phishing campaign spike mid-quarter.
  const growth = 1 + (day / DAYS) * 0.35;
  const campaign = day > 96 && day < 106 ? 2.4 : 1;
  const base = (weekend ? 2.5 : 9) * growth * campaign;
  const count = Math.max(0, Math.round(base + (rand() - 0.5) * 4));

  for (let i = 0; i < count; i++) {
    const category = campaign > 1 && rand() < 0.55 ? CATEGORIES[0] : pickWeighted(CATEGORIES);
    const priority = priorityFor();
    const [responseTarget, resolveTarget] = SLA[priority];
    const analyst = pickWeighted(ANALYSTS.map((a) => ({ ...a, weight: a.load })));

    const openedAt = new Date(date.getTime() + (7 + rand() * 13) * 36e5);

    // Staffing pressure: the later in the window and the busier the day, the slower triage.
    const pressure = 1 + (day / DAYS) * 0.45 + (campaign > 1 ? 0.8 : 0) + (weekend ? 1.6 : 0);
    const responseHours = skewed((category.autoTriage ? 0.35 : 1.1) * responseTarget * 0.55 * pressure, 0.7) / analyst.skill;

    const effort = category.effortHours * (priority === "1 - Critical" ? 0.55 : priority === "4 - Low" ? 1.5 : 1);
    const resolveHours = responseHours + skewed(effort * 0.75 * pressure, 0.85) / analyst.skill;

    const respondedAt = new Date(openedAt.getTime() + responseHours * 36e5);
    const resolvedAt = new Date(openedAt.getTime() + resolveHours * 36e5);
    const isResolved = resolvedAt < now && rand() > 0.04;

    const reassignments = rand() < 0.22 ? 1 + Math.floor(rand() * 2) : 0;
    const reopened = isResolved && rand() < (analyst.skill > 1.2 ? 0.03 : 0.09);

    let state: string;
    if (!isResolved) state = rand() < 0.28 ? "On Hold" : rand() < 0.5 ? "New" : "In Progress";
    else state = reopened ? "Resolved" : rand() < 0.7 ? "Closed" : "Resolved";

    incidents.push({
      number: `INC${seq++}`,
      assignment_group: ASSIGNMENT_GROUP,
      assigned_to: analyst.name,
      tier: analyst.tier,
      priority,
      category: category.name,
      business_service: pick(BUSINESS_SERVICES),
      contact_type: pick(SOURCES),
      state,
      opened_at: openedAt.toISOString(),
      responded_at: respondedAt < now ? respondedAt.toISOString() : null,
      resolved_at: isResolved ? resolvedAt.toISOString() : null,
      response_sla_hours: responseTarget,
      resolution_sla_hours: resolveTarget,
      reassignment_count: reassignments,
      reopen_count: reopened ? 1 : 0,
      major_incident: priority === "1 - Critical" && rand() < 0.25,
      short_description: `${category.name} — ${pick(["escalated by SOC", "reported by employee", "flagged by automated control", "identified during review", "raised by vendor"])}`,
    });
  }
}

const body = JSON.stringify({
  generated_at: now.toISOString(),
  window_start: start.toISOString(),
  assignment_group: ASSIGNMENT_GROUP,
  source: "sample data (no live ServiceNow instance connected)",
  analysts: ANALYSTS.map(({ name, tier }) => ({ name, tier })),
  sla_targets: SLA,
  incidents,
});

process.stdout.write(
  [
    "HTTP/1.1 200 OK",
    "Content-Type: application/json",
    `Content-Length: ${Buffer.byteLength(body)}`,
    "Cache-Control: no-store",
    "",
    body,
  ].join("\r\n"),
);
