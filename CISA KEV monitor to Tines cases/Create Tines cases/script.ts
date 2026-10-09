// Creates one Tines case per new CISA KEV vulnerability handed down by "Check CISA KEV feed",
// then records each CVE in the shared `cisa_kev_state` volume so it is never re-created.
//
// This step is the sole writer of the seen-set. A CVE is marked seen only after its case is
// successfully created, so if the Tines API is unavailable the remaining CVEs stay unseen and
// are retried on the next scheduled run.

// Destination case team. Change this to route KEV cases to a different Tines team.
const TEAM_ID = 107557;
const SEEN_PATH = "/storage/cisa_kev_state/seen.json";

type Vulnerability = {
  cveID: string;
  vendorProject?: string;
  product?: string;
  vulnerabilityName?: string;
  dateAdded?: string;
  shortDescription?: string;
  requiredAction?: string;
  dueDate?: string;
  knownRansomwareCampaignUse?: string;
  notes?: string;
  cwes?: string[];
};

type Payload = {
  mode: "baseline" | "incremental";
  catalogVersion?: string | null;
  dateReleased?: string | null;
  allCveIDs: string[];
  newVulns: Vulnerability[];
};

const stdin = await Bun.stdin.text();
if (!stdin.trim()) {
  // Upstream emitted nothing (no new vulnerabilities); nothing to do.
  process.exit(0);
}
const payload = JSON.parse(stdin) as Payload;

async function readSeen(): Promise<Set<string>> {
  const file = Bun.file(SEEN_PATH);
  if (!(await file.exists())) return new Set();
  try {
    const parsed = JSON.parse(await file.text());
    return Array.isArray(parsed) ? new Set(parsed.map(String)) : new Set();
  } catch {
    throw new Error(`Could not parse ${SEEN_PATH}; refusing to run so state is not corrupted`);
  }
}

async function writeSeen(seen: Set<string>): Promise<void> {
  await Bun.write(SEEN_PATH, JSON.stringify([...seen].sort()));
}

// Baseline run: record the whole catalog as seen without opening any cases.
if (payload.mode === "baseline") {
  const seen = await readSeen();
  for (const id of payload.allCveIDs) seen.add(id);
  await writeSeen(seen);
  console.error(`Baseline recorded ${seen.size} CVE IDs; no cases created.`);
  console.log(
    JSON.stringify({
      mode: "baseline",
      seeded: payload.allCveIDs.length,
      cases_created: 0,
    }),
  );
  process.exit(0);
}

// The connector's TINES_URL is stored with a duplicated scheme and a "www." prefix that does
// not resolve, so derive candidate hosts rather than trusting the value verbatim.
function candidateBases(): string[] {
  const host = (process.env.TINES_URL ?? "").replace(/^(https?:\/\/)+/, "").replace(/\/+$/, "");
  if (!host) throw new Error("TINES_URL is not set");
  const hosts = [host];
  if (host.startsWith("www.") && host.split(".").length > 3) hosts.push(host.slice(4));
  return hosts.map((h) => `https://${h}`);
}

const bases = candidateBases();

function priorityFor(v: Vulnerability): string {
  return v.knownRansomwareCampaignUse?.toLowerCase() === "known" ? "high" : "medium";
}

function describe(v: Vulnerability): string {
  const lines = [
    v.shortDescription ?? "",
    "",
    `**Vendor / product:** ${v.vendorProject ?? "?"} — ${v.product ?? "?"}`,
    `**Date added to KEV:** ${v.dateAdded ?? "?"}`,
    `**Remediation due date:** ${v.dueDate ?? "?"}`,
    `**Known ransomware campaign use:** ${v.knownRansomwareCampaignUse ?? "Unknown"}`,
  ];
  if (v.cwes?.length) lines.push(`**CWEs:** ${v.cwes.join(", ")}`);
  if (v.requiredAction) lines.push("", `**Required action:** ${v.requiredAction}`);
  if (v.notes) lines.push("", `**Notes:** ${v.notes}`);
  return lines.join("\n");
}

// POST helper that tries each candidate base URL until one connects.
async function tinesPost(path: string, body: unknown): Promise<{ base: string; json: any }> {
  let lastError = "";
  for (const base of bases) {
    let response: Response;
    try {
      response = await fetch(`${base}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch (error) {
      lastError = `${base}: ${String(error)}`;
      continue;
    }
    if (!response.ok) {
      throw new Error(`${path} failed: ${response.status} ${await response.text()}`);
    }
    return { base, json: await response.json() };
  }
  throw new Error(`Could not reach the Tines API. ${lastError}`);
}

const seen = await readSeen();
const created: { cveID: string; case_id: number; url: string }[] = [];

try {
  for (const vuln of payload.newVulns) {
    const name = `${vuln.cveID}: ${vuln.vulnerabilityName ?? vuln.product ?? "Known Exploited Vulnerability"}`;

    const { base, json: caseJson } = await tinesPost("/api/v2/cases", {
      team_id: TEAM_ID,
      name,
      description: vuln.shortDescription ?? vuln.vulnerabilityName ?? vuln.cveID,
      priority: priorityFor(vuln),
      status: "open",
      tag_names: ["cisa-kev", "3b-automation"],
      metadata: {
        cve_id: vuln.cveID,
        vendor_project: vuln.vendorProject,
        product: vuln.product,
        date_added: vuln.dateAdded,
        due_date: vuln.dueDate,
        known_ransomware_campaign_use: vuln.knownRansomwareCampaignUse,
        catalog_version: payload.catalogVersion,
      },
    });

    const caseId = caseJson.case_id;
    if (!caseId) throw new Error(`Case for ${vuln.cveID} created without a case_id`);

    // Attach a details note. Reuse the base that answered the create call.
    const noteResponse = await fetch(`${base}/api/v2/cases/${caseId}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "KEV details", content: describe(vuln), color: "gold", position: 0 }),
    });
    if (!noteResponse.ok) {
      throw new Error(`Adding note to case ${caseId} failed: ${noteResponse.status} ${await noteResponse.text()}`);
    }

    created.push({ cveID: vuln.cveID, case_id: caseId, url: caseJson.url });
    console.error(`Created case ${caseId} for ${vuln.cveID}: ${caseJson.url}`);

    // Mark seen immediately so a later failure in this loop does not re-create this case.
    seen.add(vuln.cveID);
  }
} finally {
  // Persist whatever we managed to create, even if a later CVE threw.
  await writeSeen(seen);
}

console.log(
  JSON.stringify({
    mode: "incremental",
    catalogVersion: payload.catalogVersion ?? null,
    cases_created: created.length,
    cases: created,
  }),
);
