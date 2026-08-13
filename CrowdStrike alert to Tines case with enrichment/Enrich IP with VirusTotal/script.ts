const payload = JSON.parse(await Bun.stdin.text());
const ip: string | undefined = payload.host?.external_ip;

if (!ip) {
  console.error("Host has no external IP; skipping VirusTotal enrichment");
  console.log(JSON.stringify({ ...payload, ip_enrichment: null }));
  process.exit(0);
}

const response = await fetch(`https://www.virustotal.com/api/v3/ip_addresses/${encodeURIComponent(ip)}`);
if (response.status === 404) {
  console.error(`VirusTotal has no record for ${ip}`);
  console.log(JSON.stringify({ ...payload, ip_enrichment: { ip, found: false } }));
  process.exit(0);
}
if (!response.ok) {
  throw new Error(`VirusTotal lookup failed: ${response.status} ${await response.text()}`);
}

const attributes = (await response.json())?.data?.attributes ?? {};
const stats = attributes.last_analysis_stats ?? {};
const flagged = Object.entries(attributes.last_analysis_results ?? {})
  .filter(([, r]: [string, any]) => r.category === "malicious" || r.category === "suspicious")
  .map(([engine, r]: [string, any]) => ({ engine, category: r.category, result: r.result }));

const enrichment = {
  ip,
  found: true,
  link: `https://www.virustotal.com/gui/ip-address/${ip}`,
  reputation: attributes.reputation,
  stats: {
    malicious: stats.malicious ?? 0,
    suspicious: stats.suspicious ?? 0,
    harmless: stats.harmless ?? 0,
    undetected: stats.undetected ?? 0,
    timeout: stats.timeout ?? 0,
  },
  as_owner: attributes.as_owner,
  asn: attributes.asn,
  network: attributes.network,
  country: attributes.country,
  continent: attributes.continent,
  rir: attributes.rir,
  jarm: attributes.jarm,
  total_votes: attributes.total_votes,
  last_analysis_date: attributes.last_analysis_date
    ? new Date(attributes.last_analysis_date * 1000).toISOString()
    : undefined,
  categories: attributes.categories,
  flagged_engines: flagged,
};

console.error(`VirusTotal ${ip}: ${enrichment.stats.malicious} malicious, ${enrichment.stats.suspicious} suspicious`);

console.log(JSON.stringify({ ...payload, ip_enrichment: enrichment }));
