const VOLUME = "/storage/tines_case_cache";
const CACHE = `${VOLUME}/cases.json`;
const PER_PAGE = 500;

type Json = Record<string, any>;

// The connector's TINES_URL is not guaranteed to be a clean origin (it can carry a
// duplicated scheme or a hostname variant that does not resolve), so probe candidates.
async function resolveBase(): Promise<string> {
  let host = (process.env.TINES_URL ?? "").trim();
  while (/^https?:\/\//i.test(host)) host = host.replace(/^https?:\/\//i, "");
  host = host.replace(/\/.*$/, "");
  if (!host) throw new Error("TINES_URL is not set on the Tines connector");

  const candidates = [host];
  if (host.startsWith("www.")) candidates.push(host.slice(4));
  else candidates.push(`www.${host}`);

  const failures: string[] = [];
  for (const candidate of candidates) {
    const base = `https://${candidate}`;
    try {
      const res = await fetch(`${base}/api/v2/cases?per_page=1`, {
        headers: { "content-type": "application/json" },
      });
      if (res.ok) return base;
      failures.push(`${base} -> HTTP ${res.status}`);
    } catch (err) {
      failures.push(`${base} -> ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  throw new Error(`Could not reach the Tines API. Tried: ${failures.join("; ")}`);
}

async function getWithRetry(url: string): Promise<Response> {
  let lastError = "";
  for (let attempt = 0; attempt < 4; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 500 * 2 ** attempt));
    try {
      const res = await fetch(url, { headers: { "content-type": "application/json" } });
      if (res.ok) return res;
      if (res.status < 500 && res.status !== 429) {
        throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
      }
      lastError = `HTTP ${res.status}`;
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      if (lastError.startsWith("HTTP 4")) throw err;
    }
  }
  throw new Error(`${url} failed after 4 attempts: ${lastError}`);
}

const TACTICS = new Set([
  "Reconnaissance",
  "Resource Development",
  "Initial Access",
  "Execution",
  "Persistence",
  "Privilege Escalation",
  "Defense Evasion",
  "Credential Access",
  "Discovery",
  "Lateral Movement",
  "Collection",
  "Command and Control",
  "Exfiltration",
  "Impact",
]);

type Classified = { techniques: string[]; tactics: string[]; labels: string[] };

function classifyTags(tags: { name?: string }[]): Classified {
  const techniques = new Set<string>();
  const tactics = new Set<string>();
  const labels = new Set<string>();

  for (const tag of tags) {
    const raw = (tag?.name ?? "").trim();
    if (!raw || raw === ":") continue;

    const parts = raw.split(":").map((p) => p.trim()).filter(Boolean);
    let matched = false;
    for (const part of parts) {
      if (/^T\d{4}(\.\d{3})?$/i.test(part)) {
        techniques.add(part.toUpperCase());
        matched = true;
      } else if (TACTICS.has(part)) {
        tactics.add(part);
        matched = true;
      }
    }
    if (!matched && parts.length) labels.add(parts.join(": "));
  }

  return { techniques: [...techniques], tactics: [...tactics], labels: [...labels] };
}

function person(u: Json | null | undefined) {
  if (!u) return null;
  const name = [u.first_name, u.last_name].filter(Boolean).join(" ").trim();
  return { name: name || u.email || "Unknown", email: u.email ?? null };
}

function slim(c: Json) {
  const tags = Array.isArray(c.tags) ? c.tags : [];
  const { techniques, tactics, labels } = classifyTags(tags);
  const assignees = (Array.isArray(c.assignees) ? c.assignees : [])
    .map(person)
    .filter(Boolean);
  const tasks = Array.isArray(c.tasks) ? c.tasks : [];
  const slas = Array.isArray(c.slas) ? c.slas : [];

  const openedAt = c.opened_at ?? c.created_at ?? null;
  const resolvedAt = c.resolved_at ?? null;
  const resolutionHours =
    openedAt && resolvedAt
      ? (Date.parse(resolvedAt) - Date.parse(openedAt)) / 3_600_000
      : null;

  return {
    id: c.case_id,
    name: c.name ?? `Case ${c.case_id}`,
    url: c.url ?? null,
    status: c.status ?? "UNKNOWN",
    subStatus: c.sub_status?.name ?? null,
    priority: c.priority ?? "UNSET",
    team: c.team?.name ?? "No team",
    teamId: c.team?.id ?? null,
    author: person(c.author),
    assignees,
    tags: tags.map((t: Json) => t.name).filter((n: unknown) => typeof n === "string" && n !== ":"),
    techniques,
    tactics,
    otherLabels: labels,
    openedAt,
    resolvedAt,
    createdAt: c.created_at ?? null,
    updatedAt: c.updated_at ?? null,
    resolutionHours: resolutionHours != null && Number.isFinite(resolutionHours) ? Math.max(0, Number(resolutionHours.toFixed(2))) : null,
    slaExceeded: slas.some((s: Json) => s?.exceeded === true),
    slaWarning: slas.some((s: Json) => s?.exceeded !== true && Number(s?.percent_elapsed ?? 0) >= 75),
    slaTypes: slas.map((s: Json) => s?.sla_type).filter(Boolean),
    taskCount: tasks.length,
    openTaskCount: tasks.filter((t: Json) => !(t?.completed ?? t?.is_completed ?? false)).length,
    linkedCaseCount: Array.isArray(c.linked_cases) ? c.linked_cases.length : 0,
    metadataKeys: c.metadata && typeof c.metadata === "object" ? Object.keys(c.metadata) : [],
  };
}

const base = await resolveBase();
const cases: Json[] = [];
let pages = 1;

for (let page = 1; page <= 200; page++) {
  const url = `${base}/api/v2/cases?per_page=${PER_PAGE}&page=${page}&order=CREATED_DESC`;
  const body = (await (await getWithRetry(url)).json()) as Json;
  const batch: Json[] = Array.isArray(body.cases) ? body.cases : [];
  cases.push(...batch);
  pages = Number(body.meta?.pages ?? page);
  if (!body.meta?.next_page_number || batch.length === 0) break;
}

if (cases.length === 0) {
  throw new Error("Tines returned zero cases; leaving the existing cache in place");
}

const payload = {
  fetchedAt: new Date().toISOString(),
  tenant: base,
  caseCount: cases.length,
  pagesFetched: pages,
  cases: cases.map(slim),
};

await Bun.write(CACHE, JSON.stringify(payload));

console.error(`Cached ${payload.caseCount} cases from ${base}`);

const body = JSON.stringify({
  ok: true,
  caseCount: payload.caseCount,
  fetchedAt: payload.fetchedAt,
});

process.stdout.write(
  [
    "HTTP/1.1 200 OK",
    "Content-Type: application/json",
    `Content-Length: ${Buffer.byteLength(body)}`,
    "",
    body,
  ].join("\r\n"),
);
