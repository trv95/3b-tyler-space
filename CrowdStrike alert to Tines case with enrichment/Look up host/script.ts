const base = (process.env.CROWD_STRIKE_URL ?? "https://api.crowdstrike.com").replace(/\/+$/, "");

const payload = JSON.parse(await Bun.stdin.text());
const deviceId = payload.device_id;
if (!deviceId) {
  console.error("Upstream payload had no device_id");
  process.exit(1);
}

const response = await fetch(`${base}/devices/entities/devices/v2?ids=${encodeURIComponent(deviceId)}`);
if (!response.ok) {
  throw new Error(`Device lookup failed: ${response.status} ${await response.text()}`);
}
const device = (await response.json())?.resources?.[0];
if (!device) {
  console.error(`No device record for ${deviceId}`);
  process.exit(1);
}

const host = {
  device_id: device.device_id,
  hostname: device.hostname,
  platform_name: device.platform_name,
  os_version: device.os_version,
  os_build: device.os_build,
  product_type_desc: device.product_type_desc,
  machine_domain: device.machine_domain,
  ou: device.ou,
  external_ip: device.external_ip,
  local_ip: device.local_ip,
  mac_address: device.mac_address,
  agent_version: device.agent_version,
  status: device.status,
  criticality: device.criticality,
  first_seen: device.first_seen,
  last_seen: device.last_seen,
  last_login_user: device.last_login_user,
  last_login_timestamp: device.last_login_timestamp,
  system_manufacturer: device.system_manufacturer,
  system_product_name: device.system_product_name,
  service_provider: device.service_provider,
  instance_id: device.instance_id,
  reduced_functionality_mode: device.reduced_functionality_mode,
  rtr_state: device.rtr_state,
  prevention_policy: device.device_policies?.prevention?.policy_id,
  tags: device.tags,
};

console.error(`Host ${host.hostname} external IP ${host.external_ip ?? "none"}`);

console.log(JSON.stringify({ ...payload, host }));
