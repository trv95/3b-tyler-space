// Fetches cases from the Tines Cases API and returns a trimmed JSON payload
// for the CISO dashboard. Responds to an HTTP GET on /cases-data.

const BASE = (process.env.TINES_URL ?? "").replace("https://www.", "https://").replace(/\/$/, "");
const MAX_PAGES = 60; // safety cap
const PER_PAGE = 100; // small pages return far faster than large ones
const CONCURRENCY = 8;

async function fetchPage(page: number): Promise<{ cases: RawCase[]; pages: number } | null> {
  const url = `${BASE}/api/v2/cases?per_page=${PER_PAGE}&page=${page}&order=CREATED_DESC`;
  const res = await fetch(url, { headers: { "content-type": "application/json" } });
  if (!res.ok) {
    console.error(`Tines API ${res.status} on page ${page}: ${(await res.text()).slice(0, 300)}`);
    return null;
  }
  const data = (await res.json()) as { cases?: RawCase[]; meta?: { pages?: number } };
  return { cases: data.cases ?? [], pages: data.meta?.pages ?? 1 };
}

type RawCase = {
  case_id: number;
  name: string;
  status?: string;
  priority?: string;
  team?: { id: number; name: string };
  assignees?: { user_id: string; first_name?: string; last_name?: string; email?: string }[];
  tags?: { id: number; name: string }[];
  opened_at?: string | null;
  created_at?: string | null;
  resolved_at?: string | null;
  url?: string;
};

function httpResponse(status: number, body: unknown): string {
  const json = JSON.stringify(body);
  return [
    `HTTP/1.1 ${status} ${status === 200 ? "OK" : "Error"}`,
    "Content-Type: application/json",
    `Content-Length: ${Buffer.byteLength(json)}`,
    "Cache-Control: no-store",
    "",
    json,
  ].join("\r\n");
}

async function main() {
  if (!BASE) {
    process.stdout.write(httpResponse(500, { error: "TINES_URL is not configured" }));
    return;
  }

  const first = await fetchPage(1);
  if (!first) {
    process.stdout.write(httpResponse(502, { error: "Tines API request failed" }));
    return;
  }
  const collected: RawCase[] = [...first.cases];
  const totalPages = Math.min(first.pages, MAX_PAGES);

  // Fetch remaining pages in bounded-concurrency batches.
  const remaining = Array.from({ length: totalPages - 1 }, (_, i) => i + 2);
  for (let i = 0; i < remaining.length; i += CONCURRENCY) {
    const batch = remaining.slice(i, i + CONCURRENCY);
    const results = await Promise.all(batch.map((p) => fetchPage(p)));
    for (const r of results) if (r) collected.push(...r.cases);
  }

  const cases = collected.map((c) => ({
    id: c.case_id,
    name: c.name,
    status: (c.status ?? "").toUpperCase(),
    priority: (c.priority ?? "").toUpperCase(),
    team: c.team?.name ?? "Unassigned team",
    assignees: (c.assignees ?? []).map((a) => ({
      name: [a.first_name, a.last_name].filter(Boolean).join(" ") || a.email || "Unknown",
      email: a.email ?? "",
    })),
    tags: (c.tags ?? []).map((t) => t.name),
    opened_at: c.opened_at ?? null,
    created_at: c.created_at ?? null,
    resolved_at: c.resolved_at ?? null,
    url: c.url ?? null,
  }));

  console.error(`Fetched ${cases.length} cases across ${totalPages} page(s)`);
  process.stdout.write(httpResponse(200, { cases, fetched_at: new Date().toISOString() }));
}

main();
