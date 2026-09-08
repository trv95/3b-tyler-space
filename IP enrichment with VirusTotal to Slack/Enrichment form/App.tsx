import { FormEvent, useState } from "react";

type Result = {
  ip: string;
  verdict: string;
  country: string | null;
  network: string | null;
  asOwner: string | null;
  analysis: { malicious: number; suspicious: number; harmless: number; undetected: number };
  reportUrl: string;
  slack: { channel: string; timestamp: string };
};

function endpoint() {
  const branch = new URLSearchParams(window.location.search).get("branch");
  return `/ip-enrichment-submit${branch ? `?branch=${encodeURIComponent(branch)}` : ""}`;
}

export default function App() {
  const [ip, setIp] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setStatus("loading");
    setError("");
    setResult(null);
    try {
      const response = await fetch(endpoint(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ip: ip.trim() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "The enrichment request failed.");
      setResult(data);
      setStatus("success");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The enrichment request failed.");
      setStatus("error");
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 selection:bg-lime-300 selection:text-slate-950">
      <title>IP enrichment console</title>
      <div className="pointer-events-none fixed inset-0 opacity-40 [background-image:linear-gradient(rgba(148,163,184,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,.08)_1px,transparent_1px)] [background-size:40px_40px]" />
      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-8 lg:px-12">
        <header className="flex items-center justify-between border-b border-slate-800 pb-5">
          <div className="flex items-center gap-3">
            <span className="h-2.5 w-2.5 rounded-full bg-lime-300 shadow-[0_0_18px_rgba(190,242,100,.8)]" />
            <span className="font-mono text-xs uppercase tracking-[0.28em] text-slate-400">Threat intelligence / IP</span>
          </div>
          <span className="font-mono text-xs text-slate-500">VT → SLACK</span>
        </header>

        <div className="grid flex-1 items-center gap-16 py-16 lg:grid-cols-[1.05fr_.95fr]">
          <section>
            <p className="mb-5 font-mono text-xs uppercase tracking-[0.25em] text-lime-300">Reputation check</p>
            <h1 className="max-w-xl font-serif text-5xl leading-[1.02] tracking-tight sm:text-7xl">Turn an address into <span className="italic text-slate-400">context.</span></h1>
            <p className="mt-7 max-w-lg text-lg leading-8 text-slate-400">Query VirusTotal for a public IP and deliver a concise, analyst-ready reputation brief directly to <span className="text-slate-200">#3b-demo</span>.</p>
            <div className="mt-10 flex gap-8 border-l border-lime-300/50 pl-5 font-mono text-xs uppercase tracking-widest text-slate-500">
              <span>Public IPs only</span><span>No data stored</span>
            </div>
          </section>

          <section className="border border-slate-700 bg-slate-900/80 p-6 shadow-2xl backdrop-blur sm:p-8">
            <div className="mb-8 flex items-center justify-between">
              <h2 className="font-mono text-sm uppercase tracking-[0.18em]">New lookup</h2>
              <span className="font-mono text-xs text-slate-600">01 / 01</span>
            </div>
            <form onSubmit={submit} className="space-y-6">
              <label className="block">
                <span className="mb-2 block font-mono text-xs uppercase tracking-wider text-slate-400">IP address</span>
                <input required autoFocus value={ip} onChange={(e) => setIp(e.target.value)} placeholder="8.8.8.8" className="w-full border border-slate-700 bg-slate-950 px-4 py-4 font-mono text-lg outline-none transition placeholder:text-slate-700 focus:border-lime-300 focus:ring-1 focus:ring-lime-300" />
              </label>
              <div className="flex items-center justify-between border border-slate-800 bg-slate-950/60 px-4 py-3 font-mono text-xs">
                <span className="uppercase tracking-wider text-slate-500">Slack destination</span>
                <span className="text-lime-300">#3b-demo</span>
              </div>
              <button disabled={status === "loading"} className="group flex w-full items-center justify-between bg-lime-300 px-5 py-4 font-mono text-sm font-bold uppercase tracking-wider text-slate-950 transition hover:bg-lime-200 disabled:cursor-wait disabled:bg-slate-600">
                <span>{status === "loading" ? "Running intelligence…" : "Enrich and send"}</span><span className="transition group-hover:translate-x-1">→</span>
              </button>
            </form>

            {status === "error" && <div role="alert" className="mt-6 border-l-2 border-red-400 bg-red-400/10 p-4 text-sm text-red-200">{error}</div>}
            {result && <div className="mt-6 border-t border-slate-700 pt-6">
              <div className="flex items-start justify-between gap-4">
                <div><p className="font-mono text-xs uppercase tracking-wider text-slate-500">Delivered</p><p className="mt-1 font-mono text-lg text-lime-300">{result.ip}</p></div>
                <span className={`border px-2 py-1 font-mono text-xs uppercase ${result.verdict === "malicious" ? "border-red-400 text-red-300" : result.verdict === "suspicious" ? "border-amber-300 text-amber-200" : "border-lime-300 text-lime-200"}`}>{result.verdict}</span>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3 font-mono text-xs text-slate-400">
                <span>Malicious<br/><b className="text-lg text-slate-100">{result.analysis.malicious}</b></span>
                <span>Suspicious<br/><b className="text-lg text-slate-100">{result.analysis.suspicious}</b></span>
                <span>Country<br/><b className="text-lg text-slate-100">{result.country || "—"}</b></span>
              </div>
              <a href={result.reportUrl} target="_blank" rel="noreferrer" className="mt-5 inline-block font-mono text-xs uppercase tracking-wider text-slate-400 underline decoration-slate-600 underline-offset-4 hover:text-lime-300">Open VirusTotal report ↗</a>
            </div>}
          </section>
        </div>
        <footer className="border-t border-slate-800 pt-5 font-mono text-xs text-slate-600">SECURE WORKSPACE · CONNECTOR-AUTHENTICATED</footer>
      </div>
    </main>
  );
}
