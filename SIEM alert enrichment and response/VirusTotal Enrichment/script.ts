// Enriches the alert's source IP with a VirusTotal IP report.
const data = JSON.parse(await Bun.stdin.text());
const ip = data.alert?.sourceIp;

let virustotal: Record<string, unknown> = { queried: false };

if (ip) {
  const res = await fetch(
    `https://www.virustotal.com/api/v3/ip_addresses/${encodeURIComponent(ip)}`,
    { headers: { accept: "application/json" } },
  );

  if (!res.ok) {
    const body = await res.text();
    console.error(`VirusTotal ${res.status}: ${body}`);
    virustotal = { queried: true, ok: false, status: res.status };
  } else {
    const vt = (await res.json()) as any;
    const attr = vt.data?.attributes ?? {};
    const stats = attr.last_analysis_stats ?? {};
    virustotal = {
      queried: true,
      ok: true,
      ip,
      reputation: attr.reputation,
      malicious: stats.malicious ?? 0,
      suspicious: stats.suspicious ?? 0,
      harmless: stats.harmless ?? 0,
      undetected: stats.undetected ?? 0,
      country: attr.country,
      asOwner: attr.as_owner,
      asn: attr.asn,
      tags: attr.tags ?? [],
      link: `https://www.virustotal.com/gui/ip-address/${ip}`,
    };
  }
}

console.log(JSON.stringify({ ...data, virustotal }));
