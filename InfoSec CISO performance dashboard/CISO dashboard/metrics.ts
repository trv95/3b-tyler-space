export type Incident = {
  number: string;
  assigned_to: string;
  tier: string;
  priority: string;
  category: string;
  business_service: string;
  contact_type: string;
  state: string;
  opened_at: string;
  responded_at: string | null;
  resolved_at: string | null;
  response_sla_hours: number;
  resolution_sla_hours: number;
  reassignment_count: number;
  reopen_count: number;
  major_incident: boolean;
  short_description: string;
};

export type Dataset = {
  generated_at: string;
  window_start: string;
  assignment_group: string;
  source: string;
  analysts: { name: string; tier: string }[];
  sla_targets: Record<string, [number, number]>;
  incidents: Incident[];
};

export type Row = Incident & {
  opened: number;
  resolved: number | null;
  responseHours: number | null;
  resolveHours: number | null;
  respondedInSla: boolean | null;
  resolvedInSla: boolean | null;
  ageHours: number;
};

export const PRIORITIES = ["1 - Critical", "2 - High", "3 - Moderate", "4 - Low"];

export const PRIORITY_COLOR: Record<string, string> = {
  "1 - Critical": "#f2545b",
  "2 - High": "#f2994a",
  "3 - Moderate": "#4cc9c0",
  "4 - Low": "#5b7fa6",
};

export const CATEGORY_COLOR: Record<string, string> = {
  Phishing: "#e0b64a",
  Malware: "#f2545b",
  "Vulnerability remediation": "#4cc9c0",
  "Access review": "#7aa2f7",
  "Data loss prevention": "#c792ea",
  "Cloud misconfiguration": "#56b6c2",
  "Insider risk": "#e06c9f",
  "Third-party risk": "#9aa5b1",
};

const HOUR = 36e5;

export function prepare(data: Dataset, now: number): Row[] {
  return data.incidents.map((i) => {
    const opened = Date.parse(i.opened_at);
    const resolved = i.resolved_at ? Date.parse(i.resolved_at) : null;
    const responded = i.responded_at ? Date.parse(i.responded_at) : null;
    const responseHours = responded === null ? null : (responded - opened) / HOUR;
    const resolveHours = resolved === null ? null : (resolved - opened) / HOUR;
    return {
      ...i,
      opened,
      resolved,
      responseHours,
      resolveHours,
      respondedInSla: responseHours === null ? null : responseHours <= i.response_sla_hours,
      resolvedInSla: resolveHours === null ? null : resolveHours <= i.resolution_sla_hours,
      ageHours: ((resolved ?? now) - opened) / HOUR,
    };
  });
}

export function median(values: number[]): number | null {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

export function percentile(values: number[], p: number): number | null {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b);
  const idx = Math.min(s.length - 1, Math.max(0, Math.round((p / 100) * (s.length - 1))));
  return s[idx];
}

function share(numerator: number, denominator: number): number | null {
  return denominator === 0 ? null : (numerator / denominator) * 100;
}

export type Summary = {
  opened: number;
  resolvedCount: number;
  backlog: number;
  aged: number;
  mtta: number | null;
  mttr: number | null;
  p90ttr: number | null;
  responseSla: number | null;
  resolutionSla: number | null;
  reopenRate: number | null;
  touchRate: number | null;
  majorIncidents: number;
  throughput: number;
  oldestOpenDays: number | null;
};

export function summarize(rows: Row[], days: number): Summary {
  const resolvedRows = rows.filter((r) => r.resolved !== null);
  const open = rows.filter((r) => r.resolved === null);
  return {
    opened: rows.length,
    resolvedCount: resolvedRows.length,
    backlog: open.length,
    aged: open.filter((r) => r.ageHours > 14 * 24).length,
    mtta: median(rows.map((r) => r.responseHours).filter((v): v is number => v !== null)),
    mttr: median(resolvedRows.map((r) => r.resolveHours!)),
    p90ttr: percentile(resolvedRows.map((r) => r.resolveHours!), 90),
    responseSla: share(
      rows.filter((r) => r.respondedInSla === true).length,
      rows.filter((r) => r.respondedInSla !== null).length,
    ),
    resolutionSla: share(resolvedRows.filter((r) => r.resolvedInSla).length, resolvedRows.length),
    reopenRate: share(resolvedRows.filter((r) => r.reopen_count > 0).length, resolvedRows.length),
    touchRate: share(rows.filter((r) => r.reassignment_count > 0).length, rows.length),
    majorIncidents: rows.filter((r) => r.major_incident).length,
    throughput: days > 0 ? resolvedRows.length / days : 0,
    oldestOpenDays: open.length ? Math.max(...open.map((r) => r.ageHours)) / 24 : null,
  };
}

export type WeekBucket = {
  key: string;
  start: number;
  label: string;
  opened: number;
  resolved: number;
  byPriority: Record<string, number>;
  responseSla: number | null;
  resolutionSla: number | null;
  mttr: number | null;
};

export function weekStart(ts: number): number {
  const d = new Date(ts);
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.getTime();
}

export function weekly(rows: Row[], from: number, to: number): WeekBucket[] {
  const buckets = new Map<number, Row[]>();
  const resolvedIn = new Map<number, number>();
  for (let t = weekStart(from); t <= to; t += 7 * 864e5) {
    buckets.set(t, []);
    resolvedIn.set(t, 0);
  }
  for (const r of rows) {
    const b = buckets.get(weekStart(r.opened));
    if (b) b.push(r);
    if (r.resolved !== null) {
      const w = weekStart(r.resolved);
      if (resolvedIn.has(w)) resolvedIn.set(w, resolvedIn.get(w)! + 1);
    }
  }
  return [...buckets.entries()].map(([start, group]) => {
    const resolvedRows = group.filter((r) => r.resolved !== null);
    const responded = group.filter((r) => r.respondedInSla !== null);
    const byPriority: Record<string, number> = {};
    for (const p of PRIORITIES) byPriority[p] = group.filter((r) => r.priority === p).length;
    return {
      key: String(start),
      start,
      label: new Date(start).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }),
      opened: group.length,
      resolved: resolvedIn.get(start) ?? 0,
      byPriority,
      responseSla: share(responded.filter((r) => r.respondedInSla).length, responded.length),
      resolutionSla: share(resolvedRows.filter((r) => r.resolvedInSla).length, resolvedRows.length),
      mttr: median(resolvedRows.map((r) => r.resolveHours!)),
    };
  });
}

export type GroupStat = {
  key: string;
  opened: number;
  backlog: number;
  aged: number;
  mtta: number | null;
  mttr: number | null;
  responseSla: number | null;
  resolutionSla: number | null;
  reopenRate: number | null;
  critical: number;
};

export function groupBy(rows: Row[], field: (r: Row) => string): GroupStat[] {
  const groups = new Map<string, Row[]>();
  for (const r of rows) {
    const k = field(r);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(r);
  }
  return [...groups.entries()]
    .map(([key, group]) => {
      const s = summarize(group, 0);
      return {
        key,
        opened: group.length,
        backlog: s.backlog,
        aged: s.aged,
        mtta: s.mtta,
        mttr: s.mttr,
        responseSla: s.responseSla,
        resolutionSla: s.resolutionSla,
        reopenRate: s.reopenRate,
        critical: group.filter((r) => r.priority === "1 - Critical" || r.priority === "2 - High").length,
      };
    })
    .sort((a, b) => b.opened - a.opened);
}

export function agingBuckets(rows: Row[]): { label: string; count: number; critical: number }[] {
  const open = rows.filter((r) => r.resolved === null);
  const edges: [string, number, number][] = [
    ["< 1d", 0, 24],
    ["1–3d", 24, 72],
    ["3–7d", 72, 168],
    ["1–2w", 168, 336],
    ["2–4w", 336, 672],
    ["> 4w", 672, Infinity],
  ];
  return edges.map(([label, lo, hi]) => {
    const inBucket = open.filter((r) => r.ageHours >= lo && r.ageHours < hi);
    return {
      label,
      count: inBucket.length,
      critical: inBucket.filter((r) => r.priority === "1 - Critical" || r.priority === "2 - High").length,
    };
  });
}
