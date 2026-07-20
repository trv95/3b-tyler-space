import { useState } from "react";
import { Enrichment } from "./types";
import ResultPanel from "./ResultPanel";

type State =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "done"; data: Enrichment };

export default function App() {
  const [ip, setIp] = useState("");
  const [state, setState] = useState<State>({ kind: "idle" });

  async function lookup(e: React.FormEvent) {
    e.preventDefault();
    const value = ip.trim();
    if (!value) return;
    setState({ kind: "loading" });
    try {
      const res = await fetch("/vt-enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ip: value }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setState({ kind: "error", message: json?.error || `Lookup failed (HTTP ${res.status}).` });
        return;
      }
      setState({ kind: "done", data: json as Enrichment });
    } catch {
      setState({ kind: "error", message: "Network error — could not reach the lookup service." });
    }
  }

  const busy = state.kind === "loading";

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-mono relative overflow-hidden">
      {/* atmosphere */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{ backgroundImage: "radial-gradient(circle at 20% 0%, rgba(16,185,129,0.12), transparent 40%), radial-gradient(circle at 90% 20%, rgba(59,130,246,0.10), transparent 45%)" }} />
      <div className="pointer-events-none absolute inset-0"
        style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)", backgroundSize: "44px 44px" }} />

      <div className="relative mx-auto max-w-2xl px-6 py-16 sm:py-24">
        <header className="mb-10">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-emerald-400/80 mb-3">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            Threat Intel Console
          </div>
          <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight text-white">
            IP Reputation Lookup
          </h1>
          <p className="mt-3 text-sm text-zinc-400 max-w-md">
            Enter an IPv4 or IPv6 address to enrich it against VirusTotal — detection stats,
            reputation, ASN ownership and geolocation.
          </p>
        </header>

        <form onSubmit={lookup} className="flex flex-col sm:flex-row gap-3 mb-8">
          <div className="relative flex-1">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500/70 select-none">›</span>
            <input
              value={ip}
              onChange={(e) => setIp(e.target.value)}
              placeholder="8.8.8.8"
              spellCheck={false}
              autoFocus
              className="w-full rounded-xl bg-zinc-900 border border-zinc-800 pl-9 pr-4 py-3.5 text-white placeholder:text-zinc-600 outline-none focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/20 transition"
            />
          </div>
          <button
            type="submit"
            disabled={busy || !ip.trim()}
            className="rounded-xl bg-emerald-500 px-6 py-3.5 font-display font-semibold text-zinc-950 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed transition active:scale-[0.98]"
          >
            {busy ? "Scanning…" : "Enrich"}
          </button>
        </form>

        {state.kind === "idle" && (
          <p className="text-sm text-zinc-600">Awaiting target. Results will appear here.</p>
        )}

        {busy && (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 px-6 py-10 text-center">
            <div className="inline-block h-6 w-6 rounded-full border-2 border-zinc-700 border-t-emerald-400 animate-spin" />
            <p className="mt-3 text-sm text-zinc-500">Querying VirusTotal…</p>
          </div>
        )}

        {state.kind === "error" && (
          <div className="rounded-2xl border border-red-500/40 bg-red-950/30 px-6 py-5 flex items-start gap-3 animate-in fade-in duration-300">
            <span className="text-red-400 text-lg leading-none">⚠</span>
            <div>
              <div className="font-display font-semibold text-red-300">Lookup failed</div>
              <p className="text-sm text-red-200/80 mt-0.5">{state.message}</p>
            </div>
          </div>
        )}

        {state.kind === "done" && <ResultPanel data={state.data} />}

        <footer className="mt-12 text-[11px] text-zinc-700">
          Enrichment powered by the VirusTotal API v3.
        </footer>
      </div>
    </div>
  );
}
