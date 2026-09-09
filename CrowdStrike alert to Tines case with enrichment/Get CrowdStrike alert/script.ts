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

const deviceId = "9f2a1c4be7d84f0a91c6e5b3a7d21f88";
const compositeId = requestedId ?? `${deviceId}:ind:${deviceId}:38914571029-10303-27443456`;

const alert = {
  composite_id: compositeId,
  name: "CredentialDumpingViaLsass",
  display_name: "Credential Theft via LSASS Access",
  description:
    "A process read memory from lsass.exe in a manner consistent with credential dumping. This behavior is commonly used by adversaries to harvest account credentials for lateral movement.",
  severity: 90,
  severity_name: "High",
  confidence: 80,
  status: "new",
  objective: "Falcon Detection Method",
  tactic: "Credential Access",
  technique: "OS Credential Dumping",
  scenario: "credential_theft",
  pattern_disposition_description: "Detection, process termination blocked by policy.",
  prevention_policy_name: "Corporate Workstations - Phase 2",
  created_timestamp: "2026-09-09T18:41:12.482Z",
  context_timestamp: "2026-09-09T18:41:09.104Z",
  falcon_host_link: `https://falcon.us-2.crowdstrike.com/activity-v2/detections/${compositeId}`,
  filename: "rundll32.exe",
  filepath: "\\Device\\HarddiskVolume3\\Windows\\System32\\rundll32.exe",
  cmdline:
    "rundll32.exe C:\\Windows\\System32\\comsvcs.dll, MiniDump 728 C:\\Users\\Public\\tmp\\lsass.dmp full",
  sha256: "b8f2c1a90d6e4471a5c3f27de81b4a6c9e0d5378f41b26ca9d7e3f5081ac64b2",
  md5: "3a7f1d92c04b5e6789ab12cd34ef5601",
  user_name: "j.alvarez",
  logon_domain: "CORP",
  parent_process: {
    filename: "powershell.exe",
    cmdline: "powershell.exe -NoProfile -EncodedCommand JABlAD0AJwBoAHQAdABwADoALwAvADEAOAA1AC4A",
    sha256: "d4c9e7b31f8a4526bd07e91c2a53f0687d1b94ac35e8f620c7a9d4b18e30f5c7",
    user_name: "j.alvarez",
  },
  mitre_attack: [
    {
      tactic: "Credential Access",
      tactic_id: "TA0006",
      technique: "OS Credential Dumping",
      technique_id: "T1003",
    },
    {
      tactic: "Credential Access",
      tactic_id: "TA0006",
      technique: "LSASS Memory",
      technique_id: "T1003.001",
    },
  ],
  global_prevalence: "low",
  local_prevalence: "unique",
  remote_addresses: ["185.220.101.47", "45.133.1.238"],
  dns_requests: ["cdn-update-check.top", "pastebin.com"],
};

console.error(`Sample alert ${compositeId} on device ${deviceId}`);

console.log(JSON.stringify({ alert, device_id: deviceId }));
