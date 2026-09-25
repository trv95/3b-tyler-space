import { useCallback, useEffect, useRef, useState } from "react";

type Builder = { name: string; team: string; email: string };
type UseCase = {
  title: string;
  tools: string;
  description: string;
  owner: string;
  buildTime: string;
  feasibility: string;
  timeSaved: string;
};
type Milestone = { date: string; label: string; phase?: string; details?: string; note?: string };
type FeatureRequest = {
  id: string;
  title: string;
  details: string;
  requestedBy: string;
  impact: string;
  status: string;
  created: string;
};
type Doc = {
  account: string;
  summary: string;
  builders: Builder[];
  useCases: UseCase[];
  otherMetrics: string[];
  timeline: Milestone[];
  feedback: { liked: string; disliked: string; improve: string };
  featureRequests: FeatureRequest[];
  updatedAt?: string;
  initialized?: boolean;
};

const FEASIBILITY = ["Unknown", "Straightforward", "Moderate", "Complex", "Blocked"];
const FR_STATUS = ["New", "Under review", "Planned", "Shipped", "Declined"];
const IMPACT = ["Nice to have", "Important", "Blocking"];

const emptyBuilder = (): Builder => ({ name: "", team: "", email: "" });
const emptyUseCase = (): UseCase => ({
  title: "",
  tools: "",
  description: "",
  owner: "",
  buildTime: "",
  feasibility: "Unknown",
  timeSaved: "",
});
const emptyMilestone = (): Milestone => ({ date: "", label: "", phase: "", details: "", note: "" });

// Standard Tines 3B POV process (2–3 weeks from set up).
const POV_PROCESS: Milestone[] = [
  {
    date: "2026-08-24",
    label: "POV prep call — 30 min",
    phase: "",
    details:
      "Identify key tools needed\nIdentify key people involved\nIdentify key process for success",
  },
  {
    date: "2026-08-26",
    label: "POV set up call — 30 min",
    phase: "",
    details:
      "Provision 3B tenant / give access\nWalkthrough of product — 3B 101\nTool set up (need additional 30 min)",
  },
  {
    date: "2026-09-02",
    label: "Cowork session 1",
    phase: "Week 1",
    details:
      "Check in with team(s) on progress made with building\nTroubleshoot any tools/credentials challenges\nHands on feature reviews to show full product\nProduct feedback & feature alignment",
  },
  {
    date: "2026-09-04",
    label: "Cowork session 2",
    phase: "Week 1",
    details:
      "Check in with team(s) on progress made with building\nTroubleshoot any tools/credentials challenges\nHands on feature reviews to show full product\nProduct feedback & feature alignment",
  },
  {
    date: "2026-09-09",
    label: "Cowork session 3",
    phase: "Week 2–3",
    details:
      "Check in with team(s) on progress made with building\nTroubleshoot any tools/credentials challenges\nProduct feedback & feature alignment",
  },
  {
    date: "2026-09-16",
    label: "Cowork session 4",
    phase: "Week 2–3",
    details:
      "Check in with team(s) on progress made with building\nTroubleshoot any tools/credentials challenges\nProduct feedback & feature alignment",
  },
  {
    date: "2026-09-25",
    label: "Wrap up",
    phase: "POV wrap & proposal review",
    details:
      "POV success criteria review\nGather feedback\nDiscuss rollout, proposals, and next steps",
  },
  {
    date: "2026-09-30",
    label: "PBT contract renewal",
    phase: "POV wrap & proposal review",
    details: "",
  },
];

const formatDate = (iso: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!m) return iso;
  return `${Number(m[2])}/${Number(m[3])}`;
};

const starter: Doc = {
  account: "",
  summary:
    "Goals, owners, use cases and success metrics for the 3B proof of value. Filled in live with the team, then kept up to date here.",
  builders: [emptyBuilder(), emptyBuilder()],
  useCases: [emptyUseCase()],
  otherMetrics: [""],
  timeline: POV_PROCESS.map((m) => ({ ...m })),
  feedback: { liked: "", disliked: "", improve: "" },
  featureRequests: [],
};

const routePath = (globalThis as { __ROUTE_PATH__?: string }).__ROUTE_PATH__ || "/pov-scoping";
const base = routePath.replace(/\/pov-scoping\/?$/, "");
const DATA_URL = `${base}/pov-scoping-data`;
const SAVE_URL = `${base}/pov-scoping-save`;

const card = {
  background: "var(--card-bg)",
  border: "1px solid var(--border)",
  borderRadius: 10,
};

function Field({
  label,
  value,
  onChange,
  placeholder,
  multiline,
  rows = 3,
  type,
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  rows?: number;
  type?: string;
}) {
  const shared = {
    background: "var(--input-bg)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    color: "var(--text-primary)",
  };
  return (
    <label className="block">
      {label && (
        <span
          className="block mb-2 font-semibold"
          style={{ fontSize: 12, color: "var(--text-secondary)" }}
        >
          {label}
        </span>
      )}
      {multiline ? (
        <textarea
          className="w-full px-4 py-2 outline-none resize-y"
          style={shared}
          rows={rows}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          className="w-full px-4 py-2 outline-none"
          style={shared}
          type={type}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </label>
  );
}

function Select({
  label,
  value,
  options,
  onChange,
}: {
  label?: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      {label && (
        <span
          className="block mb-2 font-semibold"
          style={{ fontSize: 12, color: "var(--text-secondary)" }}
        >
          {label}
        </span>
      )}
      <select
        className="w-full px-4 py-2 outline-none"
        style={{
          background: "var(--input-bg)",
          border: "1px solid var(--border)",
          borderRadius: 8,
          color: "var(--text-primary)",
        }}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

function Button({
  children,
  onClick,
  variant = "primary",
}: {
  children: React.ReactNode;
  onClick: () => void;
  variant?: "primary" | "ghost";
}) {
  const [hover, setHover] = useState(false);
  const style =
    variant === "primary"
      ? {
          background: hover ? "var(--accent-hover)" : "var(--accent)",
          color: "#FFFFFF",
          border: "1px solid transparent",
        }
      : {
          background: hover ? "#F8F4F0" : "transparent",
          color: "var(--text-secondary)",
          border: "1px solid var(--border)",
        };
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="px-4 py-2 font-medium transition-colors"
      style={{ ...style, borderRadius: 9999, fontSize: 13 }}
    >
      {children}
    </button>
  );
}

function Section({
  title,
  hint,
  children,
  action,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section style={card} className="p-7">
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700 }}>{title}</h2>
          {hint && (
            <p className="mt-2" style={{ color: "var(--text-secondary)", maxWidth: "58ch" }}>
              {hint}
            </p>
          )}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function RowCard({
  children,
  onRemove,
  badge,
}: {
  children: React.ReactNode;
  onRemove: () => void;
  badge?: number;
}) {
  return (
    <div
      className="p-4"
      style={{ background: "#F8F4F0", border: "1px solid var(--border)", borderRadius: 10 }}
    >
      <div className="flex items-center justify-between -mt-1 -mr-1">
        {badge !== undefined ? (
          <div
            className="grid place-items-center"
            style={{
              width: 24,
              height: 24,
              borderRadius: 9999,
              background: "var(--accent)",
              color: "#FFFFFF",
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            {badge}
          </div>
        ) : (
          <span />
        )}
        <button
          onClick={onRemove}
          className="px-2"
          style={{ color: "var(--text-muted)", fontSize: 16, lineHeight: 1 }}
          title="Remove"
        >
          ×
        </button>
      </div>
      {children}
    </div>
  );
}

export default function App() {
  const [doc, setDoc] = useState<Doc | null>(null);
  const [status, setStatus] = useState("");
  const [tab, setTab] = useState<"scoping" | "metrics" | "requests">("scoping");
  const dirty = useRef(false);

  useEffect(() => {
    fetch(DATA_URL, { signal: AbortSignal.timeout(6000) })
      .then((r) => r.json())
      .then((d: Doc) => setDoc(d && d.initialized === false ? starter : { ...starter, ...d }))
      .catch(() => setDoc(starter));
  }, []);

  const save = useCallback(async (next: Doc) => {
    setStatus("Saving…");
    const res = await fetch(SAVE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next),
    });
    if (!res.ok) {
      setStatus("Save failed");
      return;
    }
    const { updatedAt } = await res.json();
    setStatus(`Saved ${new Date(updatedAt).toLocaleString()}`);
  }, []);

  useEffect(() => {
    if (!doc || !dirty.current) return;
    const t = setTimeout(() => save(doc), 900);
    return () => clearTimeout(t);
  }, [doc, save]);

  const update = (fn: (d: Doc) => Doc) => {
    dirty.current = true;
    setDoc((prev) => (prev ? fn(structuredClone(prev)) : prev));
  };

  if (!doc) {
    return (
      <>
        <title>3B POV scoping</title>
        <div className="min-h-screen grid place-items-center" style={{ color: "var(--text-muted)" }}>
          Loading…
        </div>
      </>
    );
  }

  const tabs = [
    { id: "scoping", label: "Scoping" },
    { id: "metrics", label: "Metrics & feedback" },
    { id: "requests", label: `Feature requests (${doc.featureRequests.length})` },
  ] as const;

  return (
    <>
      <title>3B POV scoping</title>
      <div className="min-h-screen" style={{ background: "var(--page-bg)" }}>
        <header
          className="px-7 py-7"
          style={{ borderBottom: "1px solid var(--border)", background: "var(--card-bg)" }}
        >
          <div className="mx-auto max-w-5xl">
            <div className="flex items-center gap-2" style={{ color: "var(--accent-deep)" }}>
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 9999,
                  background: "var(--accent)",
                  display: "inline-block",
                }}
              />
              <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.08em" }}>
                3B PROOF OF VALUE
              </span>
            </div>
            <h1 className="mt-4" style={{ fontSize: 34, fontWeight: 700 }}>
              3B POV Scoping
            </h1>
            <p className="mt-3" style={{ color: "var(--text-secondary)", maxWidth: "70ch" }}>
              {doc.summary}
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-4">
              {tabs.map((t) => {
                const active = tab === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    className="px-4 py-2 font-medium transition-colors"
                    style={{
                      borderRadius: 9999,
                      fontSize: 13,
                      background: active ? "var(--accent)" : "transparent",
                      color: active ? "#FFFFFF" : "var(--text-secondary)",
                      border: `1px solid ${active ? "transparent" : "var(--border)"}`,
                    }}
                  >
                    {t.label}
                  </button>
                );
              })}
              <span className="ml-auto" style={{ fontSize: 12, color: "var(--text-muted)" }}>
                {status || (doc.updatedAt ? `Saved ${new Date(doc.updatedAt).toLocaleString()}` : "Autosaves as you type")}
              </span>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-5xl px-7 py-10 flex flex-col gap-7">
          {tab === "scoping" && (
            <>
              <Section
                title="Builders and teams"
                action={
                  <Button onClick={() => update((d) => ({ ...d, builders: [...d.builders, emptyBuilder()] }))}>
                    Add builder
                  </Button>
                }
              >
                <div className="flex flex-col gap-4">
                  {doc.builders.map((b, i) => (
                    <RowCard
                      key={i}
                      onRemove={() => update((d) => ({ ...d, builders: d.builders.filter((_, j) => j !== i) }))}
                    >
                      <div className="grid gap-4 md:grid-cols-3">
                        <Field
                          label="Name"
                          value={b.name}
                          placeholder="Full name"
                          onChange={(v) => update((d) => ((d.builders[i].name = v), d))}
                        />
                        <Field
                          label="Team"
                          value={b.team}
                          placeholder="e.g. SecOps"
                          onChange={(v) => update((d) => ((d.builders[i].team = v), d))}
                        />
                        <Field
                          label="Email (optional, to invite upon tenant creation)"
                          value={b.email}
                          placeholder="name@company.com"
                          onChange={(v) => update((d) => ((d.builders[i].email = v), d))}
                        />
                      </div>
                    </RowCard>
                  ))}
                  {doc.builders.length === 0 && (
                    <p style={{ color: "var(--text-muted)" }}>No builders added yet.</p>
                  )}
                </div>
              </Section>

              <Section
                title="Tools and use cases"
                hint="One card per use case: what it does, which tools it touches, and who owns it."
                action={
                  <Button onClick={() => update((d) => ({ ...d, useCases: [...d.useCases, emptyUseCase()] }))}>
                    Add use case
                  </Button>
                }
              >
                <div className="flex flex-col gap-4">
                  {doc.useCases.map((u, i) => (
                    <RowCard
                      key={i}
                      onRemove={() => update((d) => ({ ...d, useCases: d.useCases.filter((_, j) => j !== i) }))}
                    >
                      <div className="grid gap-4 md:grid-cols-2">
                        <Field
                          label="Use case"
                          value={u.title}
                          placeholder="e.g. Auto-triage DSPM findings"
                          onChange={(v) => update((d) => ((d.useCases[i].title = v), d))}
                        />
                        <Field
                          label="Tools involved"
                          value={u.tools}
                          placeholder="Jira, Slack, Okta…"
                          onChange={(v) => update((d) => ((d.useCases[i].tools = v), d))}
                        />
                      </div>
                      <div className="mt-4">
                        <Field
                          label="What should happen"
                          value={u.description}
                          multiline
                          onChange={(v) => update((d) => ((d.useCases[i].description = v), d))}
                        />
                      </div>
                      <div className="mt-4 grid gap-4 md:grid-cols-3">
                        <Field
                          label="Owner"
                          value={u.owner}
                          onChange={(v) => update((d) => ((d.useCases[i].owner = v), d))}
                        />
                      </div>
                    </RowCard>
                  ))}
                </div>
              </Section>

              <Section
                title="Other metrics you're measuring"
                action={
                  <Button onClick={() => update((d) => ({ ...d, otherMetrics: [...d.otherMetrics, ""] }))}>
                    Add metric
                  </Button>
                }
              >
                <div className="flex flex-col gap-3">
                  {doc.otherMetrics.map((m, i) => (
                    <div key={i} className="grid gap-4 grid-cols-[1fr_32px] items-end">
                      <Field
                        value={m}
                        placeholder="e.g. Mean time to triage a DSPM finding"
                        onChange={(v) => update((d) => ((d.otherMetrics[i] = v), d))}
                      />
                      <button
                        onClick={() =>
                          update((d) => ({ ...d, otherMetrics: d.otherMetrics.filter((_, j) => j !== i) }))
                        }
                        className="pb-2"
                        style={{ color: "var(--text-muted)", fontSize: 16 }}
                        title="Remove"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  {doc.otherMetrics.length === 0 && (
                    <p style={{ color: "var(--text-muted)" }}>No other metrics yet.</p>
                  )}
                </div>
              </Section>

              <Section
                title="Timeline"
                hint="The standard 3B POV process — 2–3 weeks from set up. Adjust dates and details to fit this account."
                action={
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      onClick={() =>
                        update((d) => ({
                          ...d,
                          timeline: POV_PROCESS.map((m, i) => ({ ...m, note: d.timeline[i]?.note || "" })),
                        }))
                      }
                    >
                      Reset to standard process
                    </Button>
                    <Button onClick={() => update((d) => ({ ...d, timeline: [...d.timeline, emptyMilestone()] }))}>
                      Add milestone
                    </Button>
                  </div>
                }
              >
                {doc.timeline.length > 0 && (
                  <div className="overflow-x-auto pb-2 mb-7">
                    <div className="flex flex-col" style={{ minWidth: doc.timeline.length * 200 }}>
                    <div className="flex items-stretch">
                      {doc.timeline.map((m, i) => (
                        <div key={i} className="flex-1 px-3" style={{ minWidth: 200 }}>
                          <div className="flex items-end" style={{ height: 34 }}>
                            {m.phase && (
                              <span
                                style={{
                                  fontSize: 10,
                                  fontWeight: 700,
                                  lineHeight: 1.3,
                                  letterSpacing: "0.08em",
                                  textTransform: "uppercase",
                                  color: "var(--accent-deep)",
                                  display: "-webkit-box",
                                  WebkitBoxOrient: "vertical",
                                  WebkitLineClamp: 2,
                                  overflow: "hidden",
                                }}
                              >
                                {m.phase}
                              </span>
                            )}
                          </div>
                          <div className="relative flex items-center" style={{ height: 34 }}>
                            <div
                              style={{
                                position: "absolute",
                                left: 0,
                                right: 0,
                                height: 2,
                                background: "var(--border)",
                              }}
                            />
                            <div
                              className="relative grid place-items-center"
                              style={{
                                width: 30,
                                height: 30,
                                borderRadius: 9999,
                                background: "var(--accent)",
                                color: "#FFFFFF",
                                fontSize: 13,
                                fontWeight: 700,
                              }}
                            >
                              {i + 1}
                            </div>
                          </div>
                          <div className="mt-3" style={{ fontSize: 13, fontWeight: 700 }}>
                            {m.label || <span style={{ color: "var(--text-muted)" }}>Untitled</span>}
                          </div>
                          <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>
                            {m.date ? `(${formatDate(m.date)})` : "—"}
                          </div>
                          {m.details && (
                            <ul className="mt-3 flex flex-col gap-2">
                              {m.details
                                .split("\n")
                                .map((line) => line.trim())
                                .filter(Boolean)
                                .map((line, j) => (
                                  <li key={j} style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                                    {line}
                                  </li>
                                ))}
                            </ul>
                          )}
                        </div>
                      ))}
                    </div>
                    {doc.timeline.some((m) => (m.note || "").trim()) && (
                      <div className="flex items-stretch mt-5 pt-5" style={{ borderTop: "1px solid var(--divider)" }}>
                        {doc.timeline.map((m, i) => (
                          <div key={i} className="flex-1 px-3" style={{ minWidth: 200 }}>
                            <div
                              style={{
                                fontSize: 10,
                                fontWeight: 700,
                                letterSpacing: "0.08em",
                                textTransform: "uppercase",
                                color: "var(--accent-deep)",
                              }}
                            >
                              {i + 1} · Accomplished
                            </div>
                            <div
                              className="mt-2 whitespace-pre-line"
                              style={{
                                fontSize: 12,
                                color: (m.note || "").trim()
                                  ? "var(--text-secondary)"
                                  : "var(--text-muted)",
                              }}
                            >
                              {(m.note || "").trim() || "—"}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    </div>
                  </div>
                )}
                <div className="flex flex-col gap-4">
                  {doc.timeline.map((m, i) => (
                    <RowCard
                      key={i}
                      badge={i + 1}
                      onRemove={() => update((d) => ({ ...d, timeline: d.timeline.filter((_, j) => j !== i) }))}
                    >
                      <div className="grid gap-4 md:grid-cols-[170px_1fr_180px]">
                        <Field
                          label="Date"
                          type="date"
                          value={m.date}
                          onChange={(v) => update((d) => ((d.timeline[i].date = v), d))}
                        />
                        <Field
                          label="Milestone"
                          value={m.label}
                          placeholder="e.g. Cowork session 1"
                          onChange={(v) => update((d) => ((d.timeline[i].label = v), d))}
                        />
                        <Field
                          label="Phase (optional)"
                          value={m.phase || ""}
                          placeholder="e.g. Week 1"
                          onChange={(v) => update((d) => ((d.timeline[i].phase = v), d))}
                        />
                      </div>
                      <div className="mt-4">
                        <Field
                          label="Agenda / details (one per line)"
                          value={m.details || ""}
                          multiline
                          onChange={(v) => update((d) => ((d.timeline[i].details = v), d))}
                        />
                      </div>
                    </RowCard>
                  ))}
                </div>
              </Section>

              <Section
                title="What was accomplished"
                hint="A note per timeline step — what actually got done. Anything you write here shows up as its own row on the timeline above."
              >
                <div className="flex flex-col gap-4">
                  {doc.timeline.length === 0 && (
                    <p style={{ color: "var(--text-muted)" }}>Add a milestone above first.</p>
                  )}
                  {doc.timeline.map((m, i) => (
                    <div
                      key={i}
                      className="p-4 grid gap-4 md:grid-cols-[220px_1fr] md:items-start"
                      style={{ background: "#F8F4F0", border: "1px solid var(--border)", borderRadius: 10 }}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="grid place-items-center shrink-0"
                          style={{
                            width: 24,
                            height: 24,
                            borderRadius: 9999,
                            background: "var(--accent)",
                            color: "#FFFFFF",
                            fontSize: 12,
                            fontWeight: 700,
                          }}
                        >
                          {i + 1}
                        </div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700 }}>
                            {m.label || <span style={{ color: "var(--text-muted)" }}>Untitled</span>}
                          </div>
                          <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>
                            {m.date ? formatDate(m.date) : "—"}
                          </div>
                        </div>
                      </div>
                      <Field
                        value={m.note || ""}
                        multiline
                        rows={2}
                        placeholder="What was accomplished in this step?"
                        onChange={(v) => update((d) => ((d.timeline[i].note = v), d))}
                      />
                    </div>
                  ))}
                </div>
              </Section>
            </>
          )}

          {tab === "metrics" && (
            <>
              <Section title="Value delivered" hint="Filled in per use case as the POV progresses.">
                <div className="grid gap-4 md:grid-cols-3 mb-6">
                  {[
                    { label: "Use cases scoped", value: String(doc.useCases.length) },
                    { label: "Feature requests", value: String(doc.featureRequests.length) },
                    {
                      label: "Builders involved",
                      value: String(doc.builders.filter((b) => b.name.trim()).length),
                    },
                  ].map((m) => (
                    <div
                      key={m.label}
                      className="p-4"
                      style={{ background: "#F8F4F0", border: "1px solid var(--border)", borderRadius: 10 }}
                    >
                      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>
                        {m.label}
                      </div>
                      <div style={{ fontSize: 22, fontWeight: 700, marginTop: 8 }}>{m.value}</div>
                    </div>
                  ))}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full" style={{ borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ background: "#F8F4F0" }}>
                        {["Use case", "How long did it take to build?", "Feasibility", "Time saved"].map((h) => (
                          <th
                            key={h}
                            className="text-left px-4 py-2"
                            style={{
                              fontSize: 12,
                              fontWeight: 600,
                              color: "var(--text-secondary)",
                              borderBottom: "1px solid var(--border)",
                            }}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {doc.useCases.map((u, i) => (
                        <tr key={i} style={{ borderBottom: "1px solid var(--divider)" }}>
                          <td className="px-4 py-3" style={{ fontWeight: 500 }}>
                            {u.title || <span style={{ color: "var(--text-muted)" }}>Untitled use case</span>}
                          </td>
                          <td className="px-4 py-3">
                            <Field
                              value={u.buildTime}
                              placeholder="e.g. 2 hours"
                              onChange={(v) => update((d) => ((d.useCases[i].buildTime = v), d))}
                            />
                          </td>
                          <td className="px-4 py-3">
                            <Select
                              value={u.feasibility}
                              options={FEASIBILITY}
                              onChange={(v) => update((d) => ((d.useCases[i].feasibility = v), d))}
                            />
                          </td>
                          <td className="px-4 py-3">
                            <Field
                              value={u.timeSaved}
                              placeholder="e.g. 6 hrs/week"
                              onChange={(v) => update((d) => ((d.useCases[i].timeSaved = v), d))}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Section>

              <Section title="Product feedback" hint="Please add anything, any time.">
                <div className="grid gap-4 md:grid-cols-3">
                  <Field
                    label="What did we like?"
                    value={doc.feedback.liked}
                    multiline
                    rows={5}
                    onChange={(v) => update((d) => ((d.feedback.liked = v), d))}
                  />
                  <Field
                    label="What did we not like?"
                    value={doc.feedback.disliked}
                    multiline
                    rows={5}
                    onChange={(v) => update((d) => ((d.feedback.disliked = v), d))}
                  />
                  <Field
                    label="What could be improved?"
                    value={doc.feedback.improve}
                    multiline
                    rows={5}
                    onChange={(v) => update((d) => ((d.feedback.improve = v), d))}
                  />
                </div>
              </Section>
            </>
          )}

          {tab === "requests" && (
            <Section
              title="Feature requests"
              hint="Anything 3B doesn't do yet. Add it here and it goes back to the product team."
              action={
                <Button
                  onClick={() =>
                    update((d) => ({
                      ...d,
                      featureRequests: [
                        {
                          id: crypto.randomUUID(),
                          title: "",
                          details: "",
                          requestedBy: "",
                          impact: "Important",
                          status: "New",
                          created: new Date().toISOString(),
                        },
                        ...d.featureRequests,
                      ],
                    }))
                  }
                >
                  New request
                </Button>
              }
            >
              <div className="flex flex-col gap-4">
                {doc.featureRequests.length === 0 && (
                  <p style={{ color: "var(--text-muted)" }}>
                    No feature requests yet — add the first one.
                  </p>
                )}
                {doc.featureRequests.map((f, i) => (
                  <RowCard
                    key={f.id}
                    onRemove={() =>
                      update((d) => ({ ...d, featureRequests: d.featureRequests.filter((_, j) => j !== i) }))
                    }
                  >
                    <div className="grid gap-4 md:grid-cols-2">
                      <Field
                        label="Request"
                        value={f.title}
                        placeholder="Short title"
                        onChange={(v) => update((d) => ((d.featureRequests[i].title = v), d))}
                      />
                      <Field
                        label="Requested by"
                        value={f.requestedBy}
                        onChange={(v) => update((d) => ((d.featureRequests[i].requestedBy = v), d))}
                      />
                    </div>
                    <div className="mt-4">
                      <Field
                        label="Details"
                        value={f.details}
                        multiline
                        onChange={(v) => update((d) => ((d.featureRequests[i].details = v), d))}
                      />
                    </div>
                    <div className="mt-4 grid gap-4 md:grid-cols-3 items-end">
                      <Select
                        label="Impact"
                        value={f.impact}
                        options={IMPACT}
                        onChange={(v) => update((d) => ((d.featureRequests[i].impact = v), d))}
                      />
                      <Select
                        label="Status"
                        value={f.status}
                        options={FR_STATUS}
                        onChange={(v) => update((d) => ((d.featureRequests[i].status = v), d))}
                      />
                      <div style={{ fontSize: 12, color: "var(--text-muted)" }} className="pb-2">
                        Raised {new Date(f.created).toLocaleDateString()}
                      </div>
                    </div>
                  </RowCard>
                ))}
              </div>
            </Section>
          )}

          <footer style={{ fontSize: 12, color: "var(--text-muted)" }}>
            Changes autosave for everyone with access to this tenant.
          </footer>
        </main>
      </div>
    </>
  );
}
