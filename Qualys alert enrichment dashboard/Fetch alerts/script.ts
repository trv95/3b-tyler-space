const base = process.env.WORKFLOW_URL!.replace(/\/$/, "");

function jsonResponse(status: number, body: unknown): string {
  const payload = JSON.stringify(body);
  return [
    `HTTP/1.1 ${status} ${status === 200 ? "OK" : "Error"}`,
    "Content-Type: application/json; charset=utf-8",
    `Content-Length: ${Buffer.byteLength(payload)}`,
    "Cache-Control: no-store",
    "",
    payload,
  ].join("\r\n");
}

async function getJson(path: string): Promise<any> {
  const r = await fetch(base + path);
  if (!r.ok) throw new Error(`GET ${path} -> ${r.status}: ${(await r.text()).slice(0, 200)}`);
  return r.json();
}

function groupBy<T>(rows: T[], key: (r: T) => string | undefined): Map<string, T[]> {
  const m = new Map<string, T[]>();
  for (const row of rows) {
    const k = key(row);
    if (!k) continue;
    (m.get(k) ?? m.set(k, []).get(k)!).push(row);
  }
  return m;
}

try {
  // 1) All Qualys findings (the alerts).
  const qualys = await getJson("/vulndata/qualys?limit=500");
  const records: any[] = qualys.records ?? [];

  // 2) Enrich EVERY finding in a single call — the API now accepts a list of
  //    keys (repeated params) and returns a joined view across all of them.
  const services = [...new Set(records.map((r) => r.service).filter(Boolean))] as string[];
  const params = new URLSearchParams();
  for (const s of services) params.append("service", s);
  const enriched = services.length
    ? await getJson(`/vulndata/enrich?${params.toString()}`)
    : { owners: [], qualys: [], securityCentral: [], bugdb: [] };

  // Index the joined result so each finding can be assembled locally.
  const ownerByService = new Map<string, any>();
  for (const o of enriched.owners ?? []) ownerByService.set(o.service, o);
  const scByQid = groupBy<any>(enriched.securityCentral ?? [], (x) => x.qid);
  const bugByBug = groupBy<any>(enriched.bugdb ?? [], (x) => x.bug);
  const bugByFinding = groupBy<any>(enriched.bugdb ?? [], (x) => x.sourceFinding);
  const qualysByFinding = groupBy<any>(enriched.qualys ?? [], (x) => x.findingId);

  // 3) Assemble each alert with its own enrichment slice + resolved owner.
  const alerts = records.map((rec) => {
    const bugdb = rec.bug ? bugByBug.get(rec.bug) ?? [] : bugByFinding.get(rec.findingId) ?? [];
    const enrich = {
      qualys: qualysByFinding.get(rec.findingId) ?? [rec],
      securityCentral: rec.qid ? scByQid.get(rec.qid) ?? [] : [],
      bugdb,
      owners: rec.service && ownerByService.has(rec.service) ? [ownerByService.get(rec.service)] : [],
    };
    const owner = ownerByService.get(rec.service) ?? null;
    return { alert: rec, enrich, owner };
  });

  console.log(
    jsonResponse(200, {
      generatedAt: new Date().toISOString(),
      count: alerts.length,
      alerts,
    })
  );
} catch (e) {
  console.error(e);
  console.log(jsonResponse(500, { error: String(e) }));
}
