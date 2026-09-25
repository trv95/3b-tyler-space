// Enriches the alert's source IP with recent urlscan.io scan activity.
const data = JSON.parse(await Bun.stdin.text());
const ip = data.alert?.sourceIp;

let urlscan: Record<string, unknown> = { queried: false };

if (ip) {
  const res = await fetch(
    `https://urlscan.io/api/v1/search/?q=ip:${encodeURIComponent(ip)}`,
    { headers: { accept: "application/json" } },
  );

  if (!res.ok) {
    const body = await res.text();
    console.error(`urlscan ${res.status}: ${body}`);
    urlscan = { queried: true, ok: false, status: res.status };
  } else {
    const us = (await res.json()) as any;
    const results = Array.isArray(us.results) ? us.results : [];
    const recent = results.slice(0, 5).map((r: any) => ({
      url: r.page?.url,
      domain: r.page?.domain,
      country: r.page?.country,
      server: r.page?.server,
      scannedAt: r.task?.time,
      link: r.result,
    }));

    urlscan = {
      queried: true,
      ok: true,
      ip,
      totalScans: us.total ?? results.length,
      uniqueDomains: [
        ...new Set(results.map((r: any) => r.page?.domain).filter(Boolean)),
      ],
      recent,
      link: `https://urlscan.io/search/#ip:${ip}`,
    };
  }
}

console.log(JSON.stringify({ ...data, urlscan }));
