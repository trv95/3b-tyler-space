import { tines } from "./tines";
import { findActor, httpResponse, readRequest } from "./request";

const request = await readRequest();
console.error(`Hunt Hash clicked: ${request.body.slice(0, 2000)}`);

const caseId = request.params.get("case_id");
const actionId = request.params.get("action_id");
const hash = request.params.get("sha256") || request.params.get("md5");
const filename = request.params.get("filename");

if (!caseId) {
  console.log(httpResponse("400 Bad Request", JSON.stringify({ error: "case_id is required" })));
  process.exit(1);
}

if (actionId) {
  await tines(`/api/v2/cases/${caseId}/actions/${actionId}`, { method: "DELETE" });
  console.error(`Removed case action ${actionId}`);
}

const actor = findActor(request.json, request.headers);
const huntedAt = new Date().toISOString();

async function lookup(value: string) {
  const response = await fetch(`https://www.virustotal.com/api/v3/files/${encodeURIComponent(value)}`);
  if (response.status === 404) return undefined;
  if (!response.ok) {
    throw new Error(`VirusTotal lookup failed: ${response.status} ${await response.text()}`);
  }
  return (await response.json())?.data?.attributes;
}

let content: string;

if (!hash) {
  content = `No file hash was available on this alert, so no hash hunt could be run.\n\nRequested by ${actor} at ${huntedAt}.`;
} else {
  const attributes = await lookup(hash);
  if (!attributes) {
    content = [
      `VirusTotal has no record of \`${hash}\`.`,
      "",
      `[Search VirusTotal](https://www.virustotal.com/gui/search/${encodeURIComponent(hash)})`,
      "",
      `Hunted by ${actor} at ${huntedAt}.`,
    ].join("\n");
  } else {
    const stats = attributes.last_analysis_stats ?? {};
    const flagged = Object.entries(attributes.last_analysis_results ?? {})
      .filter(([, r]: [string, any]) => r.category === "malicious" || r.category === "suspicious")
      .map(([engine, r]: [string, any]) => `${engine}: ${r.result ?? r.category}`)
      .slice(0, 15);
    const names: string[] = (attributes.names ?? []).slice(0, 5);

    content = [
      `| Field | Value |`,
      `| --- | --- |`,
      `| Hash | \`${hash}\` |`,
      `| File name | ${filename ?? names[0] ?? "unknown"} |`,
      `| Type | ${attributes.type_description ?? "unknown"} |`,
      `| Size | ${attributes.size ?? "unknown"} bytes |`,
      `| Verdicts | ${stats.malicious ?? 0} malicious / ${stats.suspicious ?? 0} suspicious / ${stats.harmless ?? 0} harmless / ${stats.undetected ?? 0} undetected |`,
      `| Reputation | ${attributes.reputation ?? "n/a"} |`,
      `| Popular label | ${attributes.popular_threat_classification?.suggested_threat_label ?? "none"} |`,
      `| First seen | ${attributes.first_submission_date ? new Date(attributes.first_submission_date * 1000).toISOString() : "unknown"} |`,
      `| Last analysed | ${attributes.last_analysis_date ? new Date(attributes.last_analysis_date * 1000).toISOString() : "unknown"} |`,
      `| SHA-256 | \`${attributes.sha256 ?? hash}\` |`,
      `| MD5 | \`${attributes.md5 ?? "unknown"}\` |`,
      "",
      flagged.length ? `**Flagged by:** ${flagged.join(", ")}` : "**Flagged by:** no engine flagged this file.",
      names.length > 1 ? `\n**Other observed names:** ${names.join(", ")}` : "",
      "",
      `[VirusTotal report](https://www.virustotal.com/gui/file/${encodeURIComponent(attributes.sha256 ?? hash)})`,
      "",
      `Hunted by ${actor} at ${huntedAt}.`,
    ].join("\n");
  }
}

await tines(`/api/v2/cases/${caseId}/notes`, {
  method: "POST",
  body: JSON.stringify({ title: "File hash enrichment", content, color: "gold" }),
});

console.error(`Added hash enrichment note to case ${caseId}`);

console.log(httpResponse("200 OK", JSON.stringify({ case_id: Number(caseId), hash, hunted_by: actor })));
