import { useEffect, useMemo, useState } from "react";
import { pages } from "./content";

const STORAGE_KEY = "3b-tenant-setup-progress";
const NOTES_KEY = "3b-tenant-setup-se-notes";


const T = {
  pageBg: "#FCF9F5",
  cardBg: "rgba(248,244,240,0.82)",
  border: "#EDE9E3",
  inputBg: "#F6F2EE",
  textPrimary: "#362A51",
  textSecondary: "rgba(54,42,81,0.55)",
  textMuted: "rgba(54,42,81,0.35)",
  green500: "#25A871",
  teal500: "#04B9AD",
};

// Required pages use the purple accent family; optional pages swap the whole family to
// yellow so they read as clearly set apart from the main path.
const PURPLE = {
  accent: "#8D75E6",
  accentHover: "#7F69CE",
  accentDeep: "#4D3E78",
  tint50: "#F3ECF7",
  tint100: "#EADFF8",
  tint200: "#D7C4FA",
  onAccent: "#FFFFFF",
  glow: "radial-gradient(900px 480px at 8% -10%, rgba(215,196,250,0.5), transparent 62%), radial-gradient(700px 420px at 98% 0%, rgba(243,236,247,0.9), transparent 60%)",
};

const YELLOW = {
  accent: "#E0A106",
  accentHover: "#C68C00",
  accentDeep: "#7A5300",
  tint50: "#FDF3DA",
  tint100: "#FBE7B4",
  tint200: "#F5D68A",
  onAccent: "#3A2800",
  glow: "radial-gradient(900px 480px at 8% -10%, rgba(245,214,138,0.55), transparent 62%), radial-gradient(700px 420px at 98% 0%, rgba(253,243,218,0.95), transparent 60%)",
};

function useChecked() {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setChecked(JSON.parse(raw));
    } catch {}
  }, []);
  const toggle = (key: string) =>
    setChecked((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  return { checked, toggle };
}

function useNotes() {
  const [notes, setNotes] = useState<Record<string, string>>({});
  useEffect(() => {
    try {
      const raw = localStorage.getItem(NOTES_KEY);
      if (raw) setNotes(JSON.parse(raw));
    } catch {}
  }, []);
  const setNote = (key: string, value: string) =>
    setNotes((prev) => {
      const next = { ...prev, [key]: value };
      try {
        localStorage.setItem(NOTES_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  return { notes, setNote };
}

const LINK_PATTERN = /\[([^\]]+)\]\(((?:https?:\/\/|\/)[^\s)]+)\)/g;

// This page is served from <space>.<tenant>.3b.run, while tenant settings live on the
// tenant app host <tenant>.3b.dev — so settings paths are resolved against that host and
// the workflow keeps working when exported into a different tenant.
function tenantOrigin() {
  const labels = window.location.hostname.split(".");
  if (labels.length < 4) return window.location.origin;
  const host = labels.slice(1).join(".").replace(/\.run$/, ".dev");
  return `https://${host}`;
}

function resolveHref(href: string) {
  return href.startsWith("/") ? `${tenantOrigin()}${href}` : href;
}

function RichText({ text, color }: { text: string; color: string }) {
  const parts: (string | { label: string; href: string })[] = [];
  let cursor = 0;
  for (const match of text.matchAll(LINK_PATTERN)) {
    const start = match.index ?? 0;
    if (start > cursor) parts.push(text.slice(cursor, start));
    parts.push({ label: match[1], href: resolveHref(match[2]) });
    cursor = start + match[0].length;
  }
  if (cursor < text.length) parts.push(text.slice(cursor));

  return (
    <>
      {parts.map((part, i) =>
        typeof part === "string" ? (
          <span key={i}>{part}</span>
        ) : (
          <a
            key={i}
            href={part.href}
            target="_blank"
            rel="noreferrer"
            className="font-medium underline decoration-1 underline-offset-2"
            style={{ color }}
          >
            {part.label}
          </a>
        )
      )}
    </>
  );
}

function requestEndpoint() {
  const branch = new URLSearchParams(window.location.search).get("branch");
  return `/tenant-setup-request${branch ? `?branch=${encodeURIComponent(branch)}` : ""}`;
}

function docsHref() {
  const branch = new URLSearchParams(window.location.search).get("branch");
  return `/tenant-setup-docs${branch ? `?branch=${encodeURIComponent(branch)}` : ""}`;
}

async function sendRequest(payload: { step: string; title: string; notes?: string; remove?: boolean }) {
  const response = await fetch(requestEndpoint(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
}

export default function App() {
  const [index, setIndex] = useState(0);
  const { checked, toggle } = useChecked();
  const { notes, setNote } = useNotes();
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const page = pages[index];
  const C = page.optional ? YELLOW : PURPLE;
  const helpKey = `${page.slug}:se-help`;
  const choiceKey = `${page.slug}:choice`;
  const helpWanted = !!checked[helpKey];
  const progress = useMemo(() => (index / (pages.length - 1)) * 100, [index]);
  const done = index === pages.length - 1;

  useEffect(() => {
    setStatus("idle");
  }, [index]);

  const submitHelp = async (payload: {
    step: string;
    title: string;
    notes?: string;
    remove?: boolean;
  }) => {
    setStatus("sending");
    try {
      await sendRequest(payload);
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  };

  const toggleHelp = () => {
    const nowWanted = !helpWanted;
    toggle(helpKey);
    void submitHelp(
      nowWanted
        ? { step: page.slug, title: page.title, notes: notes[helpKey] ?? "" }
        : { step: page.slug, title: page.title, remove: true }
    );
  };

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [index]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" && index < pages.length - 1) setIndex(index + 1);
      if (e.key === "ArrowLeft" && index > 0) setIndex(index - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index]);

  return (
    <div className="min-h-screen" style={{ background: T.pageBg, color: T.textPrimary }}>
      <title>{`${page.title} — Tines 3B tenant setup`}</title>

      <div className="pointer-events-none fixed inset-0" style={{ background: C.glow }} />

      <header
        className="sticky top-0 z-40 backdrop-blur-md"
        style={{ background: "rgba(252,249,245,0.9)", borderBottom: `1px solid ${T.border}` }}
      >
        <div className="mx-auto flex max-w-4xl items-center gap-4 px-7 py-4">
          <div className="flex items-center gap-2">
            <span
              className="inline-block h-4 w-4 rounded-full"
              style={{ background: C.accent, boxShadow: `0 0 0 4px ${C.tint50}` }}
            />
            <span className="text-[15px] font-semibold" style={{ color: T.textPrimary }}>
              Tines 3B
            </span>
            <span className="text-[15px]" style={{ color: T.textMuted }}>
              /
            </span>
            <span className="text-[15px]" style={{ color: T.textSecondary }}>
              Tenant setup
            </span>
          </div>
          <div
            className="ml-auto rounded-full px-3 py-1 text-[11px] font-semibold"
            style={{
              background: done ? "rgba(37,168,113,0.12)" : page.optional ? C.accent : C.tint50,
              color: done ? T.green500 : page.optional ? C.onAccent : C.accentDeep,
            }}
          >
            {done ? "Complete" : page.optional ? "Optional step" : `Step ${index + 1} of ${pages.length}`}
          </div>
        </div>

        <div className="mx-auto max-w-4xl px-7 pb-4">
          <div className="h-2 w-full overflow-hidden rounded-full" style={{ background: T.inputBg }}>
            <div
              className="h-full rounded-full transition-[width] duration-700 ease-out"
              style={{
                width: `${Math.max(progress, 3)}%`,
                background: done
                  ? `linear-gradient(90deg,${T.teal500},${T.green500})`
                  : `linear-gradient(90deg,${C.accentDeep},${C.accent})`,
              }}
            />
          </div>
          <nav className="mt-2 hidden gap-1 md:flex">
            {pages.map((p, i) => {
              const family = p.optional ? YELLOW : PURPLE;
              return (
                <button
                  key={p.slug}
                  onClick={() => setIndex(i)}
                  title={p.title}
                  aria-label={p.title}
                  className="h-1.5 flex-1 rounded-full transition-colors"
                  style={{
                    background: p.optional
                      ? i <= index
                        ? family.accent
                        : family.tint200
                      : i <= index
                        ? family.tint200
                        : T.border,
                  }}
                />
              );
            })}
          </nav>
        </div>
      </header>

      <main key={page.slug} className="rise relative mx-auto max-w-3xl px-7 pb-32 pt-10">
        <div
          className="rounded-[10px] p-7"
          style={{
            background: page.optional ? "rgba(253,243,218,0.55)" : T.cardBg,
            border: `1px solid ${page.optional ? C.tint200 : T.border}`,
            boxShadow: page.optional ? `inset 4px 0 0 ${C.accent}` : undefined,
          }}
        >
          <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: C.accentDeep }}>
            {page.eyebrow}
          </p>

          <h1
            className="mt-2 flex flex-wrap items-center gap-4 text-[22px] font-bold leading-snug"
            style={{ color: T.textPrimary }}
          >
            {page.title}
            {page.optional && (
              <span
                className="rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wider"
                style={{ background: C.accent, color: C.onAccent }}
              >
                Optional
              </span>
            )}
          </h1>

          <p className="mt-4 text-[16px] leading-relaxed" style={{ color: T.textSecondary }}>
            {page.lede}
          </p>

          {page.body && (
            <div className="mt-7 space-y-4 text-[14px] leading-relaxed" style={{ color: T.textPrimary }}>
              {page.body.map((t) => (
                <p key={t}>
                  <RichText text={t} color={C.accentDeep} />
                </p>
              ))}
            </div>
          )}

          {page.bullets && (
            <dl className="mt-7 space-y-2">
              {page.bullets.map((b) => (
                <div
                  key={b.term}
                  className="grid gap-1 rounded-lg p-4 md:grid-cols-[200px_1fr] md:gap-7"
                  style={{ background: page.optional ? "rgba(255,255,255,0.6)" : T.inputBg }}
                >
                  <dt className="text-[14px] font-semibold" style={{ color: T.textPrimary }}>
                    {b.term}
                  </dt>
                  <dd className="text-[14px] leading-relaxed" style={{ color: T.textSecondary }}>
                    <RichText text={b.text} color={C.accentDeep} />
                  </dd>
                </div>
              ))}
            </dl>
          )}

          {page.note && (
            <aside
              className="mt-7 rounded-lg p-4"
              style={{ background: C.tint100, borderLeft: `2px solid ${C.accent}` }}
            >
              <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: C.accentDeep }}>
                Note
              </p>
              <p className="mt-2 text-[14px] leading-relaxed" style={{ color: T.textPrimary }}>
                {page.note}
              </p>
            </aside>
          )}

          {(page.checklist || page.choices) && (
            <div className="mt-7">
              <p className="text-[12px] font-semibold" style={{ color: T.textSecondary }}>
                {page.choices ? page.choices.prompt : "Before moving on"}
              </p>
              <ul className="mt-4 space-y-2">
                {page.choices?.options.map((option) => {
                  const on = notes[choiceKey] === option;
                  return (
                    <li key={option}>
                      <button
                        onClick={() => setNote(choiceKey, on ? "" : option)}
                        className="flex w-full items-start gap-4 rounded-lg p-4 text-left text-[14px] transition-colors"
                        style={{
                          background: on ? "rgba(37,168,113,0.08)" : "#FFFEFD",
                          border: `1px solid ${on ? "rgba(37,168,113,0.35)" : T.border}`,
                          color: T.textPrimary,
                        }}
                      >
                        <span
                          className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full text-[11px] font-semibold"
                          style={{
                            background: on ? T.green500 : T.inputBg,
                            border: `1px solid ${on ? T.green500 : T.border}`,
                            color: "#FFFFFF",
                          }}
                        >
                          {on ? "✓" : ""}
                        </span>
                        <span>{option}</span>
                      </button>
                    </li>
                  );
                })}

                {page.checklist?.map((item) => {
                  const key = `${page.slug}:${item}`;
                  const on = !!checked[key];
                  return (
                    <li key={key}>
                      <button
                        onClick={() => toggle(key)}
                        className="flex w-full items-start gap-4 rounded-lg p-4 text-left text-[14px] transition-colors"
                        style={{
                          background: on ? "rgba(37,168,113,0.08)" : "#FFFEFD",
                          border: `1px solid ${on ? "rgba(37,168,113,0.35)" : T.border}`,
                          color: on ? T.textSecondary : T.textPrimary,
                        }}
                      >
                        <span
                          className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full text-[11px] font-semibold"
                          style={{
                            background: on ? T.green500 : T.inputBg,
                            border: `1px solid ${on ? T.green500 : T.border}`,
                            color: "#FFFFFF",
                          }}
                        >
                          {on ? "✓" : ""}
                        </span>
                        <span>{item}</span>
                      </button>
                    </li>
                  );
                })}

                <li>
                  <button
                    onClick={toggleHelp}
                    className="flex w-full items-start gap-4 rounded-lg p-4 text-left text-[14px] transition-colors"
                    style={{
                      background: helpWanted ? C.tint50 : "#FFFEFD",
                      border: `1px solid ${helpWanted ? C.tint200 : T.border}`,
                      color: T.textPrimary,
                    }}
                  >
                    <span
                      className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full text-[11px] font-semibold"
                      style={{
                        background: helpWanted ? C.accent : T.inputBg,
                        border: `1px solid ${helpWanted ? C.accent : T.border}`,
                        color: C.onAccent,
                      }}
                    >
                      {helpWanted ? "✓" : ""}
                    </span>
                    <span>I need a Tines Solutions Engineer to help me with this</span>
                  </button>

                  {helpWanted && (
                    <>
                      <textarea
                        value={notes[helpKey] ?? ""}
                        onChange={(e) => setNote(helpKey, e.target.value)}
                        rows={3}
                        placeholder="Optional: anything your Solutions Engineer should know before reaching out."
                        className="mt-2 w-full rounded-lg p-4 text-[14px] leading-relaxed outline-none"
                        style={{
                          background: page.optional ? "rgba(255,255,255,0.7)" : T.inputBg,
                          border: `1px solid ${T.border}`,
                          color: T.textPrimary,
                        }}
                      />
                      <p className="mt-2 text-[12px]" style={{ color: T.textSecondary }}>
                        {status === "sending"
                          ? "Saving…"
                          : status === "sent"
                            ? "Saved — your Solutions Engineer will see this."
                            : status === "error"
                              ? "Couldn't save. Try again."
                              : "Your notes are sent to your Solutions Engineer when you hit Continue."}
                      </p>
                    </>
                  )}
                </li>
              </ul>
            </div>
          )}

          {page.kind === "welcome" && (
            <div className="mt-7">
              <p className="text-[14px] font-semibold" style={{ color: T.textPrimary }}>
                Documentation index
              </p>
              <p className="mt-1 text-[14px] leading-relaxed" style={{ color: T.textSecondary }}>
                Every doc and settings page this flow references is indexed on its own page — open it
                any time you need one.
              </p>
              <a
                href={docsHref()}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-block rounded-lg px-4 py-2 text-[14px] font-semibold"
                style={{ background: C.accent, color: C.onAccent }}
              >
                Open the documentation index ↗
              </a>
            </div>
          )}

          {page.kind === "finish" && (
            <div
              className="mt-7 rounded-[10px] p-7 text-center"
              style={{ background: C.tint50, border: `1px solid ${C.tint100}` }}
            >
              <p className="text-[22px] font-bold" style={{ color: C.accentDeep }}>
                Ready to build
              </p>
              <p className="mt-2 text-[14px]" style={{ color: T.textSecondary }}>
                Foundation set. Head into a space and start your first workflow.
              </p>
            </div>
          )}
        </div>
      </main>

      <footer
        className="fixed inset-x-0 bottom-0 z-40 backdrop-blur-md"
        style={{ background: "rgba(252,249,245,0.92)", borderTop: `1px solid ${T.border}` }}
      >
        <div className="mx-auto flex max-w-3xl items-center gap-4 px-7 py-4">
          <button
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
            disabled={index === 0}
            className="rounded-lg px-4 py-2 text-[14px] font-medium transition-opacity disabled:opacity-40"
            style={{ background: T.inputBg, border: `1px solid ${T.border}`, color: T.textPrimary }}
          >
            Back
          </button>
          <span className="truncate text-[12px]" style={{ color: T.textMuted }}>
            {done ? "All steps complete" : `Next: ${pages[index + 1].title}`}
          </span>
          <button
            onClick={async () => {
              if (helpWanted) {
                await submitHelp({
                  step: page.slug,
                  title: page.title,
                  notes: notes[helpKey] ?? "",
                });
              }
              setIndex((i) => Math.min(pages.length - 1, i + 1));
            }}
            disabled={done || status === "sending"}
            className="ml-auto rounded-lg px-5 py-2 text-[14px] font-semibold transition-colors"
            style={{ background: done ? T.green500 : C.accent, color: done ? "#FFFFFF" : C.onAccent }}
            onMouseEnter={(e) => {
              if (!done) e.currentTarget.style.background = C.accentHover;
            }}
            onMouseLeave={(e) => {
              if (!done) e.currentTarget.style.background = C.accent;
            }}
          >
            {index === 0 ? "Get started" : done ? "Ready to build ✓" : "Continue"}
          </button>
        </div>
      </footer>
    </div>
  );
}
