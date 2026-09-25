const payload = JSON.parse(await Bun.stdin.text());
const ip: string | undefined = payload.host?.external_ip;

if (!ip) {
  console.error("Host has no external IP; skipping urlscan enrichment");
  console.log(JSON.stringify({ ...payload, urlscan_enrichment: null }));
  process.exit(0);
}

const query = `page.ip:"${ip}"`;
const response = await fetch(
  `https://urlscan.io/api/v1/search/?q=${encodeURIComponent(query)}&size=20`,
);
if (!response.ok) {
  throw new Error(`urlscan search failed: ${response.status} ${await response.text()}`);
}

const body = await response.json();
const results: any[] = body.results ?? [];

const scans = results.map((r) => ({
  url: r.page?.url,
  domain: r.page?.domain,
  server: r.page?.server,
  country: r.page?.country,
  asn: r.page?.asn,
  asn_name: r.page?.asnname,
  scanned_at: r.task?.time,
  visibility: r.task?.visibility,
  tags: r.task?.tags,
  verdict_malicious: r.verdicts?.overall?.malicious === true,
  result_link: r.result,
  screenshot: r.screenshot,
}));

const uniqueDomains = [...new Set(scans.map((s) => s.domain).filter(Boolean))];
const maliciousCount = scans.filter((s) => s.verdict_malicious === true).length;

const enrichment = {
  ip,
  found: scans.length > 0,
  query,
  total_results: body.total ?? scans.length,
  returned: scans.length,
  malicious_scans: maliciousCount,
  unique_domains: uniqueDomains,
  link: `https://urlscan.io/search/#${encodeURIComponent(query)}`,
  recent_scans: scans.slice(0, 10),
};

console.error(
  `urlscan ${ip}: ${enrichment.total_results} scans, ${uniqueDomains.length} unique domains, ${maliciousCount} flagged malicious`,
);

console.log(JSON.stringify({ ...payload, urlscan_enrichment: enrichment }));
