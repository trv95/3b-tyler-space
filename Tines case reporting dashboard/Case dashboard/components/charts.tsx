import { useState } from "react";
import { Tooltip } from "./ui";
import { PRIORITY_COLORS } from "../lib/types";
import type { Bucket } from "../lib/aggregate";
import { num, pct, duration } from "../lib/format";

function niceTicks(max: number, count = 4): number[] {
  if (max <= 0) return [0];
  const raw = max / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? mag * 10;
  const ticks: number[] = [];
  for (let t = 0; t <= max + step / 2; t += step) ticks.push(t);
  return ticks;
}

export function StackedTimeSeries({
  buckets,
  series,
  onSelectBucket,
  selectedBucket,
  partialLastBucket,
}: {
  buckets: Bucket[];
  series: string[];
  onSelectBucket: (key: string | null) => void;
  selectedBucket: string | null;
  partialLastBucket: boolean;
}) {
  const [hover, setHover] = useState<{ i: number; x: number; y: number } | null>(null);

  const W = 1000;
  const H = 260;
  const padL = 44;
  const padR = 12;
  const padT = 12;
  const padB = 28;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const max = Math.max(1, ...buckets.map((b) => b.total));
  const ticks = niceTicks(max);
  const top = ticks[ticks.length - 1] || 1;
  const bw = buckets.length ? plotW / buckets.length : plotW;
  const barW = Math.max(2, Math.min(28, bw * 0.72));
  const yOf = (v: number) => padT + plotH - (v / top) * plotH;
  const labelEvery = Math.max(1, Math.ceil(buckets.length / 14));

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 260 }} role="img"
        aria-label="Case volume over time, stacked by priority">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={padL} x2={W - padR} y1={yOf(t)} y2={yOf(t)} stroke="var(--chart-grid)" strokeWidth="1" />
            <text x={padL - 8} y={yOf(t) + 3.5} textAnchor="end" fontSize="10" fill="var(--axis)" className="chrome tnum">
              {num(t)}
            </text>
          </g>
        ))}

        {buckets.map((b, i) => {
          const cx = padL + i * bw + bw / 2;
          const dim = selectedBucket !== null && selectedBucket !== b.key;
          const isPartial = partialLastBucket && i === buckets.length - 1;
          let acc = 0;
          return (
            <g
              key={b.key}
              className="cursor-pointer"
              onMouseEnter={() => setHover({ i, x: (cx / W) * 100, y: yOf(b.total) })}
              onMouseLeave={() => setHover(null)}
              onClick={() => onSelectBucket(selectedBucket === b.key ? null : b.key)}
              tabIndex={0}
              role="button"
              aria-label={`${b.label}: ${b.total} cases`}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelectBucket(selectedBucket === b.key ? null : b.key);
                }
              }}
            >
              <rect x={cx - bw / 2} y={padT} width={bw} height={plotH} fill="transparent" />
              {series.map((s) => {
                const v = b.parts[s] ?? 0;
                const h = (v / top) * plotH;
                const y = padT + plotH - acc - h;
                acc += h;
                return (
                  <rect
                    key={s}
                    x={cx - barW / 2}
                    y={y}
                    width={barW}
                    height={Math.max(0, h)}
                    fill={PRIORITY_COLORS[s] ?? "#8D75E6"}
                    opacity={dim ? 0.22 : isPartial ? 0.62 : 1}
                    style={{ transition: "y 320ms ease, height 320ms ease, opacity 200ms ease" }}
                  />
                );
              })}
              {i % labelEvery === 0 && (
                <text x={cx} y={H - 8} textAnchor="middle" fontSize="10" fill="var(--axis)" className="chrome">
                  {b.label}
                </text>
              )}
            </g>
          );
        })}
        <line x1={padL} x2={W - padR} y1={padT + plotH} y2={padT + plotH} stroke="var(--border)" strokeWidth="1" />
      </svg>

      {hover && buckets[hover.i] && (
        <div className="absolute inset-0 pointer-events-none">
          <div style={{ position: "absolute", left: `${hover.x}%`, top: (hover.y / H) * 260 - 6 }}>
            <Tooltip x={0} y={0}>
              <div className="font-semibold">{buckets[hover.i].label}</div>
              <div className="tnum mb-1" style={{ color: "var(--text-secondary)" }}>
                {num(buckets[hover.i].total)} cases opened
              </div>
              {Object.entries(buckets[hover.i].parts)
                .sort((a, b) => b[1] - a[1])
                .map(([k, v]) => (
                  <div key={k} className="flex items-center gap-1.5">
                    <span
                      className="inline-block h-2 w-2 rounded-full"
                      style={{ background: PRIORITY_COLORS[k] ?? "#8D75E6" }}
                    />
                    <span className="flex-1">{k}</span>
                    <span className="tnum font-semibold">{v}</span>
                  </div>
                ))}
            </Tooltip>
          </div>
        </div>
      )}
    </div>
  );
}

export function StackedBars({
  rows,
  series,
  total,
  selected,
  onSelect,
  showShare,
  emptyLabel = "No data in this view",
}: {
  rows: { key: string; total: number; parts: Record<string, number> }[];
  series: string[];
  total: number;
  selected: string[];
  onSelect: (key: string) => void;
  showShare: boolean;
  emptyLabel?: string;
}) {
  const max = Math.max(1, ...rows.map((r) => r.total));
  if (rows.length === 0) {
    return (
      <p className="py-6 text-center text-[12px]" style={{ color: "var(--text-muted)" }}>
        {emptyLabel}
      </p>
    );
  }
  return (
    <ul className="flex flex-col gap-1.5">
      {rows.map((r) => {
        const dimmed = selected.length > 0 && !selected.includes(r.key);
        return (
          <li key={r.key}>
            <button
              type="button"
              onClick={() => onSelect(r.key)}
              className="group flex w-full cursor-pointer items-center gap-3 rounded-[6px] px-1 py-0.5 text-left"
              style={{ opacity: dimmed ? 0.4 : 1, transition: "opacity 200ms ease" }}
              title={`${r.key} — ${num(r.total)} cases`}
            >
              <span
                className="chrome w-[38%] shrink-0 truncate text-[12px]"
                style={{ color: "var(--text-secondary)" }}
              >
                {r.key}
              </span>
              <span className="relative h-[16px] flex-1 overflow-hidden rounded-[4px]" style={{ background: "var(--grid-line)" }}>
                {(() => {
                  let acc = 0;
                  return series.map((s) => {
                    const v = r.parts[s] ?? 0;
                    const w = (v / max) * 100;
                    const left = acc;
                    acc += w;
                    return (
                      <span
                        key={s}
                        className="absolute top-0 h-full"
                        style={{
                          left: `${left}%`,
                          width: `${w}%`,
                          background: PRIORITY_COLORS[s] ?? "#8D75E6",
                          transition: "width 320ms ease, left 320ms ease",
                        }}
                      />
                    );
                  });
                })()}
              </span>
              <span className="tnum w-14 shrink-0 text-right text-[12px] font-semibold" style={{ color: "var(--text-primary)" }}>
                {showShare ? pct(r.total, total) : num(r.total)}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export function PriorityDonut({
  data,
  total,
  selected,
  onSelect,
}: {
  data: { key: string; total: number }[];
  total: number;
  selected: string[];
  onSelect: (key: string) => void;
}) {
  const size = 168;
  const r = 62;
  const stroke = 20;
  const c = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div className="flex items-center gap-5">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Cases by priority">
        <g transform={`translate(${size / 2},${size / 2}) rotate(-90)`}>
          <circle r={r} fill="none" stroke="var(--grid-line)" strokeWidth={stroke} />
          {data.map((d) => {
            const frac = total ? d.total / total : 0;
            const len = frac * c;
            const dash = `${len} ${c - len}`;
            const dashOffset = -offset;
            offset += len;
            const dimmed = selected.length > 0 && !selected.includes(d.key);
            return (
              <circle
                key={d.key}
                r={r}
                fill="none"
                stroke={PRIORITY_COLORS[d.key] ?? "#8D75E6"}
                strokeWidth={stroke}
                strokeDasharray={dash}
                strokeDashoffset={dashOffset}
                opacity={dimmed ? 0.25 : 1}
                className="cursor-pointer"
                onClick={() => onSelect(d.key)}
                style={{ transition: "stroke-dasharray 320ms ease, stroke-dashoffset 320ms ease, opacity 200ms ease" }}
              />
            );
          })}
        </g>
        <text x={size / 2} y={size / 2 - 4} textAnchor="middle" fontSize="22" fontWeight="700" fill="var(--text-primary)" className="chrome tnum">
          {num(total)}
        </text>
        <text x={size / 2} y={size / 2 + 14} textAnchor="middle" fontSize="10" fill="var(--text-muted)" className="chrome">
          cases in view
        </text>
      </svg>

      <ul className="flex-1">
        {data.map((d) => {
          const dimmed = selected.length > 0 && !selected.includes(d.key);
          return (
            <li key={d.key}>
              <button
                type="button"
                onClick={() => onSelect(d.key)}
                className="flex w-full cursor-pointer items-center gap-2 rounded-[6px] px-1 py-[3px] text-left text-[12px]"
                style={{ opacity: dimmed ? 0.45 : 1, transition: "opacity 200ms ease" }}
              >
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: PRIORITY_COLORS[d.key] }} />
                <span className="flex-1" style={{ color: "var(--text-secondary)" }}>{d.key}</span>
                <span className="tnum font-semibold" style={{ color: "var(--text-primary)" }}>{num(d.total)}</span>
                <span className="tnum w-9 text-right" style={{ color: "var(--text-muted)" }}>{pct(d.total, total)}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function ResolutionStrip({
  hours,
  p50,
  p90,
  logScale,
}: {
  hours: number[];
  p50: number | null;
  p90: number | null;
  logScale: boolean;
}) {
  const W = 1000;
  const H = 120;
  const padL = 12;
  const padR = 12;
  const plotW = W - padL - padR;
  const maxV = Math.max(1, ...hours);
  const scale = (v: number) => {
    if (!logScale) return padL + (v / maxV) * plotW;
    const lv = Math.log10(Math.max(v, 0.05));
    const lo = Math.log10(0.05);
    const hi = Math.log10(Math.max(maxV, 0.1));
    return padL + ((lv - lo) / (hi - lo)) * plotW;
  };

  const gridVals = logScale
    ? [0.1, 1, 6, 24, 168, 720, 4320].filter((v) => v <= maxV * 1.2)
    : niceTicks(maxV, 5);

  if (hours.length === 0) {
    return (
      <p className="py-8 text-center text-[12px]" style={{ color: "var(--text-muted)" }}>
        No resolved cases in this view — resolution time needs closed cases.
      </p>
    );
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 120 }} role="img"
      aria-label={`Resolution time distribution for ${hours.length} resolved cases`}>
      {gridVals.map((v) => (
        <g key={v}>
          <line x1={scale(v)} x2={scale(v)} y1={10} y2={H - 26} stroke="var(--chart-grid)" strokeWidth="1" />
          <text x={scale(v)} y={H - 10} textAnchor="middle" fontSize="10" fill="var(--axis)" className="chrome">
            {duration(v)}
          </text>
        </g>
      ))}

      {hours.map((h, i) => (
        <circle
          key={i}
          cx={scale(h)}
          cy={26 + ((i * 37) % 44)}
          r={2.6}
          fill="#8D75E6"
          opacity={0.45}
        />
      ))}

      {p50 != null && (
        <g>
          <line x1={scale(p50)} x2={scale(p50)} y1={12} y2={H - 26} stroke="#04B9AD" strokeWidth="2" />
          <text x={scale(p50) + 5} y={20} fontSize="10" fill="#04B9AD" className="chrome" fontWeight="600">
            median {duration(p50)}
          </text>
        </g>
      )}
      {p90 != null && (
        <g>
          <line x1={scale(p90)} x2={scale(p90)} y1={12} y2={H - 26} stroke="#F47E3F" strokeWidth="2" strokeDasharray="4 3" />
          <text x={scale(p90) + 5} y={34} fontSize="10" fill="#F47E3F" className="chrome" fontWeight="600">
            p90 {duration(p90)}
          </text>
        </g>
      )}
    </svg>
  );
}
