import { useEffect, useMemo, useState } from "react";
import {
  CATEGORY_COLOR,
  PRIORITIES,
  agingBuckets,
  groupBy,
  prepare,
  summarize,
  weekly,
  type Dataset,
  type Row,
} from "./metrics";
import { hours, num, pct } from "./format";
import { AgingChart, AnalystTable, CategoryChart, FlowChart, Panel, SlaTrend } from "./charts";

const WINDOWS = [
  { label: "30 days", days: 30 },
  { label: "90 days", days: 90 },
  { label: "6 months", days: 180 },
];

const RESOLUTION_TARGET = 90;

type View = { days: number; analysts: string[]; categories: string[]; priorities: string[] };

function readUrl(): View {
  const q = new URLSearchParams(window.location.search);
  const days = Number(q.get("days"));
  const list = (k: string) => (q.get(k) ? q.get(k)!.split("|").filter(Boolean) : []);
  return {
    days: WINDOWS.some((w) => w.days === days) ? days : 90,
    analysts: list("analyst"),
    categories: list("category"),
    priorities: list("priority"),
  };
}

function writeUrl(v: View) {
  const q = new URLSearchParams();
  q.set("days", String(v.days));
  if (v.analysts.length) q.set("analyst", v.analysts.join("|"));
  if (v.categories.length) q.set("category", v.categories.join("|"));
  if (v.priorities.length) q.set("priority", v.priorities.join("|"));
  const branch = new URLSearchParams(window.location.search).get("branch");
  if (branch) q.set("branch", branch);
  window.history.replaceState(null, "", `${window.location.pathname}?${q}`);
}

function toggle(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

function Delta({ current, previous, invert = false, unit }: { current: number | null; previous: number | null; invert?: boolean; unit: "h" | "%" | "n" }) {
  if (current === null || previous === null || previous === 0) return <span className="text-[0.66rem] text-[#6d7883]">no prior period</span>;
  const diff = current - previous;
  const relative = (diff / Math.abs(previous)) * 100;
  if (Math.abs(relative) < 1) return <span className="text-[0.66rem] text-[#6d7883]">flat vs prior period</span>;
  const good = invert ? diff < 0 : diff > 0;
  const shown = unit === "%" ? `${diff > 0 ? "+" : ""}${diff.toFixed(1)}pp` : `${diff > 0 ? "+" : ""}${relative.toFixed(0)}%`;
  return (
    <span className="font-mono text-[0.66rem] tabular-nums" style={{ color: good ? "#4cc9c0" : "#f2994a" }}>
      {shown} vs prior
    </span>
  );
}

function Kpi({
  label,
  value,
  sub,
  accent = "#f0ebe2",
  delta,
}: {
  label: string;
  value: string;
  sub?: React.ReactNode;
  accent?: string;
  delta?: React.ReactNode;
}) {
  return (
    <div className="border-l border-white/10 pl-4 first:border-l-0 first:pl-0">
      <p className="text-[0.6rem] tracking-[0.16em] text-[#6d7883] uppercase select-none">{label}</p>
      <p className="mt-1.5 font-mono text-[1.65rem] leading-none tabular-nums" style={{ color: accent }}>
        {value}
      </p>
      <div className="mt-1.5 space-y-0.5">
        {delta}
        {sub && <p className="text-[0.66rem] text-[#7d8994]">{sub}</p>}
      </div>
    </div>
  );
}

export default function App() {
  const [data, setData] = useState<Dataset | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<View>(() => readUrl());

  useEffect(() => {
    const branch = new URLSearchParams(window.location.search).get("branch");
    fetch(`/infosec-queue-data${branch ? `?branch=${encodeURIComponent(branch)}` : ""}`, { headers: { Accept: "application/json" } })
      .then((r) => {
        if (!r.ok) throw new Error(`data request failed (${r.status})`);
        return r.json();
      })
      .then(setData)
      .catch((e: Error) => setError(e.message));
  }, []);

  useEffect(() => {
    writeUrl(view);
  }, [view]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setView((v) => ({ ...v, analysts: [], categories: [], priorities: [] }));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const model = useMemo(() => {
    if (!data) return null;
    const now = Date.parse(data.generated_at);
    const rows = prepare(data, now);
    const from = now - view.days * 864e5;
    const prevFrom = from - view.days * 864e5;

    const matchesFacets = (r: Row) =>
      (view.analysts.length === 0 || view.analysts.includes(r.assigned_to)) &&
      (view.categories.length === 0 || view.categories.includes(r.category)) &&
      (view.priorities.length === 0 || view.priorities.includes(r.priority));

    const inWindow = rows.filter((r) => r.opened >= from && matchesFacets(r));
    const priorWindow = rows.filter((r) => r.opened >= prevFrom && r.opened < from && matchesFacets(r));

    // The week in progress is incomplete by definition — showing it makes intake look like it collapsed.
    const weeks = weekly(inWindow, from, now).filter((w) => w.start + 7 * 864e5 <= now);

    return {
      weeks,
      now,
      from,
      rows,
      inWindow,
      summary: summarize(inWindow, view.days),
      prior: summarize(priorWindow, view.days),
      analysts: groupBy(inWindow, (r) => r.assigned_to),
      categories: groupBy(inWindow, (r) => r.category),
      aging: agingBuckets(rows.filter(matchesFacets)),
      services: groupBy(inWindow, (r) => r.business_service),
      tiers: Object.fromEntries(data.analysts.map((a) => [a.name, a.tier])),
    };
  }, [data, view]);

  const caveats: string[] = [];
  if (data) caveats.push(data.source);
  if (model && model.summary.opened === 0) caveats.push("No tickets match the current filters.");
  if (model && model.weeks.length > 0) caveats.push("Weekly trends exclude the week in progress");

  const filterChips = [
    ...view.analysts.map((v) => ({ label: v, clear: () => setView((s) => ({ ...s, analysts: toggle(s.analysts, v) })) })),
    ...view.categories.map((v) => ({ label: v, clear: () => setView((s) => ({ ...s, categories: toggle(s.categories, v) })) })),
    ...view.priorities.map((v) => ({ label: v, clear: () => setView((s) => ({ ...s, priorities: toggle(s.priorities, v) })) })),
  ];

  return (
    <div className="min-h-screen bg-[#0b1116] text-[#e7e2d8] antialiased [font-family:'IBM_Plex_Sans',sans-serif]">
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.5]"
        style={{
          background:
            "radial-gradient(80rem 40rem at 15% -10%, rgba(76,201,192,0.10), transparent 60%), radial-gradient(60rem 30rem at 90% 0%, rgba(224,182,74,0.08), transparent 60%)",
        }}
      />
      <div className="relative mx-auto max-w-[84rem] px-6 py-8 lg:px-10">
        <header className="flex flex-wrap items-end justify-between gap-6 border-b border-white/10 pb-6">
          <div>
            <p className="font-mono text-[0.62rem] tracking-[0.3em] text-[#e0b64a] uppercase select-none">
              ServiceNow · assignment group “{data?.assignment_group ?? "InfoSec"}”
            </p>
            <h1 className="mt-2 font-[Instrument_Serif] text-[2.6rem] leading-[0.95] text-[#f7f3ea]">
              InfoSec queue performance
            </h1>
            <p className="mt-2 max-w-xl text-[0.8rem] text-[#8d99a4]">
              Executive view of throughput, responsiveness, SLA attainment and backlog risk for the security operations queue.
            </p>
          </div>
          <div className="text-right">
            <div className="flex gap-1 rounded-sm border border-white/10 p-1">
              {WINDOWS.map((w) => (
                <button
                  key={w.days}
                  onClick={() => setView((v) => ({ ...v, days: w.days }))}
                  className={`cursor-pointer px-3 py-1.5 text-[0.72rem] transition-colors select-none ${
                    view.days === w.days ? "bg-[#e0b64a] text-[#0b1116]" : "text-[#98a3ad] hover:text-[#e7e2d8]"
                  }`}
                >
                  {w.label}
                </button>
              ))}
            </div>
            <p className="mt-2 font-mono text-[0.64rem] text-[#6d7883]">
              {data ? `data as of ${new Date(data.generated_at).toLocaleString("en-US", { timeZone: "UTC" })} UTC` : "loading…"}
            </p>
          </div>
        </header>

        {caveats.length > 0 && (
          <div className="mt-5 border-l-2 border-[#e0b64a]/70 bg-[#e0b64a]/8 px-4 py-2.5 text-[0.72rem] text-[#d8c9a3]">
            {caveats.join(" · ")}
          </div>
        )}

        {(filterChips.length > 0 || null) && (
          <div className="mt-5 flex flex-wrap items-center gap-2 text-[0.7rem]">
            <span className="text-[#6d7883] select-none">Filtered to</span>
            {filterChips.map((c) => (
              <button
                key={c.label}
                onClick={c.clear}
                className="cursor-pointer border border-white/15 px-2 py-1 text-[#e7e2d8] transition-colors hover:border-[#f2545b] hover:text-[#f2545b]"
              >
                {c.label} ✕
              </button>
            ))}
            <button
              onClick={() => setView((v) => ({ ...v, analysts: [], categories: [], priorities: [] }))}
              className="cursor-pointer font-mono text-[0.66rem] text-[#7d8994] underline decoration-dotted"
            >
              clear all (esc)
            </button>
          </div>
        )}

        {error && <p className="mt-10 text-[0.85rem] text-[#f2545b]">Could not load queue data: {error}</p>}
        {!model && !error && <p className="mt-10 text-[0.85rem] text-[#7d8994]">Loading queue data…</p>}

        {model && (
          <main className="mt-6 space-y-5">
            <div className="grid grid-cols-2 gap-y-6 rounded-sm border border-white/8 bg-[#111820]/80 p-5 md:grid-cols-3 lg:grid-cols-6">
              <Kpi
                label="Resolution SLA"
                value={pct(model.summary.resolutionSla, 1)}
                accent={
                  (model.summary.resolutionSla ?? 0) >= RESOLUTION_TARGET
                    ? "#4cc9c0"
                    : (model.summary.resolutionSla ?? 0) >= 75
                      ? "#e0b64a"
                      : "#f2545b"
                }
                delta={<Delta current={model.summary.resolutionSla} previous={model.prior.resolutionSla} unit="%" />}
                sub={`target ${RESOLUTION_TARGET}%`}
              />
              <Kpi
                label="Median time to resolve"
                value={hours(model.summary.mttr)}
                delta={<Delta current={model.summary.mttr} previous={model.prior.mttr} unit="h" invert />}
                sub={`p90 ${hours(model.summary.p90ttr)}`}
              />
              <Kpi
                label="Median time to first touch"
                value={hours(model.summary.mtta)}
                delta={<Delta current={model.summary.mtta} previous={model.prior.mtta} unit="h" invert />}
                sub={`response SLA ${pct(model.summary.responseSla, 1)}`}
              />
              <Kpi
                label="Tickets opened"
                value={num(model.summary.opened)}
                delta={<Delta current={model.summary.opened} previous={model.prior.opened} unit="n" />}
                sub={`${num(model.summary.throughput, 1)} resolved / day`}
              />
              <Kpi
                label="Open backlog"
                value={num(model.summary.backlog)}
                accent={model.summary.aged > 0 ? "#f2994a" : "#f0ebe2"}
                delta={<Delta current={model.summary.backlog} previous={model.prior.backlog} unit="n" invert />}
                sub={`${num(model.summary.aged)} aged > 14d · oldest ${num(model.summary.oldestOpenDays, 0)}d`}
              />
              <Kpi
                label="Quality"
                value={pct(model.summary.reopenRate, 1)}
                accent={(model.summary.reopenRate ?? 0) > 6 ? "#f2994a" : "#f0ebe2"}
                delta={<Delta current={model.summary.reopenRate} previous={model.prior.reopenRate} unit="%" invert />}
                sub={`reopened · ${pct(model.summary.touchRate, 0)} reassigned · ${num(model.summary.majorIncidents)} major`}
              />
            </div>

            <Panel title="Demand vs. capacity" hint="Weekly intake, resolution and the backlog it leaves behind">
              <FlowChart
                weeks={model.weeks}
                activePriorities={view.priorities}
                onPriorityToggle={(p) => setView((v) => ({ ...v, priorities: toggle(v.priorities, p) }))}
              />
            </Panel>

            <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
              <Panel title="SLA attainment trend" hint="Share of tickets meeting their ServiceNow priority target, by week opened">
                <SlaTrend weeks={model.weeks} target={RESOLUTION_TARGET} />
              </Panel>
              <Panel title="Backlog aging" hint="Current open tickets matching the active filters">
                <AgingChart buckets={model.aging} />
              </Panel>
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              <Panel title="Work type" hint="Where the queue’s time actually goes">
                <CategoryChart
                  stats={model.categories}
                  selected={view.categories}
                  onSelect={(k) => setView((v) => ({ ...v, categories: toggle(v.categories, k) }))}
                  colors={CATEGORY_COLOR}
                />
              </Panel>
              <Panel title="Business service exposure" hint="Median resolution time by the service the ticket affects">
                <CategoryChart
                  stats={model.services}
                  selected={[]}
                  onSelect={() => {}}
                  colors={{}}
                  interactive={false}
                  note="Median time to resolve, with ticket volume per service."
                />
              </Panel>
            </div>

            <Panel title="Analyst scorecard" hint="Load, responsiveness and quality per assignee — click a row to scope the board">
              <AnalystTable
                stats={model.analysts}
                selected={view.analysts}
                onSelect={(k) => setView((v) => ({ ...v, analysts: toggle(v.analysts, k) }))}
                tiers={model.tiers}
              />
            </Panel>

            <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-5 pb-2 text-[0.68rem] text-[#6d7883]">
              <span>
                {num(model.inWindow.length)} tickets in window · priorities {PRIORITIES.length} · SLA targets read from each ticket’s priority
              </span>
              <span className="font-mono">every view is shareable — the URL carries the filters</span>
            </footer>
          </main>
        )}
      </div>
    </div>
  );
}
