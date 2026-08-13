const payload = JSON.parse(await Bun.stdin.text());
const { iocs } = payload;

const BASE = "https://www.virustotal.com/api/v3";

type Lookup = { indicator: string; kind: string; found: boolean; stats?: Record<string, number>; details?: Record<string, unknown>; error?: string };

const urlId = (url: string) =>
  Buffer.from(url).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

async function lookup(kind: string, indicator: string, path: string, pick: (a: any) => Record<string, unknown>): Promise<Lookup> {
  const response = await fetch(`${BASE}${path}`, { headers: { accept: "application/json" } });

  if (response.status === 404) {
    return { indicator, kind, found: false };
  }
  if (!response.ok) {
    throw new Error(`VirusTotal ${kind} lookup for ${indicator} failed: ${response.status} ${await response.text()}`);
  }

  const attributes = (await response.json()).data.attributes;
  return {
    indicator,
    kind,
    found: true,
    stats: attributes.last_analysis_stats,
    details: pick(attributes),
  };
}

const tasks: Promise<Lookup>[] = [];

for (const { ip } of iocs.ips) {
  tasks.push(
    lookup("ip", ip, `/ip_addresses/${ip}`, (a) => ({
      as_owner: a.as_owner,
      asn: a.asn,
      country: a.country,
      network: a.network,
      reputation: a.reputation,
      votes: a.total_votes,
    })),
  );
}

for (const domain of iocs.domains) {
  tasks.push(
    lookup("domain", domain, `/domains/${encodeURIComponent(domain)}`, (a) => ({
      registrar: a.registrar,
      creation_date: a.creation_date ? new Date(a.creation_date * 1000).toISOString() : null,
      reputation: a.reputation,
      categories: a.categories,
      votes: a.total_votes,
    })),
  );
}

for (const url of iocs.urls) {
  tasks.push(
    lookup("url", url, `/urls/${urlId(url)}`, (a) => ({
      final_url: a.last_final_url,
      title: a.title,
      categories: a.categories,
      threat_names: a.threat_names,
      reputation: a.reputation,
      times_submitted: a.times_submitted,
    })),
  );
}

for (const attachment of iocs.attachments) {
  tasks.push(
    lookup("file", `${attachment.filename} (${attachment.sha256})`, `/files/${attachment.sha256}`, (a) => ({
      sha256: a.sha256,
      md5: a.md5,
      type_description: a.type_description,
      size: a.size,
      popular_threat_label: a.popular_threat_classification?.suggested_threat_label ?? null,
      names: (a.names ?? []).slice(0, 5),
      reputation: a.reputation,
    })),
  );
}

const results = await Promise.all(tasks);

const malicious = (r: Lookup) => (r.stats?.malicious ?? 0) + (r.stats?.suspicious ?? 0);
const flagged = results.filter((r) => malicious(r) > 0);

const enrichment = {
  queried_at: new Date().toISOString(),
  results,
  summary: {
    indicators_checked: results.length,
    not_found_in_virustotal: results.filter((r) => !r.found).map((r) => r.indicator),
    flagged: flagged.map((r) => ({
      indicator: r.indicator,
      kind: r.kind,
      malicious: r.stats?.malicious ?? 0,
      suspicious: r.stats?.suspicious ?? 0,
    })),
    worst_detection_count: flagged.length === 0 ? 0 : Math.max(...flagged.map(malicious)),
  },
};

console.error(
  `Checked ${results.length} indicators; ${flagged.length} flagged by at least one VirusTotal engine`,
);
console.log(JSON.stringify({ ...payload, virustotal: enrichment }));
