import { num, pct, duration } from "../lib/format";
import { ageHours, resolutionStats } from "../lib/aggregate";
import type { CaseRecord } from "../lib/types";
import { PRIORITY_COLORS } from "../lib/types";

function Kpi({
  label,
  value,
  hint,
  accent,
  onClick,
  active,
}: {
  label: string;
  value: string;
  hint: string;
  accent?: string;
  onClick?: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className="rounded-[10px] border p-4 text-left"
      style={{
        background: "var(--card-bg)",
        borderColor: active ? "var(--accent)" : "var(--border)",
        cursor: onClick ? "pointer" : "default",
      }}
    >
      <div className="chrome text-[11px] font-semibold" style={{ color: "var(--text-secondary)" }}>
        {label}
      </div>
      <div
        className="tnum mt-2 text-[26px] leading-none font-extrabold"
        style={{ color: accent ?? "var(--text-primary)" }}
      >
        {value}
      </div>
      <div className="chrome mt-1.5 text-[11px]" style={{ color: "var(--text-muted)" }}>
        {hint}
      </div>
    </button>
  );
}

export function KpiRow({
  scoped,
  totalCases,
  slaOnly,
  unassignedOnly,
  onToggleSla,
  onToggleUnassigned,
}: {
  scoped: CaseRecord[];
  totalCases: number;
  slaOnly: boolean;
  unassignedOnly: boolean;
  onToggleSla: () => void;
  onToggleUnassigned: () => void;
}) {
  const open = scoped.filter((c) => c.status === "OPEN");
  const closed = scoped.filter((c) => c.status !== "OPEN");
  const urgent = open.filter((c) => c.priority === "CRITICAL" || c.priority === "HIGH");
  const unassigned = open.filter((c) => c.assignees.length === 0);
  const breached = scoped.filter((c) => c.slaExceeded);
  const res = resolutionStats(closed);
  const stale = open.filter((c) => (ageHours(c) ?? 0) > 24 * 30);

  return (
    <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-6">
      <Kpi label="Cases in view" value={num(scoped.length)} hint={`of ${num(totalCases)} in tenant`} />
      <Kpi
        label="Open"
        value={num(open.length)}
        hint={`${pct(open.length, scoped.length)} of view · ${num(stale.length)} over 30d old`}
      />
      <Kpi
        label="Open critical + high"
        value={num(urgent.length)}
        hint={`${pct(urgent.length, Math.max(open.length, 1))} of open cases`}
        accent={urgent.length ? PRIORITY_COLORS.CRITICAL : undefined}
      />
      <Kpi
        label="Open unassigned"
        value={num(unassigned.length)}
        hint={unassignedOnly ? "filtering to these" : "click to filter"}
        accent={unassigned.length ? "#E49307" : undefined}
        onClick={onToggleUnassigned}
        active={unassignedOnly}
      />
      <Kpi
        label="SLA breached"
        value={num(breached.length)}
        hint={slaOnly ? "filtering to these" : "click to filter"}
        accent={breached.length ? PRIORITY_COLORS.CRITICAL : undefined}
        onClick={onToggleSla}
        active={slaOnly}
      />
      <Kpi
        label="Median time to resolve"
        value={duration(res.p50)}
        hint={res.n ? `p90 ${duration(res.p90)} · ${num(res.n)} resolved` : "no resolved cases in view"}
      />
    </div>
  );
}
