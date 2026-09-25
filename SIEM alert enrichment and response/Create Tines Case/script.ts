// Creates a case in Tines from the enriched, summarized alert.
const data = JSON.parse(await Bun.stdin.text());
const alert = data.alert ?? {};
const vt = data.virustotal ?? {};
const logs = data.databricks ?? {};

// Base host is provided by the Tines connector via TINES_URL.
// TINES_URL can arrive with a duplicated scheme and/or a www. prefix, so normalize to a bare host.
const host = (process.env.TINES_URL || "")
  .trim()
  .replace(/\/+$/, "")
  .replace(/^(?:https?:\/*)+/i, "")
  .replace(/^www\./i, "");
if (!host) {
  console.error("TINES_URL is not set — attach the Tines connector to this step.");
  process.exit(1);
}
const base = `https://${host}`;

const jsonHeaders = { "content-type": "application/json", accept: "application/json" };

// Create cases in the "Demo" team.
const teamId = 19060;

const severityToPriority: Record<string, string> = {
  CRITICAL: "critical",
  HIGH: "high",
  MEDIUM: "medium",
  LOW: "low",
  INFO: "info",
};

// --- Case description: a concise, well-written incident overview ---
const description = [
  `## ${alert.title ?? "SIEM alert"}`,
  "",
  data.summary ?? alert.description ?? "",
  "",
  "### Alert details",
  "",
  "| Field | Value |",
  "| --- | --- |",
  `| Source | ${alert.source ?? "Panther"} |`,
  `| Rule | ${alert.rule ?? "—"} |`,
  `| Severity | ${alert.severity ?? "—"} |`,
  `| Affected user | ${alert.affectedUser ?? "—"} (${alert.affectedUserEmail ?? "—"}) |`,
  `| Source IP | ${alert.sourceIp ?? "—"} |`,
  `| Detected at | ${alert.detectedAt ?? "—"} |`,
  `| Panther alert ID | ${alert.id ?? "—"} |`,
].join("\n");

// --- Note block: VirusTotal IP enrichment findings ---
const vtVerdict =
  (vt.malicious ?? 0) > 0 ? "🔴 Malicious" : (vt.suspicious ?? 0) > 0 ? "🟠 Suspicious" : "🟢 Clean";
const vtContent = [
  `**Verdict:** ${vtVerdict}`,
  "",
  "| Indicator | Value |",
  "| --- | --- |",
  `| IP address | ${vt.ip ?? alert.sourceIp ?? "—"} |`,
  `| Malicious detections | ${vt.malicious ?? "n/a"} |`,
  `| Suspicious detections | ${vt.suspicious ?? "n/a"} |`,
  `| Harmless | ${vt.harmless ?? "n/a"} |`,
  `| Reputation score | ${vt.reputation ?? "n/a"} |`,
  `| Country | ${vt.country ?? "—"} |`,
  `| Network owner | ${vt.asOwner ?? "—"}${vt.asn ? ` (AS${vt.asn})` : ""} |`,
  `| Tags | ${(vt.tags ?? []).length ? (vt.tags as string[]).join(", ") : "—"} |`,
  "",
  vt.link ? `[View full VirusTotal report ↗](${vt.link})` : "",
].join("\n");

// --- Note block: Databricks related logs as a markdown table ---
const cols: string[] = logs.columns ?? [];
const rows: Record<string, unknown>[] = logs.rows ?? [];
let logsContent: string;
if (rows.length && cols.length) {
  const header = `| ${cols.join(" | ")} |`;
  const divider = `| ${cols.map(() => "---").join(" | ")} |`;
  const tableBody = rows
    .slice(0, 25)
    .map((r) => `| ${cols.map((c) => String(r[c] ?? "")).join(" | ")} |`)
    .join("\n");
  logsContent = [
    `Correlated **${logs.rowCount ?? rows.length}** recent event(s) for \`${alert.affectedUserEmail ?? alert.affectedUser}\` from \`${logs.table ?? "Databricks"}\`.`,
    "",
    header,
    divider,
    tableBody,
  ].join("\n");
} else {
  logsContent =
    logs.ok === false
      ? `⚠️ Databricks enrichment failed: ${logs.error ?? "unknown error"}`
      : "No related Databricks log activity found for this user.";
}

const body = {
  team_id: teamId,
  name: `[${alert.severity ?? "ALERT"}] ${alert.title ?? "SIEM alert"}`,
  priority: severityToPriority[String(alert.severity).toUpperCase()] ?? "medium",
  status: "open",
  description,
  tag_names: ["siem", "panther", "enriched"],
  blocks: [
    {
      title: "Threat intelligence — VirusTotal",
      block_type: "note",
      elements: [
        { content: vtContent, note_type: "text", color: (vt.malicious ?? 0) > 0 ? "red" : "gold" },
      ],
    },
    {
      title: "Related activity — Databricks logs",
      block_type: "note",
      elements: [{ content: logsContent, note_type: "text", color: "blue" }],
    },
  ],
};

const res = await fetch(`${base}/api/v2/cases/`, {
  method: "POST",
  headers: jsonHeaders,
  body: JSON.stringify(body),
});

if (!res.ok) {
  console.error(`Tines create case ${res.status}: ${await res.text()}`);
  process.exit(1);
}

const created = (await res.json()) as any;
const id = created.case_id;
const link = created.url || (base ? `${base}/cases/${id}` : String(id));

console.error(`Created Tines case ${id}: ${link}`);
console.log(JSON.stringify({ ...data, case: { id, link } }));
