// Fetches the CISA Known Exploited Vulnerabilities (KEV) catalog, diffs it against the
// set of CVE IDs we have already turned into Tines cases, and emits only the new ones.
//
// State lives in the shared named volume `cisa_kev_state` as a single JSON file of seen
// CVE IDs. This step mounts it read-only; the downstream "Create Tines cases" step is the
// sole writer and marks a CVE seen only after its case is created, so a Tines outage is
// retried rather than silently dropped.

const FEED_URL =
  "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json";
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

type Catalog = {
  catalogVersion?: string;
  dateReleased?: string;
  count?: number;
  vulnerabilities?: Vulnerability[];
};

const response = await fetch(FEED_URL, {
  headers: { Accept: "application/json" },
});
if (!response.ok) {
  throw new Error(`CISA feed request failed: ${response.status} ${await response.text()}`);
}

const catalog = (await response.json()) as Catalog;
const vulns = (catalog.vulnerabilities ?? []).filter((v) => v && v.cveID);
if (vulns.length === 0) {
  throw new Error("CISA feed returned no vulnerabilities — treating as an error, not an empty run");
}

// Read the set of CVE IDs we have already handled. Absence of the file means this is the
// first time the workflow has run against this (Live or draft) volume.
let seen = new Set<string>();
let firstRun = false;
const seenFile = Bun.file(SEEN_PATH);
if (await seenFile.exists()) {
  try {
    const parsed = JSON.parse(await seenFile.text());
    if (Array.isArray(parsed)) seen = new Set(parsed.map(String));
  } catch {
    throw new Error(`Could not parse ${SEEN_PATH}; refusing to run so state is not corrupted`);
  }
} else {
  firstRun = true;
}

const newVulns = vulns.filter((v) => !seen.has(v.cveID));
const allCveIDs = vulns.map((v) => v.cveID);

// First run: hand the full catalog to the downstream step to record as a baseline WITHOUT
// creating ~1,300 cases. Every later run only forwards genuinely new CVEs.
if (firstRun) {
  console.error(
    `Baseline: catalog ${catalog.catalogVersion ?? "?"} has ${vulns.length} vulnerabilities; ` +
      `seeding seen-set without creating cases.`,
  );
  console.log(
    JSON.stringify({
      mode: "baseline",
      catalogVersion: catalog.catalogVersion ?? null,
      dateReleased: catalog.dateReleased ?? null,
      allCveIDs,
      newVulns: [],
    }),
  );
} else if (newVulns.length === 0) {
  // Nothing new. Emit zero bytes so the case-creation step does not run.
  console.error(`No new KEV entries (catalog ${catalog.catalogVersion ?? "?"}).`);
} else {
  console.error(
    `${newVulns.length} new KEV entr${newVulns.length === 1 ? "y" : "ies"} ` +
      `(catalog ${catalog.catalogVersion ?? "?"}): ${newVulns.map((v) => v.cveID).join(", ")}`,
  );
  console.log(
    JSON.stringify({
      mode: "incremental",
      catalogVersion: catalog.catalogVersion ?? null,
      dateReleased: catalog.dateReleased ?? null,
      allCveIDs,
      newVulns,
    }),
  );
}
