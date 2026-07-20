// Create a Tines case from the enriched CrowdStrike detection.
// The `tines` connector injects auth automatically and provides TINES_URL.
// Docs: https://www.tines.com/docs/api/  (Cases API v2)

// TINES_URL sometimes carries a `www.` prefix that doesn't resolve for the
// tenant subdomain (e.g. www.tyler.tines.com); normalise to the bare host.
const TINES_URL = (process.env.TINES_URL ?? "")
  .replace(/\/$/, "")
  .replace(/:\/\/www\./, "://");
if (!TINES_URL) {
  console.error("TINES_URL is not set — is the tines connector attached?");
  process.exit(1);
}

type Verdict = "malicious" | "suspicious" | "harmless" | "unknown" | "error";

// Map the rolled-up VirusTotal verdict to a Tines case priority.
function priorityFor(verdict: Verdict | undefined): string {
  switch (verdict) {
    case "malicious":
      return "critical";
    case "suspicious":
      return "high";
    case "harmless":
      return "low";
    default:
      return "medium";
  }
}

function httpResponse(status: string, body: unknown): string {
  const payload = JSON.stringify(body, null, 2);
  return [
    `HTTP/1.1 ${status}`,
    "Content-Type: application/json",
    `Content-Length: ${Buffer.byteLength(payload)}`,
    "",
    payload,
  ].join("\r\n");
}

const detection = JSON.parse(await Bun.stdin.text());
const enrichment = detection.enrichment ?? { worst_verdict: "unknown", indicators: [] };
const indicators: Array<{
  indicator: string;
  type: string;
  verdict: Verdict;
  permalink: string | null;
}> = enrichment.indicators ?? [];

// Resolve a team_id — the Cases API requires one. List teams and use the first.
let teamId: number | null = null;
try {
  const res = await fetch(`${TINES_URL}/api/v1/teams`, {
    headers: { accept: "application/json" },
  });
  if (!res.ok) {
    const text = await res.text();
    console.log(httpResponse("502 Bad Gateway", {
      error: "Failed to list Tines teams",
      status: res.status,
      detail: text.slice(0, 500),
    }));
    process.exit(0);
  }
  const json: any = await res.json();
  teamId = json?.teams?.[0]?.id ?? null;
  console.error(`Using Tines team: ${json?.teams?.[0]?.name} (id ${teamId})`);
} catch (err) {
  console.log(httpResponse("502 Bad Gateway", {
    error: "Error listing Tines teams",
    detail: err instanceof Error ? err.message : String(err),
  }));
  process.exit(0);
}

if (teamId == null) {
  console.log(httpResponse("422 Unprocessable Entity", {
    error: "No Tines team available to create the case in",
  }));
  process.exit(0);
}

const priority = priorityFor(enrichment.worst_verdict);

const indicatorLines = indicators
  .map((i) => {
    const link = i.permalink ? ` ([VT](${i.permalink}))` : "";
    return `- **${i.type}** \`${i.indicator}\` → **${i.verdict}**${link}`;
  })
  .join("\n");

const description = [
  `**CrowdStrike detection:** ${detection.detection_name ?? "(unnamed)"}`,
  "",
  `- **Host:** ${detection.device?.hostname ?? "unknown"} (${detection.local_ip ?? "?"} / ${detection.external_ip ?? "?"})`,
  `- **Detection ID:** ${detection.detection_id ?? "n/a"}`,
  `- **CrowdStrike severity:** ${detection.severity ?? "n/a"}`,
  `- **VirusTotal worst verdict:** ${enrichment.worst_verdict}`,
  "",
  "**Enriched indicators**",
  indicatorLines || "_none_",
].join("\n");

const caseBody = {
  team_id: teamId,
  name: `[CrowdStrike] ${detection.detection_name ?? "Detection"} on ${detection.device?.hostname ?? "unknown host"}`,
  priority,
  status: "open",
  description,
  tag_names: ["crowdstrike", "virustotal", "automated"],
  // Tines metadata must be flat: string/number/bool/null values only.
  metadata: {
    source: "crowdstrike",
    detection_id: detection.detection_id ?? null,
    hostname: detection.device?.hostname ?? null,
    crowdstrike_severity: detection.severity ?? null,
    vt_worst_verdict: enrichment.worst_verdict,
    indicators: indicators.map((i) => `${i.type}:${i.indicator}=${i.verdict}`).join("; "),
  },
};

try {
  const res = await fetch(`${TINES_URL}/api/v2/cases/`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify(caseBody),
  });
  const text = await res.text();
  if (!res.ok) {
    console.log(httpResponse("502 Bad Gateway", {
      error: "Failed to create Tines case",
      status: res.status,
      detail: text.slice(0, 800),
    }));
    process.exit(0);
  }
  const created = JSON.parse(text);
  console.error(`Created Tines case case_id=${created?.case_id} priority=${priority}`);
  console.log(httpResponse("200 OK", {
    ok: true,
    case: {
      case_id: created?.case_id,
      name: created?.name,
      priority: created?.priority,
      status: created?.status,
      url: created?.url,
    },
    priority_reason: `VirusTotal worst verdict was "${enrichment.worst_verdict}"`,
  }));
} catch (err) {
  console.log(httpResponse("502 Bad Gateway", {
    error: "Error creating Tines case",
    detail: err instanceof Error ? err.message : String(err),
  }));
}
