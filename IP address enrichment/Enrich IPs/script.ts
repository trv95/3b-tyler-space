// Enrich IP addresses with VirusTotal threat reputation.

function parseIps(raw: string): string[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];
  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) return parsed.map(String);
    if (parsed && typeof parsed === "object") {
      if (Array.isArray(parsed.ips)) return parsed.ips.map(String);
      if (parsed.ip) return [String(parsed.ip)];
    }
  } catch {
    // not JSON — fall through to delimiter parsing
  }
  return trimmed.split(/[\s,]+/).filter(Boolean);
}

async function enrich(ip: string) {
  const res = await fetch(
    `https://www.virustotal.com/api/v3/ip_addresses/${encodeURIComponent(ip)}`,
  );
  if (!res.ok) {
    return { ip, error: `HTTP ${res.status}`, detail: await res.text() };
  }
  const body = await res.json();
  const attr = body?.data?.attributes ?? {};
  const stats = attr.last_analysis_stats ?? {};
  return {
    ip,
    malicious: stats.malicious ?? 0,
    suspicious: stats.suspicious ?? 0,
    harmless: stats.harmless ?? 0,
    undetected: stats.undetected ?? 0,
    reputation: attr.reputation ?? null,
    asn: attr.asn ?? null,
    as_owner: attr.as_owner ?? null,
    country: attr.country ?? null,
    verdict: (stats.malicious ?? 0) > 0 ? "malicious" : (stats.suspicious ?? 0) > 0 ? "suspicious" : "clean",
  };
}

const ips = parseIps(await Bun.stdin.text());
if (ips.length === 0) {
  console.error("No IP addresses found in input.");
  process.exit(1);
}

const results = [];
for (const ip of ips) {
  results.push(await enrich(ip));
}

console.log(JSON.stringify(results, null, 2));
