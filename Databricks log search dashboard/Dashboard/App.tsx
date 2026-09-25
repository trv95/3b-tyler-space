import { useMemo, useRef, useState } from "react";

type Row = {
  time: number;
  class_name: string;
  activity_name: string;
  email: string;
  name: string;
  product: string;
};
type Point = { bucket: number; count: number };
type Result = { rows: Row[]; series: Point[]; total: number };

const BRANCH: string = (window as any).__BRANCH_ID__ || "";
const QUERY_URL = "/log-search-query" + (BRANCH ? `?branch=${BRANCH}` : "");

const RANGES: { label: string; ms: number | null }[] = [
  { label: "1h", ms: 3600e3 },
  { label: "24h", ms: 24 * 3600e3 },
  { label: "7d", ms: 7 * 24 * 3600e3 },
  { label: "30d", ms: 30 * 24 * 3600e3 },
  { label: "All", ms: null },
];

function fmtTime(ms: number) {
  const d = new Date(ms);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function fmtBucket(ms: number) {
  return new Date(ms).toLocaleString(undefined, {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
  });
}

// Hand-rolled SVG area chart, no dependencies.
function VolumeChart({ series }: { series: Point[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 1000;
  const H = 240;
  const pad = { l: 44, r: 16, t: 16, b: 28 };
  const iw = W - pad.l - pad.r;
  const ih = H - pad.t - pad.b;

  if (series.length === 0) {
    return (
      <div className="flex h-60 items-center justify-center text-sm text-slate-500">
        No events in range
      </div>
    );
  }

  const max = Math.max(...series.map((p) => p.count), 1);
  const n = series.length;
  const x = (i: number) => pad.l + (n === 1 ? iw / 2 : (i / (n - 1)) * iw);
  const y = (v: number) => pad.t + ih - (v / max) * ih;

  const line = series.map((p, i) => `${x(i)},${y(p.count)}`).join(" ");
  const area = `${pad.l},${pad.t + ih} ${line} ${x(n - 1)},${pad.t + ih}`;
  const gridVals = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(max * f));

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 240 }}>
        <defs>
          <linearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
          </linearGradient>
        </defs>
        {gridVals.map((v, i) => {
          const gy = y(v);
          return (
            <g key={i}>
              <line x1={pad.l} y1={gy} x2={W - pad.r} y2={gy} stroke="#1e293b" strokeWidth="1" />
              <text x={pad.l - 8} y={gy + 4} textAnchor="end" fontSize="11" fill="#64748b" fontFamily="JetBrains Mono, monospace">
                {v}
              </text>
            </g>
          );
        })}
        <polygon points={area} fill="url(#fill)" />
        <polyline points={line} fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinejoin="round" />
        {series.map((p, i) => (
          <circle
            key={i}
            cx={x(i)}
            cy={y(p.count)}
            r={hover === i ? 4 : 0}
            fill="#fbbf24"
            stroke="#0f172a"
            strokeWidth="2"
          />
        ))}
        {series.map((p, i) => (
          <rect
            key={"h" + i}
            x={x(i) - iw / n / 2}
            y={pad.t}
            width={Math.max(iw / n, 2)}
            height={ih}
            fill="transparent"
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
          />
        ))}
      </svg>
      {hover !== null && (
        <div className="pointer-events-none absolute top-2 left-1/2 -translate-x-1/2 rounded-md border border-slate-700 bg-slate-900/95 px-3 py-1.5 text-xs shadow-xl">
          <span className="font-mono text-amber-400">{series[hover].count}</span>
          <span className="text-slate-400"> events · {fmtBucket(series[hover].bucket)}</span>
        </div>
      )}
    </div>
  );
}

const CHIP_COLORS: Record<string, string> = {
  Login: "text-emerald-300 bg-emerald-500/10 border-emerald-500/30",
  Logout: "text-slate-300 bg-slate-500/10 border-slate-500/30",
};
function chipClass(activity: string) {
  return CHIP_COLORS[activity] || "text-sky-300 bg-sky-500/10 border-sky-500/30";
}

export default function App() {
  const [q, setQ] = useState("");
  const [rangeIdx, setRangeIdx] = useState(4);
  const [data, setData] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ran, setRan] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function search() {
    setLoading(true);
    setError(null);
    try {
      const range = RANGES[rangeIdx];
      const body: any = { q: q.trim(), limit: 1000 };
      if (range.ms !== null) {
        body.to = Date.now();
        body.from = Date.now() - range.ms;
      }
      const res = await fetch(QUERY_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`Query failed (${res.status})`);
      const json = (await res.json()) as Result;
      if ((json as any).error) throw new Error((json as any).error);
      setData(json);
      setRan(true);
    } catch (e: any) {
      setError(String(e.message || e));
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  const totalEvents = useMemo(
    () => (data ? data.series.reduce((a, p) => a + p.count, 0) : 0),
    [data]
  );
  const uniqueUsers = useMemo(
    () => (data ? new Set(data.rows.map((r) => r.email).filter(Boolean)).size : 0),
    [data]
  );
  const uniqueActivities = useMemo(
    () => (data ? new Set(data.rows.map((r) => r.activity_name).filter(Boolean)).size : 0),
    [data]
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200" style={{ fontFamily: "Inter, sans-serif" }}>
      {/* Top bar */}
      <header className="sticky top-0 z-10 border-b border-slate-800 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-6 py-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-amber-500/15 ring-1 ring-amber-500/40">
            <div className="h-2.5 w-2.5 rounded-full bg-amber-400 shadow-[0_0_12px_2px_rgba(251,191,36,0.7)]" />
          </div>
          <div>
            <h1 className="text-sm font-semibold tracking-tight text-slate-100">
              OCSF Log Search
            </h1>
            <p className="font-mono text-[11px] text-slate-500">
              workspace.default.tines_ocsf_silver
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        {/* Search bar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <svg className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && search()}
              placeholder="Search activity, user, product…  (e.g. login, sberniard)"
              className="w-full rounded-lg border border-slate-800 bg-slate-900 py-3 pl-10 pr-4 text-sm text-slate-100 placeholder-slate-600 outline-none transition focus:border-amber-500/60 focus:ring-2 focus:ring-amber-500/20"
            />
          </div>
          <div className="flex overflow-hidden rounded-lg border border-slate-800 bg-slate-900">
            {RANGES.map((r, i) => (
              <button
                key={r.label}
                onClick={() => setRangeIdx(i)}
                className={
                  "px-3.5 py-3 font-mono text-xs transition " +
                  (i === rangeIdx
                    ? "bg-amber-500/20 text-amber-300"
                    : "text-slate-400 hover:bg-slate-800 hover:text-slate-200")
                }
              >
                {r.label}
              </button>
            ))}
          </div>
          <button
            onClick={search}
            disabled={loading}
            className="rounded-lg bg-amber-500 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-400 disabled:opacity-50"
          >
            {loading ? "Searching…" : "Search"}
          </button>
        </div>

        {error && (
          <div className="mt-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 font-mono text-sm text-red-300">
            {error}
          </div>
        )}

        {!ran && !error && (
          <div className="mt-24 flex flex-col items-center text-center text-slate-500">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 ring-1 ring-slate-800">
              <svg className="h-6 w-6 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <circle cx="11" cy="11" r="7" />
                <path d="m21 21-4.3-4.3" />
              </svg>
            </div>
            <p className="text-sm">Enter a query and hit search to pull logs from Databricks.</p>
          </div>
        )}

        {data && (
          <>
            {/* Stat cards */}
            <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                { label: "Total events", value: totalEvents.toLocaleString() },
                { label: "Rows returned", value: data.total.toLocaleString() },
                { label: "Unique users", value: uniqueUsers.toLocaleString() },
                { label: "Activity types", value: uniqueActivities.toLocaleString() },
              ].map((s) => (
                <div key={s.label} className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                  <div className="font-mono text-2xl font-bold text-slate-100">{s.value}</div>
                  <div className="mt-1 text-xs uppercase tracking-wide text-slate-500">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Chart */}
            <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900/60 p-5">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-200">Event volume</h2>
                <span className="font-mono text-xs text-slate-500">hourly buckets</span>
              </div>
              <VolumeChart series={data.series} />
            </div>

            {/* Table */}
            <div className="mt-6 overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60">
              <div className="flex items-center justify-between border-b border-slate-800 px-5 py-3">
                <h2 className="text-sm font-semibold text-slate-200">
                  Log entries <span className="ml-1 font-mono text-slate-500">({data.rows.length})</span>
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-800 text-xs uppercase tracking-wide text-slate-500">
                      <th className="px-5 py-2.5 font-medium">Time</th>
                      <th className="px-5 py-2.5 font-medium">Activity</th>
                      <th className="px-5 py-2.5 font-medium">Class</th>
                      <th className="px-5 py-2.5 font-medium">User</th>
                      <th className="px-5 py-2.5 font-medium">Product</th>
                    </tr>
                  </thead>
                  <tbody className="font-mono text-[13px]">
                    {data.rows.map((r, i) => (
                      <tr key={i} className="border-b border-slate-800/60 hover:bg-slate-800/40">
                        <td className="whitespace-nowrap px-5 py-2.5 text-slate-400">{fmtTime(r.time)}</td>
                        <td className="px-5 py-2.5">
                          <span className={"rounded-md border px-2 py-0.5 text-xs " + chipClass(r.activity_name)}>
                            {r.activity_name || "—"}
                          </span>
                        </td>
                        <td className="px-5 py-2.5 text-slate-400">{r.class_name || "—"}</td>
                        <td className="px-5 py-2.5">
                          <div className="text-slate-200">{r.name || "—"}</div>
                          <div className="text-xs text-slate-500">{r.email || ""}</div>
                        </td>
                        <td className="px-5 py-2.5 text-slate-400">{r.product || "—"}</td>
                      </tr>
                    ))}
                    {data.rows.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-5 py-10 text-center text-slate-500">
                          No matching log entries
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
