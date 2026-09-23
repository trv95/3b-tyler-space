import { FormEvent, useEffect, useState } from "react";

type Result = {
  id?: string; enrichedAt?: string; ip: string; verdict: string; country: string | null;
  network: string | null; asOwner: string | null;
  analysis: { malicious: number; suspicious: number; harmless: number; undetected: number };
  reportUrl: string; slack: { channel: string; timestamp: string };
};

function route(path: string) {
  const branch = window.location.pathname.match(/^\/__3b\/branch\/[^/]+/);
  return `${branch ? branch[0] : ""}${path}`;
}

function badge(verdict: string) {
  return verdict === "malicious" ? "border-red-400/70 bg-red-400/10 text-red-300" : verdict === "suspicious" ? "border-amber-300/70 bg-amber-300/10 text-amber-200" : "border-lime-300/70 bg-lime-300/10 text-lime-200";
}

export default function App() {
  const [ip, setIp] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [result, setResult] = useState<Result | null>(null);
  const [history, setHistory] = useState<Result[]>([]);
  const [historyError, setHistoryError] = useState("");
  const [error, setError] = useState("");

  async function loadHistory() {
    try {
      const response = await fetch(route("/ip-enrichment-history"), { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "History could not be loaded.");
      setHistory(data.items || []);
      setHistoryError("");
    } catch (cause) {
      setHistoryError(cause instanceof Error ? cause.message : "History could not be loaded.");
    }
  }

  useEffect(() => { void loadHistory(); }, []);

  async function submit(event: FormEvent) {
    event.preventDefault(); setStatus("loading"); setError(""); setResult(null);
    try {
      const response = await fetch(route("/ip-enrichment-submit"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ip: ip.trim() }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "The enrichment request failed.");
      setResult(data); setStatus("success"); setHistory((items) => [data, ...items]); setIp("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "The enrichment request failed."); setStatus("error"); }
  }

  return <main className="min-h-screen bg-slate-950 text-slate-100 selection:bg-lime-300 selection:text-slate-950">
    <title>IP enrichment console</title>
    <div className="pointer-events-none fixed inset-0 opacity-40 [background-image:linear-gradient(rgba(148,163,184,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,.08)_1px,transparent_1px)] [background-size:40px_40px]" />
    <div className="relative mx-auto max-w-7xl px-5 py-8 lg:px-10">
      <header className="flex items-center justify-between border-b border-slate-800 pb-5">
        <div className="flex items-center gap-3"><span className="h-2.5 w-2.5 rounded-full bg-lime-300 shadow-[0_0_18px_rgba(190,242,100,.8)]"/><span className="font-mono text-xs uppercase tracking-[0.28em] text-slate-400">Threat intelligence / IP</span></div>
        <span className="font-mono text-xs text-slate-500">VT → SLACK → LEDGER</span>
      </header>

      <div className="grid gap-10 py-12 lg:grid-cols-[.72fr_1.28fr]">
        <div>
          <section className="mb-8">
            <p className="mb-4 font-mono text-xs uppercase tracking-[0.25em] text-lime-300">Reputation check</p>
            <h1 className="max-w-xl font-serif text-5xl leading-[1.02] tracking-tight sm:text-6xl">Turn an address into <span className="italic text-slate-400">context.</span></h1>
            <p className="mt-5 max-w-lg leading-7 text-slate-400">Query VirusTotal, notify <span className="text-slate-200">#3b-demo</span>, and retain the determination for future analysis.</p>
          </section>

          <section className="border border-slate-700 bg-slate-900/80 p-6 shadow-2xl backdrop-blur">
            <div className="mb-6 flex items-center justify-between"><h2 className="font-mono text-sm uppercase tracking-[0.18em]">New lookup</h2><span className="font-mono text-xs text-slate-600">LIVE QUERY</span></div>
            <form onSubmit={submit} className="space-y-5">
              <label className="block"><span className="mb-2 block font-mono text-xs uppercase tracking-wider text-slate-400">IP address</span><input required autoFocus value={ip} onChange={(e) => setIp(e.target.value)} placeholder="8.8.8.8" className="w-full border border-slate-700 bg-slate-950 px-4 py-4 font-mono text-lg outline-none transition placeholder:text-slate-700 focus:border-lime-300 focus:ring-1 focus:ring-lime-300"/></label>
              <button disabled={status === "loading"} className="group flex w-full items-center justify-between bg-lime-300 px-5 py-4 font-mono text-sm font-bold uppercase tracking-wider text-slate-950 transition hover:bg-lime-200 disabled:cursor-wait disabled:bg-slate-600"><span>{status === "loading" ? "Running intelligence…" : "Enrich and send"}</span><span className="transition group-hover:translate-x-1">→</span></button>
            </form>
            {status === "error" && <div role="alert" className="mt-5 border-l-2 border-red-400 bg-red-400/10 p-4 text-sm text-red-200">{error}</div>}
            {result && <div className="mt-5 flex items-center justify-between border-t border-slate-700 pt-5"><div><p className="font-mono text-xs uppercase text-slate-500">Recorded & delivered</p><p className="mt-1 font-mono text-lg text-lime-300">{result.ip}</p></div><span className={`border px-2 py-1 font-mono text-xs uppercase ${badge(result.verdict)}`}>{result.verdict}</span></div>}
          </section>
        </div>

        <section className="min-w-0 border border-slate-800 bg-slate-900/45">
          <div className="flex items-end justify-between border-b border-slate-800 p-6">
            <div><p className="font-mono text-xs uppercase tracking-[.22em] text-lime-300">Persistent ledger</p><h2 className="mt-2 font-serif text-3xl">Enrichment history</h2></div>
            <span className="font-mono text-xs text-slate-500">{history.length} RECORD{history.length === 1 ? "" : "S"}</span>
          </div>
          {historyError && <div className="m-6 border-l-2 border-red-400 bg-red-400/10 p-4 text-sm text-red-200">{historyError}</div>}
          {!historyError && history.length === 0 && <div className="p-12 text-center"><p className="font-serif text-2xl text-slate-300">No determinations yet.</p><p className="mt-2 font-mono text-xs uppercase tracking-wider text-slate-600">Your first lookup will appear here</p></div>}
          <div className="divide-y divide-slate-800">
            {history.map((item, index) => <article key={item.id || `${item.ip}-${item.enrichedAt}-${index}`} className="group grid gap-4 p-5 transition hover:bg-slate-800/35 sm:grid-cols-[1.1fr_.8fr_.7fr_auto] sm:items-center">
              <div><a href={item.reportUrl} target="_blank" rel="noreferrer" className="font-mono text-base text-slate-100 underline-offset-4 group-hover:text-lime-300 group-hover:underline">{item.ip}</a><p className="mt-1 truncate text-xs text-slate-500">{item.asOwner || item.network || "No network context"}</p></div>
              <div><p className="font-mono text-[10px] uppercase tracking-wider text-slate-600">Determination</p><span className={`mt-1 inline-block border px-2 py-1 font-mono text-[10px] uppercase ${badge(item.verdict)}`}>{item.verdict}</span></div>
              <div className="font-mono text-xs text-slate-400"><span className="text-red-300">{item.analysis.malicious}M</span><span className="mx-2 text-slate-700">/</span><span className="text-amber-200">{item.analysis.suspicious}S</span><p className="mt-1 text-[10px] text-slate-600">{item.country || "Unknown country"}</p></div>
              <time className="font-mono text-[10px] uppercase tracking-wide text-slate-600" dateTime={item.enrichedAt}>{item.enrichedAt ? new Date(item.enrichedAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : "Legacy"}</time>
            </article>)}
          </div>
        </section>
      </div>
      <footer className="border-t border-slate-800 pt-5 font-mono text-xs text-slate-600">SECURE WORKSPACE · CONNECTOR-AUTHENTICATED · HISTORY RETAINED</footer>
    </div>
  </main>;
}
