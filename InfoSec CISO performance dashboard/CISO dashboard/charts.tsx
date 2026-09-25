import { useState } from "react";
import type { GroupStat, WeekBucket } from "./metrics";
import { PRIORITIES, PRIORITY_COLOR } from "./metrics";
import { hours, niceTicks, num, pct } from "./format";

export function Panel({
  title,
  hint,
  right,
  children,
  className = "",
}: {
  title: string;
  hint?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`relative rounded-sm border border-white/8 bg-[#111820]/80 p-5 ${className}`}>
      <div className="mb-4 flex items-baseline justify-between gap-4">
        <div>
          <h2 className="font-[Instrument_Serif] text-[1.35rem] leading-none text-[#f4efe6]">{title}</h2>
          {hint && <p className="mt-1.5 text-[0.7rem] tracking-wide text-[#7d8994] select-none">{hint}</p>}
        </div>
        {right}
      </div>
      {children}
    </section>
  );
}

const AXIS = "#6d7883";

function Tooltip({ x, y, lines, width }: { x: number; y: number; lines: string[]; width: number }) {
  const w = 150;
  const left = Math.min(Math.max(x - w / 2, 0), Math.max(width - w, 0));
  return (
    <foreignObject x={left} y={Math.max(y - 18 - lines.length * 16, 0)} width={w} height={lines.length * 16 + 14}>
      <div className="rounded-sm border border-white/15 bg-[#0b1116]/95 px-2 py-1 font-mono text-[0.65rem] leading-4 text-[#e7e2d8] shadow-lg">
        {lines.map((l, i) => (
          <div key={i} className={i === 0 ? "text-[#e0b64a]" : ""}>
            {l}
          </div>
        ))}
      </div>
    </foreignObject>
  );
}

export function FlowChart({
  weeks,
  activePriorities,
  onPriorityToggle,
}: {
  weeks: WeekBucket[];
  activePriorities: string[];
  onPriorityToggle: (p: string) => void;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 760;
  const H = 260;
  const pad = { l: 38, r: 40, t: 12, b: 26 };
  const iw = W - pad.l - pad.r;
  const ih = H - pad.t - pad.b;

  let running = 0;
  const backlog = weeks.map((w) => (running += w.opened - w.resolved));
  const maxBar = Math.max(1, ...weeks.map((w) => Math.max(w.opened, w.resolved)));
  const barTicks = niceTicks(maxBar);
  const barMax = barTicks[barTicks.length - 1];
  const maxBacklog = Math.max(1, ...backlog);
  const bw = iw / Math.max(weeks.length, 1);

  const y = (v: number) => pad.t + ih - (v / barMax) * ih;
  const yb = (v: number) => pad.t + ih - (Math.max(v, 0) / maxBacklog) * ih;
  const line = backlog.map((v, i) => `${i === 0 ? "M" : "L"}${pad.l + bw * (i + 0.5)},${yb(v)}`).join(" ");

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[0.68rem] select-none">
        {PRIORITIES.map((p) => {
          const on = activePriorities.length === 0 || activePriorities.includes(p);
          const total = weeks.reduce((a, w) => a + w.byPriority[p], 0);
          return (
            <button
              key={p}
              onClick={() => onPriorityToggle(p)}
              className={`flex cursor-pointer items-center gap-1.5 transition-opacity ${on ? "opacity-100" : "opacity-35"}`}
            >
              <span className="h-2 w-2 rounded-full" style={{ background: PRIORITY_COLOR[p] }} />
              <span className="text-[#b6bec6]">{p.replace(/^\d - /, "")}</span>
              <span className="font-mono text-[#7d8994] tabular-nums">{num(total)}</span>
            </button>
          );
        })}
        <span className="ml-auto flex items-center gap-1.5 text-[#7d8994]">
          <span className="h-px w-5 bg-[#e0b64a]" /> open backlog
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Weekly incidents opened versus resolved with open backlog">
        {barTicks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="#ffffff" strokeOpacity={t === 0 ? 0.18 : 0.06} />
            <text x={pad.l - 8} y={y(t) + 3.5} textAnchor="end" fill={AXIS} fontSize="9" className="font-mono select-none">
              {num(t)}
            </text>
          </g>
        ))}
        {weeks.map((w, i) => {
          const x = pad.l + bw * i;
          let stackY = y(0);
          const isHover = hover === i;
          return (
            <g key={w.key} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} style={{ opacity: hover === null || isHover ? 1 : 0.55 }}>
              <rect x={x} y={pad.t} width={bw} height={ih} fill="transparent" />
              {PRIORITIES.map((p) => {
                const v = w.byPriority[p];
                const h = (v / barMax) * ih;
                stackY -= h;
                return (
                  <rect
                    key={p}
                    x={x + bw * 0.14}
                    y={stackY}
                    width={bw * 0.44}
                    height={Math.max(h, 0)}
                    fill={PRIORITY_COLOR[p]}
                    fillOpacity={0.9}
                    className="transition-all duration-500"
                  />
                );
              })}
              <rect
                x={x + bw * 0.6}
                y={y(w.resolved)}
                width={bw * 0.26}
                height={Math.max(pad.t + ih - y(w.resolved), 0)}
                fill="#2f4a5a"
                className="transition-all duration-500"
              />
              {i % 3 === 0 && (
                <text x={x + bw / 2} y={H - 8} textAnchor="middle" fill={AXIS} fontSize="9" className="font-mono select-none">
                  {w.label}
                </text>
              )}
            </g>
          );
        })}
        <path d={line} fill="none" stroke="#e0b64a" strokeWidth="1.6" className="transition-all duration-500" />
        {hover !== null && weeks[hover] && (
          <Tooltip
            x={pad.l + bw * (hover + 0.5)}
            y={y(Math.max(weeks[hover].opened, weeks[hover].resolved))}
            width={W}
            lines={[
              `week of ${weeks[hover].label}`,
              `opened    ${num(weeks[hover].opened)}`,
              `resolved  ${num(weeks[hover].resolved)}`,
              `backlog   ${num(backlog[hover])}`,
              `MTTR      ${hours(weeks[hover].mttr)}`,
            ]}
          />
        )}
      </svg>
      <p className="mt-1 text-[0.66rem] text-[#7d8994] select-none">
        Left bars: opened, stacked by priority. Right bars: resolved. Line: cumulative open backlog.
      </p>
    </div>
  );
}

export function SlaTrend({ weeks, target }: { weeks: WeekBucket[]; target: number }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 760;
  const H = 200;
  const pad = { l: 38, r: 12, t: 12, b: 26 };
  const iw = W - pad.l - pad.r;
  const ih = H - pad.t - pad.b;
  const x = (i: number) => pad.l + (iw * i) / Math.max(weeks.length - 1, 1);
  const y = (v: number) => pad.t + ih - (v / 100) * ih;

  const series = [
    { key: "resolutionSla", label: "Resolution SLA met", color: "#4cc9c0" },
    { key: "responseSla", label: "Response SLA met", color: "#7aa2f7" },
  ] as const;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-4 text-[0.68rem] select-none">
        {series.map((s) => (
          <span key={s.key} className="flex items-center gap-1.5 text-[#b6bec6]">
            <span className="h-px w-5" style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
        <span className="flex items-center gap-1.5 text-[#7d8994]">
          <span className="h-px w-5 border-t border-dashed border-[#f2545b]" /> target {target}%
        </span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
        aria-label="Weekly SLA attainment trend"
        onMouseLeave={() => setHover(null)}
      >
        {[0, 25, 50, 75, 100].map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="#ffffff" strokeOpacity={t === 0 ? 0.18 : 0.06} />
            <text x={pad.l - 8} y={y(t) + 3.5} textAnchor="end" fill={AXIS} fontSize="9" className="font-mono select-none">
              {t}
            </text>
          </g>
        ))}
        <line x1={pad.l} x2={W - pad.r} y1={y(target)} y2={y(target)} stroke="#f2545b" strokeDasharray="4 4" strokeOpacity={0.7} />
        {series.map((s) => {
          const pts = weeks.map((w, i) => ({ i, v: w[s.key] })).filter((p) => p.v !== null) as { i: number; v: number }[];
          const d = pts.map((p, k) => `${k === 0 ? "M" : "L"}${x(p.i)},${y(p.v)}`).join(" ");
          return <path key={s.key} d={d} fill="none" stroke={s.color} strokeWidth="1.8" className="transition-all duration-500" />;
        })}
        {weeks.map((w, i) => (
          <rect
            key={w.key}
            x={x(i) - iw / weeks.length / 2}
            y={pad.t}
            width={iw / weeks.length}
            height={ih}
            fill="transparent"
            onMouseEnter={() => setHover(i)}
          />
        ))}
        {hover !== null && (
          <>
            <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={pad.t + ih} stroke="#ffffff" strokeOpacity={0.2} />
            <Tooltip
              x={x(hover)}
              y={pad.t + 40}
              width={W}
              lines={[
                `week of ${weeks[hover].label}`,
                `resolution ${pct(weeks[hover].resolutionSla)}`,
                `response   ${pct(weeks[hover].responseSla)}`,
              ]}
            />
          </>
        )}
        {weeks.map((w, i) =>
          i % 3 === 0 ? (
            <text key={`l${w.key}`} x={x(i)} y={H - 8} textAnchor="middle" fill={AXIS} fontSize="9" className="font-mono select-none">
              {w.label}
            </text>
          ) : null,
        )}
      </svg>
    </div>
  );
}

export function AgingChart({ buckets }: { buckets: { label: string; count: number; critical: number }[] }) {
  const max = Math.max(1, ...buckets.map((b) => b.count));
  return (
    <div className="space-y-2.5">
      {buckets.map((b) => (
        <div key={b.label} className="flex items-center gap-3">
          <span className="w-12 shrink-0 font-mono text-[0.68rem] text-[#7d8994] select-none">{b.label}</span>
          <div className="relative h-5 flex-1 bg-white/4">
            <div
              className="absolute inset-y-0 left-0 bg-[#2f4a5a] transition-all duration-500"
              style={{ width: `${(b.count / max) * 100}%` }}
            />
            <div
              className="absolute inset-y-0 left-0 bg-[#f2545b]/80 transition-all duration-500"
              style={{ width: `${(b.critical / max) * 100}%` }}
            />
          </div>
          <span className="w-8 shrink-0 text-right font-mono text-[0.7rem] text-[#e7e2d8] tabular-nums">{num(b.count)}</span>
        </div>
      ))}
      <p className="pt-1 text-[0.66rem] text-[#7d8994] select-none">
        Open tickets by age. Red segment is P1/P2 — those are the ones that end up in a board slide.
      </p>
    </div>
  );
}

export function CategoryChart({
  stats,
  selected,
  onSelect,
  colors,
  note = "Median time to resolve. Click a category to filter the whole board.",
  interactive = true,
}: {
  stats: GroupStat[];
  selected: string[];
  onSelect: (key: string) => void;
  colors: Record<string, string>;
  note?: string;
  interactive?: boolean;
}) {
  const max = Math.max(1, ...stats.map((s) => s.mttr ?? 0));
  return (
    <div className="space-y-2">
      {stats.map((s) => {
        const dim = selected.length > 0 && !selected.includes(s.key);
        return (
          <button
            key={s.key}
            onClick={() => interactive && onSelect(s.key)}
            className={`flex w-full items-center gap-3 text-left transition-opacity ${interactive ? "cursor-pointer" : "cursor-default"} ${dim ? "opacity-35" : "opacity-100"}`}
          >
            <span className="w-40 shrink-0 truncate text-[0.72rem] text-[#c8cfd6] select-none">{s.key}</span>
            <span className="relative h-4 flex-1 bg-white/4">
              <span
                className="absolute inset-y-0 left-0 transition-all duration-500"
                style={{ width: `${((s.mttr ?? 0) / max) * 100}%`, background: colors[s.key] ?? "#4cc9c0" }}
              />
            </span>
            <span className="w-11 shrink-0 text-right font-mono text-[0.7rem] text-[#e7e2d8] tabular-nums">{hours(s.mttr)}</span>
            <span className="w-14 shrink-0 text-right font-mono text-[0.68rem] text-[#7d8994] tabular-nums">{num(s.opened)} tix</span>
          </button>
        );
      })}
      <p className="pt-1 text-[0.66rem] text-[#7d8994] select-none">{note}</p>
    </div>
  );
}

export function AnalystTable({
  stats,
  selected,
  onSelect,
  tiers,
}: {
  stats: GroupStat[];
  selected: string[];
  onSelect: (key: string) => void;
  tiers: Record<string, string>;
}) {
  const maxLoad = Math.max(1, ...stats.map((s) => s.opened));
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[0.74rem]">
        <thead>
          <tr className="text-left text-[0.62rem] tracking-[0.14em] text-[#6d7883] uppercase select-none">
            <th className="pb-2 font-normal">Analyst</th>
            <th className="pb-2 font-normal">Assigned</th>
            <th className="pb-2 text-right font-normal">P1/P2</th>
            <th className="pb-2 text-right font-normal">MTTA</th>
            <th className="pb-2 text-right font-normal">MTTR</th>
            <th className="pb-2 text-right font-normal">Resp. SLA</th>
            <th className="pb-2 text-right font-normal">Res. SLA</th>
            <th className="pb-2 text-right font-normal">Reopen</th>
            <th className="pb-2 text-right font-normal">Open</th>
            <th className="pb-2 text-right font-normal">Aged</th>
          </tr>
        </thead>
        <tbody>
          {stats.map((s) => {
            const dim = selected.length > 0 && !selected.includes(s.key);
            const slaColor =
              s.resolutionSla === null ? "#7d8994" : s.resolutionSla >= 90 ? "#4cc9c0" : s.resolutionSla >= 75 ? "#e0b64a" : "#f2545b";
            return (
              <tr
                key={s.key}
                onClick={() => onSelect(s.key)}
                className={`cursor-pointer border-t border-white/6 transition-colors hover:bg-white/4 ${dim ? "opacity-40" : ""}`}
              >
                <td className="py-2 pr-3 whitespace-nowrap">
                  <span className="text-[#f0ebe2]">{s.key}</span>
                  <span className="ml-2 font-mono text-[0.6rem] text-[#6d7883]">{tiers[s.key] ?? ""}</span>
                </td>
                <td className="py-2 pr-3 w-28">
                  <span className="flex items-center gap-2">
                    <span className="relative h-1.5 w-16 bg-white/6">
                      <span className="absolute inset-y-0 left-0 bg-[#7aa2f7] transition-all duration-500" style={{ width: `${(s.opened / maxLoad) * 100}%` }} />
                    </span>
                    <span className="font-mono text-[#b6bec6] tabular-nums">{num(s.opened)}</span>
                  </span>
                </td>
                <td className="py-2 text-right font-mono text-[#b6bec6] tabular-nums">{num(s.critical)}</td>
                <td className="py-2 text-right font-mono text-[#b6bec6] tabular-nums">{hours(s.mtta)}</td>
                <td className="py-2 text-right font-mono text-[#b6bec6] tabular-nums">{hours(s.mttr)}</td>
                <td className="py-2 text-right font-mono tabular-nums text-[#b6bec6]">{pct(s.responseSla)}</td>
                <td className="py-2 text-right font-mono tabular-nums" style={{ color: slaColor }}>
                  {pct(s.resolutionSla)}
                </td>
                <td className="py-2 text-right font-mono text-[#b6bec6] tabular-nums">{pct(s.reopenRate, 1)}</td>
                <td className="py-2 text-right font-mono text-[#b6bec6] tabular-nums">{num(s.backlog)}</td>
                <td className="py-2 text-right font-mono tabular-nums" style={{ color: s.aged > 0 ? "#f2994a" : "#6d7883" }}>
                  {num(s.aged)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="mt-3 text-[0.66rem] text-[#7d8994] select-none">
        Click a row to scope the board to that analyst. Aged = open more than 14 days.
      </p>
    </div>
  );
}
