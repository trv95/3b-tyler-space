// Entry step: emits a sample CrowdStrike Falcon detection.
// Trigger is an HTTP route, so stdin is a raw RFC 7230 request. We ignore the
// request except for an optional JSON body, whose fields are merged over the
// sample so testers can override values (e.g. severity).

const sample = {
  detection_id: "ldt:sample:0123456789abcdef",
  device: {
    hostname: "FIN-WKS-0426",
    local_ip: "10.14.22.87",
    external_ip: "203.0.113.45",
    platform_name: "Windows",
    os_version: "Windows 11",
  },
  behaviors: [
    {
      tactic: "Defense Evasion",
      technique: "Masquerading",
      severity: 70,
      filename: "svch0st.exe",
      filepath: "\\Device\\HarddiskVolume2\\Users\\Public\\svch0st.exe",
      cmdline: "svch0st.exe -enc SQBFAFgAIAA...",
      sha256: "44d88612fea8a8f36de82e1278abb02f",
      domain: "malware-c2.example.net",
    },
  ],
  // Top-level indicators pulled out for easy enrichment downstream.
  sha256: "275a021bbfb6489e54d471899f7db9d1663fc695ec2fe2a2c4538aabf651fd0f",
  domain: "malware-c2.example.net",
  local_ip: "10.14.22.87",
  external_ip: "203.0.113.45",
  severity: "high",
  status: "new",
  created_timestamp: "2026-07-20T14:30:00Z",
  detection_name: "Suspicious PowerShell download cradle",
};

function bodyFromRequest(raw: string): Record<string, unknown> {
  const sep = raw.indexOf("\r\n\r\n");
  if (sep === -1) return {};
  const body = raw.slice(sep + 4).trim();
  if (!body) return {};
  try {
    const parsed = JSON.parse(body);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

const raw = await Bun.stdin.text();
const overrides = bodyFromRequest(raw);

console.log(JSON.stringify({ ...sample, ...overrides }));
