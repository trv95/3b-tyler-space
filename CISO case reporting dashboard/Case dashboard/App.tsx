import { useEffect, useMemo, useState } from "react";

type CaseRow = {
  id: number;
  name: string;
  status: string;
  priority: string;
  team: string;
  assignees: { name: string; email: string }[];
  tags: string[];
  opened_at: string | null;
  created_at: string | null;
  resolved_at: string | null;
  url: string | null;
};

type Payload = { cases: CaseRow[]; fetched_at: string };

const PRIORITIES = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"] as const;
type Priority = (typeof PRIORITIES)[number];

const PRIO_META: Record<string, { label: string; text: string; bg: string; bar: string; dot: string; order: number }> = {
  CRITICAL: { label: "Critical", text: "text-rose-300", bg: "bg-rose-500/10 border-rose-500/40", bar: "bg-rose-500", dot: "bg-rose-500", order: 0 },
  HIGH: { label: "High", text: "text-orange-300", bg: "bg-orange-500/10 border-orange-500/40", bar: "bg-orange-500", dot: "bg-orange-500", order: 1 },
  MEDIUM: { label: "Medium", text: "text-amber-300", bg: "bg-amber-500/10 border-amber-500/40", bar: "bg-amber-400", dot: "bg-amber-400", order: 2 },
  LOW: { label: "Low", text: "text-sky-300", bg: "bg-sky-500/10 border-sky-500/40", bar: "bg-sky-500", dot: "bg-sky-500", order: 3 },
  INFO: { label: "Info", text: "text-slate-300", bg: "bg-slate-500/10 border-slate-500/40", bar: "bg-slate-500", dot: "bg-slate-500", order: 4 },
};

function prioMeta(p: string) {
  return PRIO_META[p] ?? { label: p || "—", text: "text-slate-400", bg: "bg-slate-500/10 border-slate-500/30", bar: "bg-slate-600", dot: "bg-slate-600", order: 9 };
}

function fetchUrl(path: string) {
  const params = new URLSearchParams(window.location.search);
  const branch = params.get("branch");
  return branch ? `${path}?branch=${encodeURIComponent(branch)}` : path;
}

function daysBetween(a: number, b: number) {
  return (b - a) / 86400000;
}

function fmtAge(ms: number) {
  const d = ms / 86400000;
  if (d < 1) return `${Math.max(1, Math.round(ms / 3600000))}h`;
  if (d < 30) return `${Math.round(d)}d`;
  return `${(d / 30).toFixed(1)}mo`;
}

function median(nums: number[]) {
  if (!nums.length) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

export default function App() {
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [prioFilter, setPrioFilter] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(fetchUrl("/cases-data"), { headers: { accept: "application/json" } });
      if (!res.ok) throw new Error(`Data endpoint returned ${res.status}`);
      const json = (await res.json()) as Payload;
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load cases");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const now = Date.now();
  const cases = data?.cases ?? [];

  const stats = useMemo(() => {
    const open = cases.filter((c) => c.status === "OPEN");
    const closed = cases.filter((c) => c.status === "CLOSED");
    const openCritHigh = open.filter((c) => c.priority === "CRITICAL" || c.priority === "HIGH");

    // resolution durations (days) for closed cases with timestamps
    const resDurations: number[] = [];
    for (const c of closed) {
      const start = c.opened_at ?? c.created_at;
      if (start && c.resolved_at) {
        const d = daysBetween(new Date(start).getTime(), new Date(c.resolved_at).getTime());
        if (d >= 0) resDurations.push(d);
      }
    }

    // open backlog age
    const openAges = open
      .map((c) => (c.opened_at ?? c.created_at ? now - new Date((c.opened_at ?? c.created_at) as string).getTime() : null))
      .filter((v): v is number => v != null);

    // priority breakdown of open cases
    const byPriority = PRIORITIES.map((p) => ({ p, n: open.filter((c) => c.priority === p).length }));

    // team workload (open)
    const teamMap = new Map<string, number>();
    for (const c of open) teamMap.set(c.team, (teamMap.get(c.team) ?? 0) + 1);
    const teams = [...teamMap.entries()].map(([team, n]) => ({ team, n })).sort((a, b) => b.n - a.n).slice(0, 7);

    // volume trend: opened per week, last 12 weeks
    const weeks: { start: number; opened: number; resolved: number }[] = [];
    const weekMs = 7 * 86400000;
    const anchor = now - (now % weekMs);
    for (let i = 11; i >= 0; i--) {
      weeks.push({ start: anchor - i * weekMs, opened: 0, resolved: 0 });
    }
    const firstWeek = weeks[0].start;
    for (const c of cases) {
      const o = c.opened_at ?? c.created_at;
      if (o) {
        const t = new Date(o).getTime();
        if (t >= firstWeek) {
          const idx = Math.min(weeks.length - 1, Math.floor((t - firstWeek) / weekMs));
          if (idx >= 0) weeks[idx].opened++;
        }
      }
      if (c.resolved_at) {
        const t = new Date(c.resolved_at).getTime();
        if (t >= firstWeek) {
          const idx = Math.min(weeks.length - 1, Math.floor((t - firstWeek) / weekMs));
          if (idx >= 0) weeks[idx].resolved++;
        }
      }
    }

    return {
      total: cases.length,
      open: open.length,
      closed: closed.length,
      openCritHigh: openCritHigh.length,
      resRate: cases.length ? Math.round((closed.length / cases.length) * 100) : 0,
      medianRes: median(resDurations),
      medianAge: median(openAges) / 86400000,
      byPriority,
      teams,
      weeks,
    };
  }, [cases, now]);

  const tableRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return cases
      .filter((c) => c.status === "OPEN")
      .filter((c) => (prioFilter ? c.priority === prioFilter : true))
      .filter((c) => (q ? c.name.toLowerCase().includes(q) || c.team.toLowerCase().includes(q) || c.tags.some((t) => t.toLowerCase().includes(q)) : true))
      .sort((a, b) => {
        const po = prioMeta(a.priority).order - prioMeta(b.priority).order;
        if (po !== 0) return po;
        const at = new Date(a.opened_at ?? a.created_at ?? 0).getTime();
        const bt = new Date(b.opened_at ?? b.created_at ?? 0).getTime();
        return bt - at;
      });
  }, [cases, prioFilter, query]);

  const maxWeek = Math.max(1, ...stats.weeks.map((w) => w.opened));
  const maxPrio = Math.max(1, ...stats.byPriority.map((b) => b.n));
  const maxTeam = Math.max(1, ...stats.teams.map((t) => t.n));

  return (
    <div className="min-h-full text-slate-200">
      <div className="cmd-grid min-h-full">
        {/* Header */}
        <header className="border-b border-slate-800/80 bg-[#090c12]/80 backdrop-blur sticky top-0 z-20">
          <div className="mx-auto max-w-[1400px] px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 grid place-items-center border border-sky-500/40 bg-sky-500/10">
                <div className="h-2.5 w-2.5 bg-sky-400 animate-pulse" />
              </div>
              <div>
                <h1 className="font-mono text-sm font-semibold tracking-[0.25em] text-slate-100 uppercase">Case Command</h1>
                <p className="font-mono text-[11px] text-slate-500 tracking-wide">Security Operations · CISO Reporting</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-2 font-mono text-[11px] text-slate-500">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                LIVE · TINES CASES
              </div>
              <div className="font-mono text-[11px] text-right text-slate-500">
                <div className="text-slate-300">{data ? new Date(data.fetched_at).toLocaleString() : "—"}</div>
                <div>last sync</div>
              </div>
              <button
                onClick={load}
                className="font-mono text-[11px] uppercase tracking-widest border border-slate-700 px-3 py-2 text-slate-300 hover:border-sky-500/60 hover:text-sky-300 transition-colors"
              >
                {loading ? "Syncing…" : "Refresh"}
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-[1400px] px-6 py-6">
          {error && (
            <div className="mb-6 border border-rose-500/40 bg-rose-500/10 px-4 py-3 font-mono text-sm text-rose-300">
              Error loading cases: {error}
            </div>
          )}

          {loading && !data ? (
            <div className="grid place-items-center py-40 font-mono text-slate-500 text-sm tracking-widest animate-pulse">
              ESTABLISHING FEED…
            </div>
          ) : (
            <>
              {/* KPI row */}
              <section className="grid grid-cols-2 lg:grid-cols-6 gap-3 mb-6">
                <Kpi label="Total Cases" value={stats.total} accent="text-slate-100" />
                <Kpi label="Open" value={stats.open} accent="text-sky-300" />
                <Kpi label="Critical + High Open" value={stats.openCritHigh} accent="text-rose-300" pulse={stats.openCritHigh > 0} />
                <Kpi label="Resolution Rate" value={`${stats.resRate}%`} accent="text-emerald-300" />
                <Kpi label="Median Time to Resolve" value={stats.medianRes ? `${stats.medianRes.toFixed(1)}d` : "—"} accent="text-slate-100" />
                <Kpi label="Median Open Age" value={stats.medianAge ? `${stats.medianAge.toFixed(1)}d` : "—"} accent="text-amber-300" />
              </section>

              <section className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-4">
                {/* Volume trend */}
                <Panel title="Case Volume — 12 Weeks" className="xl:col-span-2" hint="opened vs resolved / week">
                  <div className="flex items-end gap-2 h-52 pt-4">
                    {stats.weeks.map((w, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
                        <div className="relative w-full flex-1 flex items-end justify-center gap-[3px]">
                          <div
                            className="w-1/2 bg-sky-500/80 group-hover:bg-sky-400 transition-colors"
                            style={{ height: `${(w.opened / maxWeek) * 100}%` }}
                            title={`${w.opened} opened`}
                          />
                          <div
                            className="w-1/2 bg-slate-600/70 group-hover:bg-slate-500 transition-colors"
                            style={{ height: `${(w.resolved / maxWeek) * 100}%` }}
                            title={`${w.resolved} resolved`}
                          />
                        </div>
                        <span className="font-mono text-[9px] text-slate-600">
                          {new Date(w.start).toLocaleDateString(undefined, { month: "numeric", day: "numeric" })}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-4 mt-3 font-mono text-[10px] text-slate-500">
                    <span className="flex items-center gap-1.5"><span className="h-2 w-2 bg-sky-500" /> Opened</span>
                    <span className="flex items-center gap-1.5"><span className="h-2 w-2 bg-slate-600" /> Resolved</span>
                  </div>
                </Panel>

                {/* Status split */}
                <Panel title="Open vs Closed" hint="backlog posture">
                  <StatusRing open={stats.open} closed={stats.closed} />
                </Panel>
              </section>

              <section className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                {/* Priority breakdown */}
                <Panel title="Open by Priority" hint="click to filter table">
                  <div className="space-y-3 pt-1">
                    {stats.byPriority.map(({ p, n }) => {
                      const m = prioMeta(p);
                      const active = prioFilter === p;
                      return (
                        <button
                          key={p}
                          onClick={() => setPrioFilter(active ? null : p)}
                          className={`w-full text-left group ${active ? "opacity-100" : "opacity-90 hover:opacity-100"}`}
                        >
                          <div className="flex items-center justify-between font-mono text-[11px] mb-1">
                            <span className={`flex items-center gap-2 ${m.text}`}>
                              <span className={`h-2 w-2 ${m.dot}`} />
                              {m.label}
                              {active && <span className="text-slate-500">· filtering</span>}
                            </span>
                            <span className="text-slate-300">{n}</span>
                          </div>
                          <div className="h-2 bg-slate-800/70 overflow-hidden">
                            <div className={`h-full ${m.bar} transition-all`} style={{ width: `${(n / maxPrio) * 100}%` }} />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </Panel>

                {/* Team workload */}
                <Panel title="Team Workload" hint="open cases · top teams">
                  <div className="space-y-3 pt-1">
                    {stats.teams.length === 0 && <Empty />}
                    {stats.teams.map(({ team, n }) => (
                      <div key={team}>
                        <div className="flex items-center justify-between font-mono text-[11px] mb-1">
                          <span className="text-slate-300 truncate pr-2">{team}</span>
                          <span className="text-slate-400">{n}</span>
                        </div>
                        <div className="h-2 bg-slate-800/70 overflow-hidden">
                          <div className="h-full bg-purple-500/80" style={{ width: `${(n / maxTeam) * 100}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </Panel>

                {/* Snapshot / posture */}
                <Panel title="Risk Posture" hint="open workload summary">
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    {stats.byPriority.slice(0, 4).map(({ p, n }) => {
                      const m = prioMeta(p);
                      return (
                        <div key={p} className={`border ${m.bg} px-3 py-3`}>
                          <div className={`font-mono text-2xl font-semibold ${m.text}`}>{n}</div>
                          <div className="font-mono text-[10px] uppercase tracking-widest text-slate-500 mt-1">{m.label} open</div>
                        </div>
                      );
                    })}
                  </div>
                  <p className="font-mono text-[11px] text-slate-500 leading-relaxed mt-4">
                    {stats.openCritHigh > 0
                      ? `${stats.openCritHigh} high-severity case${stats.openCritHigh === 1 ? "" : "s"} require executive visibility.`
                      : "No critical or high-severity cases currently open."}
                  </p>
                </Panel>
              </section>

              {/* Open cases table */}
              <section className="mt-4">
                <Panel
                  title="Open Cases"
                  hint={`${tableRows.length} shown${prioFilter ? ` · ${prioMeta(prioFilter).label}` : ""}`}
                  action={
                    <div className="flex items-center gap-2">
                      {prioFilter && (
                        <button onClick={() => setPrioFilter(null)} className="font-mono text-[10px] uppercase tracking-widest text-slate-500 hover:text-slate-300">
                          clear filter
                        </button>
                      )}
                      <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="search name, team, tag…"
                        className="font-mono text-[11px] bg-slate-900/70 border border-slate-700 px-3 py-1.5 w-52 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-sky-500/60"
                      />
                    </div>
                  }
                >
                  <div className="overflow-x-auto -mx-4 sm:-mx-5">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="font-mono text-[10px] uppercase tracking-widest text-slate-500 border-b border-slate-800">
                          <th className="py-2 px-3 font-medium">Priority</th>
                          <th className="py-2 px-3 font-medium">Case</th>
                          <th className="py-2 px-3 font-medium hidden md:table-cell">Team</th>
                          <th className="py-2 px-3 font-medium hidden lg:table-cell">Assignee</th>
                          <th className="py-2 px-3 font-medium text-right">Age</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tableRows.length === 0 && (
                          <tr><td colSpan={5} className="py-10 text-center font-mono text-sm text-slate-600">No matching open cases</td></tr>
                        )}
                        {tableRows.slice(0, 100).map((c) => {
                          const m = prioMeta(c.priority);
                          const start = c.opened_at ?? c.created_at;
                          const age = start ? now - new Date(start).getTime() : null;
                          return (
                            <tr key={c.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                              <td className="py-2.5 px-3">
                                <span className={`inline-flex items-center gap-1.5 border ${m.bg} px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${m.text}`}>
                                  <span className={`h-1.5 w-1.5 ${m.dot}`} />
                                  {m.label}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 max-w-[520px]">
                                {c.url ? (
                                  <a href={c.url} target="_blank" rel="noreferrer" className="text-slate-200 hover:text-sky-300 transition-colors text-sm truncate block">
                                    {c.name}
                                  </a>
                                ) : (
                                  <span className="text-slate-200 text-sm truncate block">{c.name}</span>
                                )}
                                {c.tags.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {c.tags.slice(0, 4).map((t) => (
                                      <span key={t} className="font-mono text-[9px] text-slate-500 bg-slate-800/60 px-1.5 py-0.5">{t}</span>
                                    ))}
                                    {c.tags.length > 4 && <span className="font-mono text-[9px] text-slate-600">+{c.tags.length - 4}</span>}
                                  </div>
                                )}
                              </td>
                              <td className="py-2.5 px-3 hidden md:table-cell font-mono text-[11px] text-slate-400">{c.team}</td>
                              <td className="py-2.5 px-3 hidden lg:table-cell text-[12px] text-slate-400">
                                {c.assignees.length ? c.assignees.map((a) => a.name).join(", ") : <span className="text-slate-600">unassigned</span>}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono text-[11px] text-slate-400">{age != null ? fmtAge(age) : "—"}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </Panel>
              </section>

              <footer className="py-8 text-center font-mono text-[10px] text-slate-600 tracking-widest">
                CASE COMMAND · DATA VIA TINES CASES API · {stats.total} CASES INDEXED
              </footer>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

function Kpi({ label, value, accent, pulse }: { label: string; value: number | string; accent: string; pulse?: boolean }) {
  return (
    <div className="border border-slate-800 bg-[#0a0e15]/80 px-4 py-4 relative overflow-hidden">
      {pulse && <div className="absolute top-0 left-0 h-full w-0.5 bg-rose-500 animate-pulse" />}
      <div className={`font-mono text-3xl font-semibold ${accent}`}>{value}</div>
      <div className="font-mono text-[10px] uppercase tracking-widest text-slate-500 mt-1.5 leading-tight">{label}</div>
    </div>
  );
}

function Panel({ title, hint, action, children, className = "" }: { title: string; hint?: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <div className={`border border-slate-800 bg-[#0a0e15]/70 ${className}`}>
      <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-slate-800">
        <div>
          <h2 className="font-mono text-[12px] font-semibold uppercase tracking-widest text-slate-200">{title}</h2>
          {hint && <p className="font-mono text-[10px] text-slate-500 mt-0.5">{hint}</p>}
        </div>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function StatusRing({ open, closed }: { open: number; closed: number }) {
  const total = open + closed || 1;
  const openPct = (open / total) * 100;
  const r = 52;
  const circ = 2 * Math.PI * r;
  const openLen = (openPct / 100) * circ;
  return (
    <div className="flex items-center gap-6">
      <svg viewBox="0 0 140 140" className="h-40 w-40 -rotate-90">
        <circle cx="70" cy="70" r={r} fill="none" stroke="#1e293b" strokeWidth="16" />
        <circle cx="70" cy="70" r={r} fill="none" stroke="#0ea5e9" strokeWidth="16" strokeDasharray={`${openLen} ${circ - openLen}`} />
      </svg>
      <div className="space-y-4">
        <div>
          <div className="font-mono text-2xl font-semibold text-sky-300">{open}</div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-slate-500 flex items-center gap-1.5"><span className="h-2 w-2 bg-sky-500" /> Open ({openPct.toFixed(0)}%)</div>
        </div>
        <div>
          <div className="font-mono text-2xl font-semibold text-slate-300">{closed}</div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-slate-500 flex items-center gap-1.5"><span className="h-2 w-2 bg-slate-700" /> Closed</div>
        </div>
      </div>
    </div>
  );
}

function Empty() {
  return <div className="font-mono text-[11px] text-slate-600 py-4">No data</div>;
}
