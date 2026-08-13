import { useMemo, useState } from "react";
import { Card, SegmentedControl } from "./ui";
import { PriorityDonut, ResolutionStrip, StackedBars, StackedTimeSeries } from "./charts";
import { CaseTable } from "./CaseTable";
import type { CaseRecord } from "../lib/types";
import { PRIORITY_COLORS } from "../lib/types";
import type { Bucket } from "../lib/aggregate";
import { presentPriorities, rankedBreakdown, resolutionStats } from "../lib/aggregate";
import type { Dimension, Filters } from "../lib/filters";
import { num } from "../lib/format";

export function PanelGrid({
  scoped,
  buckets,
  filters,
  bucket,
  partialLastBucket,
  onSelectBucket,
  crossFilter,
}: {
  scoped: CaseRecord[];
  buckets: Bucket[];
  filters: Filters;
  bucket: string | null;
  partialLastBucket: boolean;
  onSelectBucket: (key: string | null) => void;
  crossFilter: (dim: Dimension) => (value: string) => void;
}) {
  const [showShare, setShowShare] = useState(false);
  const [logScale, setLogScale] = useState(true);
  const [threatDim, setThreatDim] = useState<Dimension>("tactic");

  const open = useMemo(() => scoped.filter((c) => c.status === "OPEN"), [scoped]);
  const closed = useMemo(() => scoped.filter((c) => c.status !== "OPEN"), [scoped]);
  const priorities = useMemo(() => presentPriorities(scoped), [scoped]);
  const res = useMemo(() => resolutionStats(closed), [closed]);

  const priorityData = useMemo(
    () =>
      priorities
        .map((p) => ({ key: p, total: scoped.filter((c) => c.priority === p).length }))
        .filter((d) => d.total > 0),
    [scoped, priorities],
  );

  const teamRows = useMemo(() => rankedBreakdown(scoped, "team", 8), [scoped]);
  const threatRows = useMemo(() => rankedBreakdown(scoped, threatDim, 12), [scoped, threatDim]);
  const assigneeRows = useMemo(() => rankedBreakdown(open, "assignee", 12), [open]);
  const subStatusRows = useMemo(() => rankedBreakdown(open, "subStatus", 6), [open]);

  const shareToggle = (
    <SegmentedControl
      value={showShare ? "share" : "count"}
      onChange={(v) => setShowShare(v === "share")}
      options={[
        { value: "count", label: "#" },
        { value: "share", label: "%" },
      ]}
    />
  );

  const legend = (
    <div className="chrome flex flex-wrap items-center gap-3">
      {priorities.map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => crossFilter("priority")(p)}
          className="flex cursor-pointer items-center gap-1.5 text-[11px]"
          style={{
            opacity:
              filters.dims.priority.values.length === 0 || filters.dims.priority.values.includes(p)
                ? 1
                : 0.4,
            color: "var(--text-secondary)",
          }}
        >
          <span className="h-2 w-2 rounded-full" style={{ background: PRIORITY_COLORS[p] }} />
          {p}
        </button>
      ))}
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      <Card
        title="Case volume opened over time"
        subtitle={
          bucket
            ? "One period is selected — every other panel is scoped to it. Click it again or press Esc to clear."
            : "Stacked by priority. Click a period to scope the whole dashboard to it."
        }
        right={legend}
      >
        <StackedTimeSeries
          buckets={buckets}
          series={priorities}
          selectedBucket={bucket}
          onSelectBucket={onSelectBucket}
          partialLastBucket={partialLastBucket}
        />
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Priority mix" subtitle="Click a slice to filter">
          <PriorityDonut
            data={priorityData}
            total={scoped.length}
            selected={filters.dims.priority.values}
            onSelect={crossFilter("priority")}
          />
        </Card>

        <Card
          title="Threat types"
          subtitle="Derived from case tags"
          right={
            <SegmentedControl
              value={threatDim as "tactic" | "technique" | "tag"}
              onChange={(v) => setThreatDim(v as Dimension)}
              options={[
                { value: "tactic", label: "Tactic" },
                { value: "technique", label: "Technique" },
                { value: "tag", label: "Tag" },
              ]}
            />
          }
        >
          <StackedBars
            rows={threatRows}
            series={priorities}
            total={scoped.length}
            selected={filters.dims[threatDim].values}
            onSelect={crossFilter(threatDim)}
            showShare={showShare}
          />
        </Card>

        <Card title="Cases by team" subtitle="Top 8 by volume" right={shareToggle}>
          <StackedBars
            rows={teamRows}
            series={priorities}
            total={scoped.length}
            selected={filters.dims.team.values}
            onSelect={crossFilter("team")}
            showShare={showShare}
          />
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card
          title="Analyst case load"
          subtitle={`Open cases per assignee · ${num(open.length)} open in view`}
          className="lg:col-span-2"
        >
          <StackedBars
            rows={assigneeRows}
            series={priorities}
            total={open.length}
            selected={filters.dims.assignee.values}
            onSelect={crossFilter("assignee")}
            showShare={showShare}
            emptyLabel="No open cases in this view"
          />
        </Card>

        <Card title="Open work by sub-status" subtitle="Where open cases sit in the queue">
          <StackedBars
            rows={subStatusRows}
            series={priorities}
            total={open.length}
            selected={filters.dims.subStatus.values}
            onSelect={crossFilter("subStatus")}
            showShare={showShare}
            emptyLabel="No open cases in this view"
          />
        </Card>
      </div>

      <Card
        title="Time to resolve"
        subtitle={
          res.n
            ? `${num(res.n)} resolved cases · each dot is one case`
            : "Distribution of resolution times"
        }
        right={
          <SegmentedControl
            value={logScale ? "log" : "linear"}
            onChange={(v) => setLogScale(v === "log")}
            options={[
              { value: "log", label: "Log" },
              { value: "linear", label: "Linear" },
            ]}
          />
        }
      >
        <ResolutionStrip hours={res.hours} p50={res.p50} p90={res.p90} logScale={logScale} />
      </Card>

      <Card title="Cases" subtitle={`${num(scoped.length)} in view · sortable, links open in Tines`}>
        <CaseTable cases={scoped} />
      </Card>
    </div>
  );
}
