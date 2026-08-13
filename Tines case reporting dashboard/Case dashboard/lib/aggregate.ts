import type { CaseRecord } from "./types";
import { PRIORITIES } from "./types";
import { caseDate, valuesOf, type Dimension } from "./filters";

export type Bucket = { key: string; label: string; total: number; parts: Record<string, number> };

export function tally(cases: CaseRecord[], dim: Dimension): Map<string, number> {
  const m = new Map<string, number>();
  for (const c of cases) for (const v of valuesOf(c, dim)) m.set(v, (m.get(v) ?? 0) + 1);
  return m;
}

export function rankedBreakdown(
  cases: CaseRecord[],
  dim: Dimension,
  limit: number,
): { key: string; total: number; parts: Record<string, number> }[] {
  const totals = new Map<string, { total: number; parts: Record<string, number> }>();
  for (const c of cases) {
    for (const v of valuesOf(c, dim)) {
      const entry = totals.get(v) ?? { total: 0, parts: {} };
      entry.total += 1;
      entry.parts[c.priority] = (entry.parts[c.priority] ?? 0) + 1;
      totals.set(v, entry);
    }
  }
  return [...totals.entries()]
    .map(([key, v]) => ({ key, ...v }))
    .sort((a, b) => b.total - a.total || a.key.localeCompare(b.key))
    .slice(0, limit);
}

function startOfDay(t: number): number {
  const d = new Date(t);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

function startOfWeek(t: number): number {
  const d = new Date(startOfDay(t));
  const dow = (d.getUTCDay() + 6) % 7;
  return d.getTime() - dow * 86_400_000;
}

function startOfMonth(t: number): number {
  const d = new Date(t);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1);
}

export function bucketStart(t: number, granularity: "day" | "week" | "month"): number {
  if (granularity === "day") return startOfDay(t);
  if (granularity === "week") return startOfWeek(t);
  return startOfMonth(t);
}

export function nextBucket(t: number, granularity: "day" | "week" | "month"): number {
  if (granularity === "day") return t + 86_400_000;
  if (granularity === "week") return t + 7 * 86_400_000;
  const d = new Date(t);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1);
}

export function bucketLabel(t: number, granularity: "day" | "week" | "month"): string {
  const d = new Date(t);
  if (granularity === "month") {
    return d.toLocaleDateString("en-US", { month: "short", year: "2-digit", timeZone: "UTC" });
  }
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

export function timeSeries(
  cases: CaseRecord[],
  granularity: "day" | "week" | "month",
  bounds: { start: number; end: number },
  now = Date.now(),
): Bucket[] {
  const times = cases.map(caseDate).filter((t) => Number.isFinite(t));
  if (times.length === 0) return [];

  const lo = bucketStart(
    Number.isFinite(bounds.start) ? Math.max(bounds.start, Math.min(...times)) : Math.min(...times),
    granularity,
  );
  const hi = bucketStart(
    Number.isFinite(bounds.end) ? Math.min(bounds.end, now) : Math.max(now, Math.max(...times)),
    granularity,
  );

  const buckets: Bucket[] = [];
  const index = new Map<number, Bucket>();
  for (let t = lo, guard = 0; t <= hi && guard < 2000; t = nextBucket(t, granularity), guard++) {
    const b: Bucket = {
      key: String(t),
      label: bucketLabel(t, granularity),
      total: 0,
      parts: {},
    };
    buckets.push(b);
    index.set(t, b);
  }

  for (const c of cases) {
    const t = caseDate(c);
    if (!Number.isFinite(t)) continue;
    const b = index.get(bucketStart(t, granularity));
    if (!b) continue;
    b.total += 1;
    b.parts[c.priority] = (b.parts[c.priority] ?? 0) + 1;
  }

  return buckets;
}

export function presentPriorities(cases: CaseRecord[]): string[] {
  const seen = new Set(cases.map((c) => c.priority));
  return PRIORITIES.filter((p) => seen.has(p));
}

export function percentile(sorted: number[], p: number): number | null {
  if (sorted.length === 0) return null;
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

export function resolutionStats(cases: CaseRecord[]) {
  const hours = cases
    .map((c) => c.resolutionHours)
    .filter((h): h is number => typeof h === "number" && Number.isFinite(h))
    .sort((a, b) => a - b);
  return {
    n: hours.length,
    hours,
    p50: percentile(hours, 0.5),
    p90: percentile(hours, 0.9),
    mean: hours.length ? hours.reduce((a, b) => a + b, 0) / hours.length : null,
  };
}

export function ageHours(c: CaseRecord, now = Date.now()): number | null {
  const opened = c.openedAt ?? c.createdAt;
  if (!opened) return null;
  const t = Date.parse(opened);
  if (!Number.isFinite(t)) return null;
  return (now - t) / 3_600_000;
}

export function toCsv(cases: CaseRecord[]): string {
  const headers = [
    "case_id",
    "name",
    "status",
    "sub_status",
    "priority",
    "team",
    "assignees",
    "tags",
    "mitre_tactics",
    "mitre_techniques",
    "opened_at",
    "resolved_at",
    "resolution_hours",
    "open_tasks",
    "sla_exceeded",
    "url",
  ];
  const cell = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
  };
  const rows = cases.map((c) =>
    [
      c.id,
      c.name,
      c.status,
      c.subStatus ?? "",
      c.priority,
      c.team,
      c.assignees.map((a) => a.name).join("; "),
      c.tags.join("; "),
      c.tactics.join("; "),
      c.techniques.join("; "),
      c.openedAt ?? "",
      c.resolvedAt ?? "",
      c.resolutionHours ?? "",
      c.openTaskCount,
      c.slaExceeded ? "yes" : "no",
      c.url ?? "",
    ]
      .map(cell)
      .join(","),
  );
  return [headers.join(","), ...rows].join("\n");
}
