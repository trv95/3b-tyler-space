import { useCallback, useRef, useState } from "react";

const ACCEPTED = ["image/png", "image/jpeg", "image/webp", "image/gif"];
const MAX_BYTES = 5 * 1024 * 1024;

type Status = "idle" | "reviewing" | "done" | "error";

function inline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="text-cyan-200 font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code key={i} className="bg-cyan-400/10 text-cyan-200 px-1 rounded">
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

function Review({ markdown }: { markdown: string }) {
  const blocks: React.ReactNode[] = [];
  let list: string[] = [];

  const flush = () => {
    if (!list.length) return;
    blocks.push(
      <ul key={`l${blocks.length}`} className="space-y-2 mb-6">
        {list.map((item, i) => (
          <li key={i} className="flex gap-3 text-slate-300 leading-relaxed">
            <span className="text-cyan-400/70 select-none">—</span>
            <span>{inline(item)}</span>
          </li>
        ))}
      </ul>,
    );
    list = [];
  };

  for (const rawLine of markdown.split("\n")) {
    const line = rawLine.trim();
    if (!line) {
      flush();
      continue;
    }
    const bullet = line.match(/^[-*]\s+(.*)$/);
    if (bullet) {
      list.push(bullet[1]);
      continue;
    }
    flush();
    const heading = line.match(/^(#{1,4})\s+(.*)$/);
    if (heading) {
      blocks.push(
        <h2
          key={`h${blocks.length}`}
          className="font-display text-2xl text-slate-50 mt-10 mb-4 first:mt-0 tracking-tight border-b border-cyan-400/20 pb-2"
        >
          {heading[2]}
        </h2>,
      );
      continue;
    }
    blocks.push(
      <p key={`p${blocks.length}`} className="text-slate-300 leading-relaxed mb-4">
        {inline(line)}
      </p>,
    );
  }
  flush();

  return <div>{blocks}</div>;
}

export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [review, setReview] = useState("");
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const accept = useCallback((picked: File | undefined) => {
    if (!picked) return;
    if (!ACCEPTED.includes(picked.type)) {
      setError("Please upload a PNG, JPEG, WebP or GIF image.");
      setStatus("error");
      return;
    }
    if (picked.size > MAX_BYTES) {
      setError("That image is larger than 5 MB. Please upload a smaller export.");
      setStatus("error");
      return;
    }
    setError("");
    setStatus("idle");
    setReview("");
    setFile(picked);
    setPreview(URL.createObjectURL(picked));
  }, []);

  const submit = useCallback(async () => {
    if (!file) return;
    setStatus("reviewing");
    setError("");
    setReview("");
    try {
      const image = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error("Could not read that file"));
        reader.readAsDataURL(file);
      });

      const branch = new URLSearchParams(window.location.search).get("branch");
      const response = await fetch(
        `/architecture-analyze${branch ? `?branch=${encodeURIComponent(branch)}` : ""}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image, mediaType: file.type, filename: file.name }),
        },
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? `Analysis failed (${response.status})`);
      setReview(payload.review);
      setStatus("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analysis failed");
      setStatus("error");
    }
  }, [file]);

  const reviewing = status === "reviewing";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-body">
      <title>Architecture Review</title>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Bodoni+Moda:opsz,wght@6..96,500;6..96,700&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap"
      />
      <style>{`
        .font-display { font-family: 'Bodoni Moda', Georgia, serif; }
        .font-body { font-family: 'IBM Plex Sans', sans-serif; }
        .font-mono2 { font-family: 'IBM Plex Mono', monospace; }
        .grid-bg {
          background-image:
            linear-gradient(rgba(34,211,238,0.06) 1px, transparent 1px),
            linear-gradient(90deg, rgba(34,211,238,0.06) 1px, transparent 1px);
          background-size: 44px 44px;
        }
        @keyframes sweep { 0% { transform: translateX(-100%) } 100% { transform: translateX(320%) } }
        .sweep { animation: sweep 1.6s cubic-bezier(.4,0,.2,1) infinite; }
        @keyframes rise { from { opacity: 0; transform: translateY(12px) } to { opacity: 1; transform: none } }
        .rise { animation: rise .5s ease both; }
      `}</style>

      <div className="grid-bg">
        <header className="max-w-6xl mx-auto px-6 pt-16 pb-10">
          <p className="font-mono2 text-xs tracking-[0.35em] uppercase text-cyan-400/80">
            Architecture desk
          </p>
          <h1 className="font-display text-5xl md:text-6xl text-slate-50 mt-4 leading-[1.05]">
            Submit a diagram.
            <br />
            <span className="italic text-cyan-300">Get an honest review.</span>
          </h1>
          <p className="mt-5 max-w-xl text-slate-400 leading-relaxed">
            Upload an architecture diagram and it is read by Claude, then returned as a
            structured review — risks, security gaps and scalability recommendations.
          </p>
        </header>

        <main className="max-w-6xl mx-auto px-6 pb-24 grid lg:grid-cols-[1fr_1.15fr] gap-10 items-start">
          <section className="lg:sticky lg:top-10">
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                accept(e.dataTransfer.files[0]);
              }}
              onClick={() => inputRef.current?.click()}
              className={`relative cursor-pointer border transition-colors ${
                dragging
                  ? "border-cyan-300 bg-cyan-400/10"
                  : "border-slate-700 bg-slate-900/60 hover:border-cyan-400/60"
              }`}
            >
              <div className="absolute -top-px -left-px w-3 h-3 border-t border-l border-cyan-400" />
              <div className="absolute -top-px -right-px w-3 h-3 border-t border-r border-cyan-400" />
              <div className="absolute -bottom-px -left-px w-3 h-3 border-b border-l border-cyan-400" />
              <div className="absolute -bottom-px -right-px w-3 h-3 border-b border-r border-cyan-400" />

              {preview ? (
                <img
                  src={preview}
                  alt="Uploaded architecture diagram"
                  className="w-full max-h-[420px] object-contain bg-slate-950/60 p-3"
                />
              ) : (
                <div className="px-8 py-20 text-center">
                  <p className="font-mono2 text-sm text-slate-300">
                    Drop diagram here
                  </p>
                  <p className="mt-2 text-xs text-slate-500 font-mono2">
                    PNG · JPEG · WEBP · GIF — up to 5 MB
                  </p>
                </div>
              )}
              <input
                ref={inputRef}
                type="file"
                accept={ACCEPTED.join(",")}
                className="hidden"
                onChange={(e) => accept(e.target.files?.[0])}
              />
            </div>

            {file && (
              <p className="mt-3 font-mono2 text-xs text-slate-500 truncate">
                {file.name} · {(file.size / 1024).toFixed(0)} KB
              </p>
            )}

            <button
              onClick={submit}
              disabled={!file || reviewing}
              className="mt-6 w-full font-mono2 text-sm uppercase tracking-[0.2em] py-4 bg-cyan-300 text-slate-950 font-medium transition hover:bg-cyan-200 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed"
            >
              {reviewing ? "Reviewing…" : "Run review"}
            </button>

            {error && (
              <p className="mt-4 border-l-2 border-red-400 pl-3 text-sm text-red-300">
                {error}
              </p>
            )}
          </section>

          <section className="min-h-[300px]">
            {reviewing && (
              <div className="border border-slate-800 bg-slate-900/40 p-8">
                <div className="h-px w-full bg-slate-800 overflow-hidden">
                  <div className="sweep h-px w-1/3 bg-cyan-300" />
                </div>
                <p className="mt-6 font-mono2 text-sm text-slate-400">
                  Tracing components, boundaries and data flow…
                </p>
              </div>
            )}

            {status === "done" && review && (
              <article className="rise border border-slate-800 bg-slate-900/40 p-8">
                <p className="font-mono2 text-xs tracking-[0.3em] uppercase text-cyan-400/80 mb-8">
                  Review findings
                </p>
                <Review markdown={review} />
              </article>
            )}

            {status !== "done" && !reviewing && (
              <div className="border border-dashed border-slate-800 p-8">
                <p className="font-mono2 text-sm text-slate-500">
                  The review will appear here.
                </p>
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}
