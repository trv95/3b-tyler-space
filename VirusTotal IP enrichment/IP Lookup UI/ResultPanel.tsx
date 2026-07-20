import { Enrichment, Verdict, verdictOf, fmtDate, flag } from "./types";

const VERDICT_META: Record<Verdict, { label: string; accent: string; ring: string; glow: string; note: string }> = {
  malicious: { label: "MALICIOUS", accent: "text-red-400", ring: "border-red-500/50", glow: "shadow-[0_0_40px_-8px] shadow-red-500/40", note: "Flagged by security vendors" },
  suspicious: { label: "SUSPICIOUS", accent: "text-amber-400", ring: "border-amber-500/50", glow: "shadow-[0_0_40px_-8px] shadow-amber-500/40", note: "Some vendors raised concerns" },
  clean: { label: "CLEAN", accent: "text-emerald-400", ring: "border-emerald-500/40", glow: "shadow-[0_0_40px_-8px] shadow-emerald-500/30", note: "No vendors flagged this address" },
  unknown: { label: "UNKNOWN", accent: "text-zinc-400", ring: "border-zinc-600/50", glow: "", note: "No analysis data available" },
};

function StatBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <div>
      <div className="flex justify-between items-baseline mb-1.5">
        <span className="text-[11px] uppercase tracking-widest text-zinc-500">{label}</span>
        <span className="font-mono text-sm text-zinc-200 tabular-nums">{value}</span>
      </div>
      <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all duration-700`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-zinc-800 py-3">
      <div className="text-[11px] uppercase tracking-widest text-zinc-500 mb-1">{label}</div>
      <div className="font-mono text-sm text-zinc-100 break-all">{children ?? "—"}</div>
    </div>
  );
}

export default function ResultPanel({ data }: { data: Enrichment }) {
  const verdict = verdictOf(data);
  const meta = VERDICT_META[verdict];
  const s = data.stats;
  const total = s.malicious + s.suspicious + s.harmless + s.undetected + s.timeout;

  return (
    <div className={`rounded-2xl border ${meta.ring} bg-zinc-900/70 backdrop-blur ${meta.glow} overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500`}>
      {/* header */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-5 border-b border-zinc-800">
        <div>
          <div className="text-[11px] uppercase tracking-widest text-zinc-500">Target</div>
          <div className="font-mono text-2xl text-white">{data.ip}</div>
        </div>
        <div className="text-right">
          <div className={`font-display font-bold text-xl tracking-wide ${meta.accent}`}>{meta.label}</div>
          <div className="text-xs text-zinc-500">{meta.note}</div>
        </div>
      </div>

      {/* detection stats */}
      <div className="px-6 py-5 grid grid-cols-2 gap-x-8 gap-y-4 border-b border-zinc-800">
        <div className="col-span-2 flex items-baseline justify-between">
          <span className="text-xs uppercase tracking-widest text-zinc-500">Vendor analysis</span>
          <span className="font-mono text-xs text-zinc-500">{total} engines</span>
        </div>
        <StatBar label="Malicious" value={s.malicious} total={total} color="bg-red-500" />
        <StatBar label="Suspicious" value={s.suspicious} total={total} color="bg-amber-500" />
        <StatBar label="Harmless" value={s.harmless} total={total} color="bg-emerald-500" />
        <StatBar label="Undetected" value={s.undetected} total={total} color="bg-zinc-500" />
      </div>

      {/* meta grid */}
      <div className="px-6 py-2 grid grid-cols-1 sm:grid-cols-2 gap-x-8">
        <Field label="Reputation score">
          <span className={data.reputation != null && data.reputation < 0 ? "text-red-400" : "text-emerald-400"}>
            {data.reputation ?? "—"}
          </span>
        </Field>
        <Field label="Community votes">
          <span className="text-emerald-400">{data.votes.harmless} harmless</span>
          <span className="text-zinc-600"> / </span>
          <span className="text-red-400">{data.votes.malicious} malicious</span>
        </Field>
        <Field label="Location">
          {data.country ? `${flag(data.country)} ${data.country}${data.continent ? ` · ${data.continent}` : ""}` : "—"}
        </Field>
        <Field label="ASN">{data.asn ? `AS${data.asn}` : "—"}</Field>
        <Field label="Owner">{data.as_owner}</Field>
        <Field label="Network">{data.network}</Field>
        <Field label="Registry">{data.regional_internet_registry}</Field>
        <Field label="Last analysis">{fmtDate(data.last_analysis_date)}</Field>
      </div>
      <div className="px-6 py-3 text-[11px] text-zinc-600 border-t border-zinc-800">
        Data via VirusTotal · last modified {fmtDate(data.last_modification_date)}
      </div>
    </div>
  );
}
