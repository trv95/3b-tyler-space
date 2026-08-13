import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MultiSelect, Pill, SegmentedControl } from "./components/ui";
import { KpiRow } from "./components/KpiRow";
import { PanelGrid } from "./components/PanelGrid";
import type { CaseRecord, Snapshot } from "./lib/types";
import {
  DIMENSION_LABELS,
  activeFilterCount,
  applyFilters,
  bucketStartFromKey,
  caseDate,
  decodeFilters,
  defaultFilters,
  encodeFilters,
  toggleValue,
  windowBounds,
  type Dimension,
  type Filters,
} from "./lib/filters";
import { bucketStart, nextBucket, tally, timeSeries, toCsv } from "./lib/aggregate";
import { num, pct, relativeTime, tenantHost } from "./lib/format";

const BRANCH: string = (window as any).__BRANCH_ID__ ?? "";
const QS = BRANCH ? `?branch=${encodeURIComponent(BRANCH)}` : "";
const DATA_URL = `/tines-case-data${QS}`;
const REFRESH_URL = `/tines-case-refresh${QS}`;

const FILTER_DIMS: Dimension[] = ["team", "priority", "status", "subStatus", "assignee", "tactic", "tag"];

function readUrl(): { filters: Filters; bucket: string | null } {
  const p = new URLSearchParams(window.location.search);
  p.delete("branch");
  const bucket = p.get("bucket");
  p.delete("bucket");
  return { filters: decodeFilters(p.toString()), bucket };
}

export default function App() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [view, setView] = useState(readUrl);
  const inFlight = useRef(false);

  const { filters, bucket } = view;

  const setView2 = useCallback((f: Filters, b: string | null = null) => {
    setView({ filters: f, bucket: b });
    const p = new URLSearchParams(encodeFilters(f));
    if (b) p.set("bucket", b);
    if (BRANCH) p.set("branch", BRANCH);
    const q = p.toString();
    window.history.replaceState(null, "", q ? `?${q}` : window.location.pathname);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const load = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      const res = await fetch(DATA_URL, { headers: { accept: "application/json" } });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(body.message ?? `Data request failed (HTTP ${res.status})`);
      }
      setSnapshot((await res.json()) as Snapshot);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      inFlight.current = false;
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch(REFRESH_URL, { method: "POST" });
      if (!res.ok) throw new Error(`Refresh failed (HTTP ${res.status})`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  const all = snapshot?.cases ?? [];
  const now = useMemo(() => Date.now(), [snapshot]);
  const bounds = useMemo(() => windowBounds(filters, now), [filters, now]);

  const bucketRange = useMemo(() => {
    if (!bucket) return null;
    const start = bucketStartFromKey(bucket);
    if (start == null) return null;
    return { start, end: nextBucket(start, filters.granularity) };
  }, [bucket, filters.granularity]);

  const inBucket = useCallback(
    (c: CaseRecord) => {
      if (!bucketRange) return true;
      const t = caseDate(c);
      return Number.isFinite(t) && t >= bucketRange.start && t < bucketRange.end;
    },
    [bucketRange],
  );

  const windowed = useMemo(() => applyFilters(all, filters, {}, now), [all, filters, now]);
  const scoped = useMemo(() => windowed.filter(inBucket), [windowed, inBucket]);

  const buckets = useMemo(
    () => timeSeries(windowed, filters.granularity, bounds, now),
    [windowed, filters.granularity, bounds, now],
  );

  const partialLastBucket = useMemo(() => {
    if (buckets.length === 0) return false;
    return bucketStart(now, filters.granularity) === Number(buckets[buckets.length - 1].key);
  }, [buckets, filters.granularity, now]);

  const optionsFor = useCallback(
    (dim: Dimension) => {
      const base = applyFilters(all, filters, { skip: dim }, now).filter(inBucket);
      const counts = tally(base, dim);
      for (const v of filters.dims[dim].values) if (!counts.has(v)) counts.set(v, 0);
      return [...counts.entries()]
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
    },
    [all, filters, now, inBucket],
  );

  const crossFilter = useCallback(
    (dim: Dimension) => (value: string) =>
      setView2({ ...filters, dims: { ...filters.dims, [dim]: toggleValue(filters.dims[dim], value) } }, bucket),
    [filters, bucket, setView2],
  );

  const clearAll = useCallback(
    () => setView2({ ...defaultFilters(), window: filters.window, granularity: filters.granularity }, null),
    [filters.window, filters.granularity, setView2],
  );

  const filterCount = activeFilterCount(filters) + (bucket ? 1 : 0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (e.key === "Escape" && filterCount > 0 && tag !== "INPUT") clearAll();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [filterCount, clearAll]);

  const untagged = scoped.filter((c) => c.tactics.length === 0).length;
  const closedInView = scoped.filter((c) => c.status !== "OPEN");
  const withResolution = closedInView.filter((c) => c.resolutionHours != null).length;

  const caveats: string[] = [];
  if (scoped.length && untagged / scoped.length > 0.05)
    caveats.push(
      `${pct(untagged, scoped.length)} of cases in view carry no MITRE tag; they appear as “Untagged” in the threat-type panel.`,
    );
  if (partialLastBucket)
    caveats.push(`The final ${filters.granularity} is still in progress and is drawn at reduced opacity.`);
  if (closedInView.length > withResolution)
    caveats.push(
      `${num(closedInView.length - withResolution)} closed cases have no resolution timestamp and are excluded from time-to-resolve.`,
    );

  const downloadCsv = () => {
    const blob = new Blob([toCsv(scoped)], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `tines-cases-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--page-bg)" }}>
      <title>Case reporting — Tines</title>

      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            "radial-gradient(70rem 34rem at 12% -8%, rgba(141,117,230,0.18), transparent 60%), radial-gradient(52rem 26rem at 96% -4%, rgba(4,185,173,0.12), transparent 55%)",
        }}
      />

      <div className="relative mx-auto max-w-[1480px] px-6 pt-8 pb-16">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p
              className="chrome text-[11px] font-bold tracking-[0.2em] uppercase"
              style={{ color: "var(--accent-strong)" }}
            >
              Security operations
            </p>
            <h1
              className="mt-1.5 text-[32px] leading-none font-extrabold tracking-tight"
              style={{ color: "var(--text-primary)" }}
            >
              Case reporting
            </h1>
            <p className="mt-2 text-[12px]" style={{ color: "var(--text-secondary)" }}>
              {snapshot
                ? `${num(snapshot.caseCount)} cases · ${tenantHost(snapshot.tenant)} · snapshot ${relativeTime(snapshot.fetchedAt)}`
                : error
                  ? "Snapshot unavailable"
                  : "Loading…"}
            </p>
          </div>

          <div className="chrome flex items-center gap-2">
            <button
              type="button"
              onClick={downloadCsv}
              disabled={!snapshot}
              className="h-8 rounded-[8px] border px-3 text-[12px] font-medium"
              style={{
                borderColor: "var(--border)",
                color: "var(--text-secondary)",
                cursor: snapshot ? "pointer" : "not-allowed",
                opacity: snapshot ? 1 : 0.5,
              }}
            >
              Export CSV
            </button>
            <button
              type="button"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="h-8 cursor-pointer rounded-[8px] border px-3 text-[12px] font-medium"
              style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
            >
              {theme === "dark" ? "Light" : "Dark"}
            </button>
            <button
              type="button"
              onClick={refresh}
              disabled={refreshing}
              className="h-8 rounded-[8px] px-3 text-[12px] font-semibold text-white"
              style={{
                background: "var(--accent)",
                cursor: refreshing ? "wait" : "pointer",
                opacity: refreshing ? 0.65 : 1,
              }}
            >
              {refreshing ? "Refreshing…" : "Refresh data"}
            </button>
          </div>
        </header>

        {error && (
          <div
            className="mb-5 rounded-[10px] border px-4 py-3 text-[12px]"
            style={{ borderColor: "#E14F4C", background: "rgba(225,79,76,0.12)", color: "var(--text-primary)" }}
          >
            {error}
          </div>
        )}

        <div
          className="chrome sticky top-0 z-20 mb-5 flex flex-wrap items-center gap-2 rounded-[10px] border px-3 py-2.5"
          style={{ background: "var(--card-bg)", borderColor: "var(--border)", backdropFilter: "blur(12px)" }}
        >
          <SegmentedControl
            value={filters.window}
            onChange={(w) => setView2({ ...filters, window: w }, null)}
            options={[
              { value: "30d", label: "30d" },
              { value: "90d", label: "90d" },
              { value: "6m", label: "6m" },
              { value: "12m", label: "12m" },
              { value: "all", label: "All" },
            ]}
          />
          <SegmentedControl
            value={filters.granularity}
            onChange={(g) => setView2({ ...filters, granularity: g }, null)}
            disabled={filters.window === "30d" ? ["month"] : []}
            options={[
              { value: "day", label: "Day" },
              { value: "week", label: "Week" },
              { value: "month", label: "Month" },
            ]}
          />
          <span className="mx-1 h-6 w-px" style={{ background: "var(--divider)" }} />

          {FILTER_DIMS.map((dim) => (
            <MultiSelect
              key={dim}
              label={DIMENSION_LABELS[dim]}
              options={optionsFor(dim)}
              selection={filters.dims[dim]}
              onChange={(s) => setView2({ ...filters, dims: { ...filters.dims, [dim]: s } }, bucket)}
            />
          ))}

          <Pill active={filters.slaOnly} onClick={() => setView2({ ...filters, slaOnly: !filters.slaOnly }, bucket)}>
            SLA breached
          </Pill>
          <Pill
            active={filters.unassignedOnly}
            onClick={() => setView2({ ...filters, unassignedOnly: !filters.unassignedOnly }, bucket)}
          >
            Unassigned
          </Pill>

          <input
            value={filters.search}
            onChange={(e) => setView2({ ...filters, search: e.target.value }, bucket)}
            placeholder="Search case, tag, person…"
            className="h-8 min-w-[160px] flex-1 rounded-[8px] border px-2.5 text-[12px] outline-none"
            style={{ background: "var(--input-bg)", borderColor: "var(--border)", color: "var(--text-primary)" }}
          />

          <button
            type="button"
            onClick={clearAll}
            className="h-8 cursor-pointer rounded-[8px] border px-3 text-[12px] font-medium"
            style={{
              borderColor: filterCount ? "var(--accent)" : "var(--border)",
              color: filterCount ? "var(--text-primary)" : "var(--text-muted)",
            }}
          >
            Clear{filterCount ? ` (${filterCount})` : ""}
          </button>
        </div>

        {caveats.length > 0 && (
          <div
            className="mb-5 rounded-[10px] border px-4 py-2.5 text-[11px] leading-relaxed"
            style={{ borderColor: "var(--border)", background: "var(--header-bg)", color: "var(--text-secondary)" }}
          >
            {caveats.map((c) => (
              <div key={c}>· {c}</div>
            ))}
          </div>
        )}

        <KpiRow
          scoped={scoped}
          totalCases={all.length}
          slaOnly={filters.slaOnly}
          unassignedOnly={filters.unassignedOnly}
          onToggleSla={() => setView2({ ...filters, slaOnly: !filters.slaOnly }, bucket)}
          onToggleUnassigned={() => setView2({ ...filters, unassignedOnly: !filters.unassignedOnly }, bucket)}
        />

        <PanelGrid
          scoped={scoped}
          buckets={buckets}
          filters={filters}
          bucket={bucket}
          partialLastBucket={partialLastBucket}
          onSelectBucket={(key) => setView2(filters, key)}
          crossFilter={crossFilter}
        />

        {!snapshot && !error && (
          <p className="mt-8 text-center text-[12px]" style={{ color: "var(--text-muted)" }}>
            Loading case snapshot…
          </p>
        )}
      </div>
    </div>
  );
}
