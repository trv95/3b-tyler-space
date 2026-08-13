import type { CaseRecord } from "./types";
import { NO_TACTIC, UNASSIGNED } from "./types";

export type Dimension =
  | "team"
  | "priority"
  | "status"
  | "subStatus"
  | "assignee"
  | "tactic"
  | "technique"
  | "tag";

export const DIMENSIONS: Dimension[] = [
  "team",
  "priority",
  "status",
  "subStatus",
  "assignee",
  "tactic",
  "technique",
  "tag",
];

export const DIMENSION_LABELS: Record<Dimension, string> = {
  team: "Team",
  priority: "Priority",
  status: "Status",
  subStatus: "Sub-status",
  assignee: "Assignee",
  tactic: "MITRE tactic",
  technique: "MITRE technique",
  tag: "Tag",
};

export type Mode = "include" | "exclude";

export type Selection = { values: string[]; mode: Mode };

export type Filters = {
  window: string;
  from: string | null;
  to: string | null;
  granularity: "day" | "week" | "month";
  search: string;
  slaOnly: boolean;
  unassignedOnly: boolean;
  dims: Record<Dimension, Selection>;
};

export const WINDOWS: Record<string, number | null> = {
  "30d": 30,
  "90d": 90,
  "6m": 182,
  "12m": 365,
  all: null,
  custom: null,
};

export function emptyDims(): Record<Dimension, Selection> {
  return DIMENSIONS.reduce(
    (acc, d) => ({ ...acc, [d]: { values: [], mode: "include" as Mode } }),
    {} as Record<Dimension, Selection>,
  );
}

export function defaultFilters(): Filters {
  return {
    window: "12m",
    from: null,
    to: null,
    granularity: "week",
    search: "",
    slaOnly: false,
    unassignedOnly: false,
    dims: emptyDims(),
  };
}

export function valuesOf(c: CaseRecord, dim: Dimension): string[] {
  switch (dim) {
    case "team":
      return [c.team];
    case "priority":
      return [c.priority];
    case "status":
      return [c.status];
    case "subStatus":
      return [c.subStatus ?? "None"];
    case "assignee":
      return c.assignees.length ? c.assignees.map((a) => a.name) : [UNASSIGNED];
    case "tactic":
      return c.tactics.length ? c.tactics : [NO_TACTIC];
    case "technique":
      return c.techniques.length ? c.techniques : [NO_TACTIC];
    case "tag":
      return c.tags.length ? c.tags : [NO_TACTIC];
  }
}

function matchesSelection(c: CaseRecord, dim: Dimension, sel: Selection): boolean {
  if (sel.values.length === 0) return true;
  const vals = valuesOf(c, dim);
  const hit = vals.some((v) => sel.values.includes(v));
  return sel.mode === "include" ? hit : !hit;
}

export function caseDate(c: CaseRecord): number {
  const iso = c.createdAt ?? c.openedAt;
  return iso ? Date.parse(iso) : NaN;
}

export function windowBounds(f: Filters, now = Date.now()): { start: number; end: number } {
  if (f.window === "custom") {
    return {
      start: f.from ? Date.parse(`${f.from}T00:00:00Z`) : -Infinity,
      end: f.to ? Date.parse(`${f.to}T23:59:59Z`) : Infinity,
    };
  }
  const days = WINDOWS[f.window];
  if (days == null) return { start: -Infinity, end: Infinity };
  return { start: now - days * 86_400_000, end: Infinity };
}

export function applyFilters(
  cases: CaseRecord[],
  f: Filters,
  opts: { skip?: Dimension } = {},
  now = Date.now(),
): CaseRecord[] {
  const { start, end } = windowBounds(f, now);
  const needle = f.search.trim().toLowerCase();

  return cases.filter((c) => {
    const t = caseDate(c);
    if (Number.isFinite(t) && (t < start || t > end)) return false;
    if (f.slaOnly && !c.slaExceeded) return false;
    if (f.unassignedOnly && c.assignees.length > 0) return false;
    if (needle) {
      const haystack = `${c.id} ${c.name} ${c.tags.join(" ")} ${c.team} ${c.assignees
        .map((a) => a.name)
        .join(" ")}`.toLowerCase();
      if (!haystack.includes(needle)) return false;
    }
    for (const dim of DIMENSIONS) {
      if (dim === opts.skip) continue;
      if (!matchesSelection(c, dim, f.dims[dim])) return false;
    }
    return true;
  });
}

export function bucketStartFromKey(key: string): number | null {
  const t = Number(key);
  return Number.isFinite(t) ? t : null;
}

export function toggleValue(sel: Selection, value: string): Selection {
  const values = sel.values.includes(value)
    ? sel.values.filter((v) => v !== value)
    : [...sel.values, value];
  return { ...sel, values };
}

export function activeFilterCount(f: Filters): number {
  let n = DIMENSIONS.reduce((acc, d) => acc + (f.dims[d].values.length ? 1 : 0), 0);
  if (f.search.trim()) n += 1;
  if (f.slaOnly) n += 1;
  if (f.unassignedOnly) n += 1;
  return n;
}

export function encodeFilters(f: Filters): string {
  const p = new URLSearchParams();
  if (f.window !== "12m") p.set("window", f.window);
  if (f.window === "custom") {
    if (f.from) p.set("from", f.from);
    if (f.to) p.set("to", f.to);
  }
  if (f.granularity !== "week") p.set("by", f.granularity);
  if (f.search.trim()) p.set("q", f.search.trim());
  if (f.slaOnly) p.set("sla", "1");
  if (f.unassignedOnly) p.set("unassigned", "1");
  for (const dim of DIMENSIONS) {
    const sel = f.dims[dim];
    if (!sel.values.length) continue;
    p.set(dim, sel.values.join("~"));
    if (sel.mode === "exclude") p.set(`${dim}!`, "1");
  }
  return p.toString();
}

export function decodeFilters(query: string): Filters {
  const p = new URLSearchParams(query);
  const f = defaultFilters();
  const w = p.get("window");
  if (w && (w in WINDOWS)) f.window = w;
  f.from = p.get("from");
  f.to = p.get("to");
  const by = p.get("by");
  if (by === "day" || by === "week" || by === "month") f.granularity = by;
  f.search = p.get("q") ?? "";
  f.slaOnly = p.get("sla") === "1";
  f.unassignedOnly = p.get("unassigned") === "1";
  for (const dim of DIMENSIONS) {
    const raw = p.get(dim);
    if (!raw) continue;
    f.dims[dim] = {
      values: raw.split("~").filter(Boolean),
      mode: p.get(`${dim}!`) === "1" ? "exclude" : "include",
    };
  }
  return f;
}
