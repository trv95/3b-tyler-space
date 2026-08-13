const TEAM_ID = 107557;

const payload = JSON.parse(await Bun.stdin.text());
const draft = payload.case_draft;
if (!draft) {
  console.error("Upstream payload had no case_draft");
  process.exit(1);
}

// The connector's TINES_URL is stored with a duplicated scheme and a "www." prefix that
// doesn't resolve, so derive candidate hosts rather than trusting the value verbatim.
function candidateBases(): string[] {
  const host = (process.env.TINES_URL ?? "").replace(/^(https?:\/\/)+/, "").replace(/\/+$/, "");
  if (!host) throw new Error("TINES_URL is not set");
  const hosts = [host];
  if (host.startsWith("www.") && host.split(".").length > 3) hosts.push(host.slice(4));
  return hosts.map((h) => `https://${h}`);
}

let base: string | undefined;
let created: any;
let lastError = "";

for (const candidate of candidateBases()) {
  let response: Response;
  try {
    response = await fetch(`${candidate}/api/v2/cases`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        team_id: TEAM_ID,
        name: draft.case_name,
        description: draft.description,
        priority: draft.priority,
        status: "open",
        tag_names: ["crowdstrike", "3b-automation"],
        metadata: {
          crowdstrike_composite_id: payload.alert?.composite_id,
          hostname: payload.host?.hostname,
          device_id: payload.device_id,
          external_ip: payload.host?.external_ip,
          falcon_link: payload.alert?.falcon_host_link,
        },
      }),
    });
  } catch (error) {
    lastError = `${candidate}: ${String(error)}`;
    continue;
  }
  if (!response.ok) {
    throw new Error(`Case creation failed: ${response.status} ${await response.text()}`);
  }
  base = candidate;
  created = await response.json();
  break;
}

if (!base || !created?.case_id) {
  throw new Error(`Could not reach the Tines API. ${lastError}`);
}

const caseId = created.case_id;
console.error(`Created case ${caseId}: ${created.url}`);

const notes = [
  { title: "Host details", content: draft.host_note, color: "blue", position: 0 },
  { title: "IP enrichment", content: draft.ip_note, color: "gold", position: 1 },
];

for (const note of notes) {
  const response = await fetch(`${base}/api/v2/cases/${caseId}/notes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(note),
  });
  if (!response.ok) {
    throw new Error(`Adding note "${note.title}" failed: ${response.status} ${await response.text()}`);
  }
  console.error(`Added note: ${note.title}`);
}

console.log(
  JSON.stringify({
    ...payload,
    tines_case: { case_id: caseId, url: created.url, name: created.name, priority: created.priority },
  }),
);
