const TEAM_ID = 107557;
const WORKFLOW_ORIGIN = "https://tyler-space.se-demo.3b.run";
const ISOLATE_EXTERNAL_ID = "galkQc8e1HeZ19PCEvnJF";
const HUNT_EXTERNAL_ID = "I3Ifo-n2Q_fStwGDwLjWk";

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

const branch = process.env._3B_BRANCH_ID;
const actionUrl = (path: string) => `${WORKFLOW_ORIGIN}${path}${branch ? `?branch=${branch}` : ""}`;

const hash = payload.alert?.sha256 ?? payload.alert?.md5;

const caseActions = [
  {
    label: "Isolate Host",
    action_text: "Isolate Host",
    action_type: "webhook",
    url: actionUrl("/cs-isolate-host"),
    query_params: {
      external_id: ISOLATE_EXTERNAL_ID,
      case_id: String(caseId),
      hostname: payload.host?.hostname ?? "",
      device_id: payload.device_id ?? "",
    },
  },
  {
    label: "Hunt Hash",
    action_text: "Hunt Hash",
    action_type: "webhook",
    url: actionUrl("/cs-hunt-hash"),
    query_params: {
      external_id: HUNT_EXTERNAL_ID,
      case_id: String(caseId),
      sha256: payload.alert?.sha256 ?? "",
      md5: payload.alert?.md5 ?? "",
      filename: payload.alert?.filename ?? "",
    },
  },
];

const createdActions: { label: string; id: number }[] = [];

for (const action of caseActions) {
  const response = await fetch(`${base}/api/v2/cases/${caseId}/actions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(action),
  });
  if (!response.ok) {
    throw new Error(`Creating case action "${action.label}" failed: ${response.status} ${await response.text()}`);
  }
  const createdAction = await response.json();

  // The handler removes its own action when clicked, so it needs the id it can only learn now.
  const update = await fetch(`${base}/api/v2/cases/${caseId}/actions/${createdAction.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query_params: { ...action.query_params, action_id: String(createdAction.id) } }),
  });
  if (!update.ok) {
    throw new Error(`Updating case action "${action.label}" failed: ${update.status} ${await update.text()}`);
  }

  createdActions.push({ label: action.label, id: createdAction.id });
  console.error(`Added case action: ${action.label} (${createdAction.id})`);
}

if (!hash) {
  console.error("Alert carried no file hash — the Hunt Hash action will report that.");
}

console.log(
  JSON.stringify({
    ...payload,
    tines_case: {
      case_id: caseId,
      url: created.url,
      name: created.name,
      priority: created.priority,
      actions: createdActions,
    },
  }),
);
