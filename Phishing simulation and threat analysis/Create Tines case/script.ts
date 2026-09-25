const TEAM_ID = 107557;

const payload = JSON.parse(await Bun.stdin.text());
const { email, iocs, virustotal, analysis } = payload;

// The connector's TINES_URL is stored malformed ("https://https://www.tyler.tines.com"), so the
// scheme is de-duplicated and the "www." prefix dropped — Tines tenants are <tenant>.tines.com.
const base = (process.env.TINES_URL ?? "")
  .replace(/^(?:https?:\/\/)+/i, "https://")
  .replace(/^https:\/\/www\./i, "https://")
  .replace(/\/+$/, "");
if (base === "https://") throw new Error("TINES_URL is not set — is the Tines connector attached to this step?");

const priority =
  analysis.risk_score >= 85 ? "critical" : analysis.risk_score >= 65 ? "high" : analysis.risk_score >= 40 ? "medium" : "low";

const vt = (kind: string) => virustotal.results.filter((r: any) => r.kind === kind);
const verdictOf = (r: any) => {
  if (!r.found) return "not seen by VirusTotal";
  const m = r.stats?.malicious ?? 0;
  const s = r.stats?.suspicious ?? 0;
  const total = Object.values(r.stats ?? {}).reduce((a: number, b: any) => a + Number(b), 0);
  return `${m} malicious / ${s} suspicious of ${total} engines`;
};
const detailLine = (r: any) =>
  r.found
    ? Object.entries(r.details ?? {})
        .filter(([, v]) => v !== null && v !== undefined && !(typeof v === "object" && Object.keys(v as object).length === 0))
        .map(([k, v]) => `${k.replace(/_/g, " ")}: ${typeof v === "object" ? JSON.stringify(v) : v}`)
        .join(" · ")
    : "no VirusTotal record — treat as unknown, possibly newly registered";

const table = (rows: string[][], headers: string[]) =>
  [`| ${headers.join(" | ")} |`, `| ${headers.map(() => "---").join(" | ")} |`, ...rows.map((r) => `| ${r.join(" | ")} |`)].join("\n");

const description = [
  `**Simulated phishing report** received at \`${payload.report_inbox}\` from \`${payload.reported_by}\` on ${payload.reported_at}.`,
  "",
  `### AI risk score: ${analysis.risk_score}/100 — ${String(analysis.verdict).replace(/_/g, " ")} (confidence: ${analysis.confidence})`,
  "",
  analysis.summary,
  "",
  "**Justification**",
  ...analysis.justification.map((j: string) => `- ${j}`),
  "",
  "**Techniques observed**",
  ...(analysis.techniques ?? []).map((t: string) => `- ${t}`),
  "",
  "**Recommended actions**",
  ...(analysis.recommended_actions ?? []).map((a: string) => `- ${a}`),
  "",
  `_Analysis by ${analysis.model} at ${analysis.analyzed_at}. VirusTotal enrichment at ${virustotal.queried_at}._`,
].join("\n");

const messageBlock = [
  table(
    [
      ["Subject", `\`${email.subject}\``],
      ["From", `${email.from_display_name} \`<${email.from}>\``],
      ["Reply-To", `\`${email.reply_to || "none"}\``],
      ["Return-Path", `\`${email.return_path || "none"}\``],
      ["Recipient", `\`${email.to}\``],
      ["Date", email.date],
      ["Message-ID", `\`${email.message_id}\``],
      ["X-Mailer", email.x_mailer || "not set"],
      ["Authentication", `\`${email.authentication_results || "none"}\``],
    ],
    ["Field", "Value"],
  ),
  "",
  "**Received chain**",
  ...email.received_chain.map((r: string, i: number) => `${i + 1}. \`${r}\``),
  "",
  "**Body (defanged)**",
  "```",
  String(email.body_text).replace(/https?:\/\//gi, (m) => m.replace(/^http/i, "hxxp")).replace(/\./g, "[.]"),
  "```",
].join("\n");

const ipBlock = table(
  vt("ip").map((r: any) => {
    const source = iocs.ips.find((i: any) => i.ip === r.indicator)?.found_in.join(", ") ?? "";
    return [`\`${r.indicator}\``, source, verdictOf(r), detailLine(r)];
  }),
  ["Header IP", "Found in", "VirusTotal", "Details"],
);

const senderBlock = [
  `Sender addresses observed: ${iocs.sender_addresses.map((a: string) => `\`${a}\``).join(", ")}`,
  "",
  table(
    vt("domain").map((r: any) => [`\`${r.indicator}\``, verdictOf(r), detailLine(r)]),
    ["Domain", "VirusTotal", "Details"],
  ),
].join("\n");

const urlBlock = table(
  vt("url").map((r: any) => [`\`${String(r.indicator).replace(/^http/i, "hxxp")}\``, verdictOf(r), detailLine(r)]),
  ["URL (defanged)", "VirusTotal", "Details"],
);

const attachmentBlock = table(
  iocs.attachments.map((a: any) => {
    const r = vt("file").find((f: any) => String(f.indicator).includes(a.sha256));
    return [
      `\`${a.filename}\``,
      a.content_type,
      `${a.size_bytes} B`,
      `\`${a.sha256}\``,
      r ? verdictOf(r) : "not checked",
      r ? detailLine(r) : "",
    ];
  }),
  ["Filename", "Type", "Size", "SHA-256", "VirusTotal", "Details"],
);

const flagged = virustotal.summary.flagged;
const iocSummary = [
  `**${virustotal.summary.indicators_checked}** indicators checked, **${flagged.length}** flagged, worst detection count **${virustotal.summary.worst_detection_count}**.`,
  "",
  flagged.length
    ? table(
        flagged.map((f: any) => [f.kind, `\`${String(f.indicator).replace(/^http/i, "hxxp")}\``, String(f.malicious), String(f.suspicious)]),
        ["Type", "Indicator", "Malicious", "Suspicious"],
      )
    : "No indicator was flagged by any VirusTotal engine.",
  "",
  virustotal.summary.not_found_in_virustotal.length
    ? `Unknown to VirusTotal (no record): ${virustotal.summary.not_found_in_virustotal.map((i: string) => `\`${i}\``).join(", ")}`
    : "",
].join("\n");

const note = (title: string, content: string, color = "white") => ({
  title,
  block_type: "note",
  elements: [{ content, note_type: "text", color }],
});

const blocks: any[] = [
  note("Reported message", messageBlock),
  note("Enrichment summary", iocSummary, analysis.risk_score >= 65 ? "red" : "gold"),
  note("Header IP enrichment", ipBlock),
  note("Sender and domain enrichment", senderBlock),
  note("URL enrichment", urlBlock),
  note("Attachment enrichment", attachmentBlock),
  {
    title: "Evidence",
    block_type: "file",
    elements: [
      {
        filename: "reported_message.eml",
        file_contents: Buffer.from(payload.raw_email).toString("base64"),
        annotation: "Raw RFC 822 source of the reported message",
      },
      ...iocs.attachments.map((a: any) => ({
        filename: `${a.filename}.b64.txt`,
        file_contents: Buffer.from(a.content_base64).toString("base64"),
        annotation: `Base64-encoded attachment (SHA-256 ${a.sha256}) — kept encoded so it cannot execute`,
      })),
    ],
  },
];

const body = {
  team_id: TEAM_ID,
  name: `Reported phishing: ${email.subject} (risk ${analysis.risk_score}/100)`,
  description,
  priority,
  status: "open",
  tag_names: ["phishing", "simulation", String(analysis.verdict).replace(/_/g, "-")],
  metadata: {
    risk_score: analysis.risk_score,
    verdict: analysis.verdict,
    confidence: analysis.confidence,
    reported_by: payload.reported_by,
    sender: email.from,
    reply_to: email.reply_to,
    message_id: email.message_id,
    flagged_indicators: flagged.length,
    worst_detection_count: virustotal.summary.worst_detection_count,
    simulation: true,
  },
  tasks: (analysis.recommended_actions ?? []).slice(0, 6).map((a: string) => ({ description: a })),
  blocks,
};

const response = await fetch(`${base}/api/v2/cases`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
});

if (!response.ok) {
  throw new Error(`Tines case creation failed: ${response.status} ${await response.text()}`);
}

const created = await response.json();
console.error(`Created Tines case ${created.case_id} (${priority}) — ${created.url}`);
console.log(
  JSON.stringify({
    case_id: created.case_id,
    case_url: created.url,
    priority: created.priority,
    risk_score: analysis.risk_score,
    verdict: analysis.verdict,
    indicators_flagged: flagged.length,
  }),
);
