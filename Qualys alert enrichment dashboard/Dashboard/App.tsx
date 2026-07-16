import { useEffect, useMemo, useState } from "react";

type Owner = {
  application?: string; service?: string; owner?: string; ownerEmail?: string;
  spoc?: string; spocEmail?: string; target?: string; project?: string; slack?: string; component?: string;
} | null;

type Alert = {
  findingId: string; qid?: string; priority?: string; risk?: string; title?: string;
  cve?: string; asset?: string; service?: string; ownerEmail?: string; target?: string;
  bug?: string; securityCentral?: string; remediation?: string;
};

type Enrich = {
  qualys?: any[]; securityCentral?: any[]; bugdb?: any[]; owners?: any[];
} | null;

type Row = { alert: Alert; enrich: Enrich; owner: Owner };
type Payload = { generatedAt: string; count: number; alerts: Row[] };

const PRIORITY: Record<string, { bg: string; fg: string; dot: string; label: string }> = {
  P0: { bg: "bg-rose-500/10", fg: "text-rose-300", dot: "bg-rose-400", label: "P0" },
  P1: { bg: "bg-orange-500/10", fg: "text-orange-300", dot: "bg-orange-400", label: "P1" },
  P2: { bg: "bg-amber-400/10", fg: "text-amber-200", dot: "bg-amber-300", label: "P2" },
  P3: { bg: "bg-sky-400/10", fg: "text-sky-300", dot: "bg-sky-400", label: "P3" },
};
const prio = (p?: string) => PRIORITY[p ?? ""] ?? { bg: "bg-slate-500/10", fg: "text-slate-300", dot: "bg-slate-400", label: p ?? "—" };

function fmtTime(iso?: string) {
  if (!iso) return "";
  try { return new Date(iso).toUTCString().replace("GMT", "UTC"); } catch { return iso; }
}

export default function App() {
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [pFilter, setPFilter] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  async function load() {
    setLoading(true); setError(null);
    try {
      // Forward the current query string (carries ?branch=… on draft builds).
      const res = await fetch(`/vuln-report-data${window.location.search}`, { headers: { Accept: "application/json" } });
      if (!res.ok) throw new Error(`Data endpoint returned ${res.status}`);
      const json = (await res.json()) as Payload;
      setData(json);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  const counts = useMemo(() => {
    const c: Record<string, number> = { P0: 0, P1: 0, P2: 0, P3: 0 };
    data?.alerts.forEach((r) => { const p = r.alert.priority ?? ""; if (c[p] != null) c[p]++; });
    return c;
  }, [data]);

  const services = useMemo(() => new Set(data?.alerts.map((r) => r.alert.service)).size, [data]);

  const rows = useMemo(() => {
    let rs = data?.alerts ?? [];
    if (pFilter) rs = rs.filter((r) => r.alert.priority === pFilter);
    if (q.trim()) {
      const t = q.toLowerCase();
      rs = rs.filter((r) =>
        [r.alert.title, r.alert.cve, r.alert.service, r.alert.findingId, r.alert.qid, r.owner?.owner, r.owner?.ownerEmail, r.alert.asset]
          .some((v) => (v ?? "").toString().toLowerCase().includes(t))
      );
    }
    const order = ["P0", "P1", "P2", "P3"];
    return [...rs].sort((a, b) => order.indexOf(a.alert.priority ?? "") - order.indexOf(b.alert.priority ?? ""));
  }, [data, q, pFilter]);

  return (
    <div className="min-h-screen bg-[#0a0c10] text-slate-200" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
      {/* backdrop grid */}
      <div className="pointer-events-none fixed inset-0 opacity-[0.5]"
        style={{ backgroundImage: "linear-gradient(#11161d 1px,transparent 1px),linear-gradient(90deg,#11161d 1px,transparent 1px)", backgroundSize: "42px 42px" }} />
      <div className="pointer-events-none fixed inset-x-0 top-0 h-64 bg-gradient-to-b from-amber-500/[0.06] to-transparent" />

      <div className="relative mx-auto max-w-7xl px-5 py-8 sm:px-8">
        {/* Header */}
        <header className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.35em] text-amber-400/80">
              <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-amber-400" />
              Oracle · UAT vulnerability feed
            </div>
            <h1 className="mt-3 text-3xl font-700 leading-none tracking-tight text-white sm:text-5xl"
              style={{ fontFamily: "'Chakra Petch', sans-serif", fontWeight: 700 }}>
              QUALYS THREAT CONSOLE
            </h1>
            <p className="mt-2 max-w-xl text-xs text-slate-500">
              Qualys findings enriched with Security Central &amp; BugDB context, routed to service owners.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right text-[11px] leading-tight text-slate-500">
              <div className="text-slate-400">SNAPSHOT</div>
              <div>{data ? fmtTime(data.generatedAt) : "—"}</div>
            </div>
            <button onClick={load} disabled={loading}
              className="group flex items-center gap-2 border border-slate-700 bg-slate-900/60 px-4 py-2.5 text-xs uppercase tracking-widest text-slate-200 transition hover:border-amber-400/60 hover:text-amber-300 disabled:opacity-40">
              <span className={loading ? "animate-spin" : "transition group-hover:rotate-180"}>↻</span>
              {loading ? "Querying" : "Refresh"}
            </button>
          </div>
        </header>

        {/* Stat strip */}
        <section className="mt-6 grid grid-cols-2 gap-px overflow-hidden border border-slate-800 bg-slate-800 sm:grid-cols-3 lg:grid-cols-6">
          <Stat label="Findings" value={data?.count ?? "—"} tone="text-white" />
          <Stat label="Services" value={services || "—"} tone="text-sky-300" />
          {(["P0", "P1", "P2", "P3"] as const).map((p) => (
            <button key={p} onClick={() => setPFilter(pFilter === p ? null : p)}
              className={`bg-[#0d1117] px-4 py-4 text-left transition hover:bg-[#11161d] ${pFilter === p ? "ring-1 ring-inset ring-amber-400/60" : ""}`}>
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${prio(p).dot}`} />
                <span className="text-[10px] uppercase tracking-[0.25em] text-slate-500">{p}</span>
              </div>
              <div className={`mt-1 text-2xl ${prio(p).fg}`} style={{ fontFamily: "'Chakra Petch',sans-serif", fontWeight: 700 }}>{counts[p]}</div>
            </button>
          ))}
        </section>

        {/* Controls */}
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-600">⌕</span>
            <input value={q} onChange={(e) => setQ(e.target.value)}
              placeholder="filter by title, cve, service, owner, asset…"
              className="w-full border border-slate-800 bg-[#0d1117] py-2.5 pl-9 pr-3 text-sm text-slate-200 placeholder:text-slate-600 outline-none focus:border-amber-400/50" />
          </div>
          {pFilter && (
            <button onClick={() => setPFilter(null)}
              className="border border-slate-700 px-3 py-2 text-xs uppercase tracking-widest text-amber-300 hover:bg-slate-900">
              {pFilter} ✕
            </button>
          )}
          <div className="text-xs text-slate-500">{rows.length} shown</div>
        </div>

        {/* States */}
        {error && (
          <div className="mt-6 border border-rose-500/40 bg-rose-500/5 p-5 text-sm text-rose-300">
            <div className="mb-1 uppercase tracking-widest text-rose-400">Feed error</div>
            {error}
          </div>
        )}
        {loading && !data && (
          <div className="mt-16 flex flex-col items-center gap-3 text-slate-600">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-700 border-t-amber-400" />
            <div className="text-xs uppercase tracking-[0.3em]">Querying oracle feed…</div>
          </div>
        )}

        {/* Table */}
        {data && (
          <div className="mt-4 overflow-hidden border border-slate-800">
            <div className="hidden grid-cols-[auto_1fr_auto_auto] gap-4 border-b border-slate-800 bg-[#0d1117] px-4 py-2.5 text-[10px] uppercase tracking-[0.25em] text-slate-500 md:grid">
              <div>Prio</div><div>Finding</div><div>Service / Owner</div><div>QID</div>
            </div>
            {rows.map((r) => {
              const p = prio(r.alert.priority);
              const isOpen = open === r.alert.findingId;
              return (
                <div key={r.alert.findingId} className="border-b border-slate-800/70 last:border-0">
                  <button onClick={() => setOpen(isOpen ? null : r.alert.findingId)}
                    className="grid w-full grid-cols-[auto_1fr] items-start gap-4 px-4 py-3.5 text-left transition hover:bg-[#0f141b] md:grid-cols-[auto_1fr_auto_auto] md:items-center">
                    <span className={`inline-flex items-center gap-1.5 ${p.bg} ${p.fg} px-2 py-1 text-[11px] font-700`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${p.dot}`} />{p.label}
                    </span>
                    <div className="min-w-0">
                      <div className="truncate text-sm text-slate-100">{r.alert.title || r.alert.findingId}</div>
                      <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-slate-500">
                        <span className="text-amber-300/80">{r.alert.cve || "no-cve"}</span>
                        <span>{r.alert.findingId}</span>
                        <span className="text-slate-600">{r.alert.risk}</span>
                      </div>
                    </div>
                    <div className="hidden text-right text-xs md:block">
                      <div className="text-slate-300">{r.alert.service}</div>
                      <div className="text-slate-500">{r.owner?.owner ?? "unassigned"}</div>
                    </div>
                    <div className="hidden text-right text-xs text-slate-500 md:block">{r.alert.qid || "—"}</div>
                  </button>

                  {isOpen && <Detail row={r} />}
                </div>
              );
            })}
            {rows.length === 0 && !loading && (
              <div className="px-4 py-12 text-center text-sm text-slate-600">No findings match the current filter.</div>
            )}
          </div>
        )}

        <footer className="mt-8 flex items-center justify-between border-t border-slate-800 pt-4 text-[11px] text-slate-600">
          <span>Sanitized UAT synthetic data · read-only</span>
          <span style={{ fontFamily: "'Chakra Petch',sans-serif" }}>QUALYS · SECURITY CENTRAL · BUGDB · OWNERS</span>
        </footer>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: React.ReactNode; tone: string }) {
  return (
    <div className="bg-[#0d1117] px-4 py-4">
      <div className="text-[10px] uppercase tracking-[0.25em] text-slate-500">{label}</div>
      <div className={`mt-1 text-2xl ${tone}`} style={{ fontFamily: "'Chakra Petch',sans-serif", fontWeight: 700 }}>{value}</div>
    </div>
  );
}

function Field({ k, v, accent }: { k: string; v?: React.ReactNode; accent?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] uppercase tracking-[0.2em] text-slate-600">{k}</span>
      <span className={`break-words text-xs ${accent ? "text-amber-300" : "text-slate-200"}`}>{v || "—"}</span>
    </div>
  );
}

function Detail({ row }: { row: Row }) {
  const { alert, owner, enrich } = row;
  const sc = enrich?.securityCentral?.[0];
  const bug = enrich?.bugdb?.[0];
  return (
    <div className="animate-in fade-in slide-in-from-top-1 grid gap-5 border-t border-slate-800 bg-[#0b0f14] px-4 py-5 lg:grid-cols-3">
      {/* Finding + remediation */}
      <div className="lg:col-span-2">
        <SectionTitle>Finding</SectionTitle>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Field k="Asset" v={alert.asset} />
          <Field k="CVE" v={alert.cve} accent />
          <Field k="Target" v={alert.target} />
          <Field k="Bug" v={alert.bug} />
          <Field k="Security Central" v={alert.securityCentral} />
          <Field k="Risk" v={alert.risk} />
        </div>
        {alert.remediation && (
          <div className="mt-4">
            <SectionTitle>Remediation</SectionTitle>
            <p className="border-l-2 border-amber-400/40 bg-slate-900/40 px-3 py-2 text-xs leading-relaxed text-slate-300">
              {alert.remediation}
            </p>
          </div>
        )}
        {(sc || bug) && (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {sc && (
              <div className="border border-slate-800 p-3">
                <SectionTitle>Security Central</SectionTitle>
                <Field k="Status" v={sc.status} />
                <div className="mt-2 grid grid-cols-2 gap-3">
                  <Field k="Severity" v={sc.severity} />
                  <Field k="Region" v={sc.region} />
                </div>
              </div>
            )}
            {bug && (
              <div className="border border-slate-800 p-3">
                <SectionTitle>BugDB</SectionTitle>
                <Field k="Status" v={bug.status} />
                <div className="mt-2 grid grid-cols-2 gap-3">
                  <Field k="Product" v={bug.product} />
                  <Field k="Component" v={bug.component} />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Owner card */}
      <div className="border border-slate-800 bg-gradient-to-b from-slate-900/60 to-transparent p-4">
        <SectionTitle>Owner / routing</SectionTitle>
        {owner ? (
          <div className="space-y-3">
            <div>
              <div className="text-lg text-white" style={{ fontFamily: "'Chakra Petch',sans-serif", fontWeight: 600 }}>{owner.owner}</div>
              <a href={`mailto:${owner.ownerEmail}`} className="text-xs text-amber-300 hover:underline">{owner.ownerEmail}</a>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field k="Application" v={owner.application} />
              <Field k="Component" v={owner.component} />
              <Field k="SPOC" v={owner.spoc} />
              <Field k="Project" v={owner.project} />
              <Field k="Tracker" v={owner.target} />
              <Field k="Slack" v={owner.slack} accent />
            </div>
          </div>
        ) : (
          <div className="text-xs text-slate-600">No owner mapped for <span className="text-slate-400">{alert.service}</span>.</div>
        )}
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div className="mb-2 text-[10px] uppercase tracking-[0.3em] text-slate-500">{children}</div>;
}
