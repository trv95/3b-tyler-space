const base = (process.env.CROWD_STRIKE_URL ?? "https://api.crowdstrike.com").replace(/\/+$/, "");

const raw = await Bun.stdin.text();
let requestedId: string | undefined;
if (raw.trim()) {
  try {
    const parsed = JSON.parse(raw);
    requestedId = parsed?.composite_id ?? parsed?.alert_id;
  } catch {
    requestedId = raw.trim();
  }
}

async function json(response: Response, label: string) {
  if (!response.ok) {
    throw new Error(`${label} failed: ${response.status} ${await response.text()}`);
  }
  return response.json();
}

let compositeId = requestedId;
if (!compositeId) {
  const url = new URL(`${base}/alerts/queries/alerts/v2`);
  url.searchParams.set("limit", "1");
  url.searchParams.set("sort", "created_timestamp.desc");
  url.searchParams.set("filter", `product:'epp'+status:'new'`);
  const query = await json(await fetch(url), "Alert query");
  compositeId = query?.resources?.[0];
}

if (!compositeId) {
  console.error("No matching CrowdStrike alerts found.");
  process.exit(1);
}

const detail = await json(
  await fetch(`${base}/alerts/entities/alerts/v2`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ composite_ids: [compositeId] }),
  }),
  "Alert detail",
);

const alert = detail?.resources?.[0];
if (!alert) {
  console.error(`CrowdStrike returned no detail for ${compositeId}`);
  process.exit(1);
}

const deviceId = alert.device?.device_id ?? alert.agent_id;
console.error(`Alert ${compositeId} on device ${deviceId ?? "unknown"}`);

const summary = {
  composite_id: alert.composite_id,
  name: alert.name,
  display_name: alert.display_name,
  description: alert.description,
  severity: alert.severity,
  severity_name: alert.severity_name,
  confidence: alert.confidence,
  status: alert.status,
  objective: alert.objective,
  tactic: alert.tactic,
  technique: alert.technique,
  scenario: alert.scenario,
  pattern_disposition_description: alert.pattern_disposition_description,
  prevention_policy_name: alert.prevention_policy_name,
  created_timestamp: alert.created_timestamp,
  context_timestamp: alert.context_timestamp,
  falcon_host_link: alert.falcon_host_link,
  filename: alert.filename,
  filepath: alert.filepath,
  cmdline: alert.cmdline,
  sha256: alert.sha256,
  md5: alert.md5,
  user_name: alert.user_name,
  logon_domain: alert.logon_domain,
  parent_process: alert.parent_details
    ? {
        filename: alert.parent_details.filename,
        cmdline: alert.parent_details.cmdline,
        sha256: alert.parent_details.sha256,
        user_name: alert.parent_details.user_name,
      }
    : undefined,
  mitre_attack: alert.mitre_attack,
  global_prevalence: alert.global_prevalence,
  local_prevalence: alert.local_prevalence,
  remote_addresses: [
    ...new Set((alert.network_accesses ?? []).map((a: any) => a.remote_address).filter(Boolean)),
  ].slice(0, 15),
  dns_requests: [
    ...new Set((alert.dns_requests ?? []).map((d: any) => d.domain_name).filter(Boolean)),
  ].slice(0, 15),
};

console.log(JSON.stringify({ alert: summary, device_id: deviceId }));
