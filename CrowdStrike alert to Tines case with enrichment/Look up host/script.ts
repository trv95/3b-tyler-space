const payload = JSON.parse(await Bun.stdin.text());
const deviceId = payload.device_id;
if (!deviceId) {
  console.error("Upstream payload had no device_id");
  process.exit(1);
}

const host = {
  device_id: deviceId,
  hostname: "CORP-WS-4471",
  platform_name: "Windows",
  os_version: "Windows 11 Enterprise",
  os_build: "22631.4169",
  product_type_desc: "Workstation",
  machine_domain: "corp.example.com",
  ou: ["Workstations", "Finance"],
  external_ip: "203.0.113.54",
  local_ip: "10.24.18.117",
  mac_address: "a4-bb-6d-2f-91-c3",
  agent_version: "7.18.19203.0",
  status: "normal",
  criticality: "high",
  first_seen: "2024-11-04T15:22:41Z",
  last_seen: "2026-09-09T18:44:02Z",
  last_login_user: "j.alvarez",
  last_login_timestamp: "2026-09-09T15:02:33Z",
  system_manufacturer: "Dell Inc.",
  system_product_name: "Latitude 7450",
  service_provider: "N/A",
  instance_id: "N/A",
  reduced_functionality_mode: "no",
  rtr_state: "ready",
  prevention_policy: "8f3c21d9a4b7461e9c05d8a2e6f14b73",
  tags: ["FalconGroupingTags/finance", "SensorGroupingTags/phase-2"],
};

console.error(`Sample host ${host.hostname} external IP ${host.external_ip}`);

console.log(JSON.stringify({ ...payload, host }));
