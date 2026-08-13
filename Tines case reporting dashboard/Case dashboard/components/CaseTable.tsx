import { useMemo, useState } from "react";
import type { CaseRecord } from "../lib/types";
import { PRIORITY_COLORS } from "../lib/types";
import { ageHours } from "../lib/aggregate";
import { dateLabel, duration, num } from "../lib/format";

type SortKey = "priority" | "opened" | "age" | "resolution" | "team" | "name";

const PRIORITY_RANK: Record<string, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
  INFO: 4,
  UNSET: 5,
};

export function CaseTable({ cases }: { cases: CaseRecord[] }) {
  const [sort, setSort] = useState<SortKey>("priority");
  const [asc, setAsc] = useState(true);
  const [limit, setLimit] = useState(25);

  const sorted = useMemo(() => {
    const dir = asc ? 1 : -1;
    const copy = [...cases];
    copy.sort((a, b) => {
      switch (sort) {
        case "priority":
          return (
            dir * ((PRIORITY_RANK[a.priority] ?? 9) - (PRIORITY_RANK[b.priority] ?? 9)) ||
            (Date.parse(b.openedAt ?? "0") - Date.parse(a.openedAt ?? "0"))
          );
        case "opened":
          return dir * (Date.parse(a.openedAt ?? "0") - Date.parse(b.openedAt ?? "0"));
        case "age":
          return dir * ((ageHours(a) ?? 0) - (ageHours(b) ?? 0));
        case "resolution":
          return dir * ((a.resolutionHours ?? Infinity) - (b.resolutionHours ?? Infinity));
        case "team":
          return dir * a.team.localeCompare(b.team);
        case "name":
          return dir * a.name.localeCompare(b.name);
      }
    });
    return copy;
  }, [cases, sort, asc]);

  const header = (key: SortKey, label: string, className = "") => (
    <th
      className={`chrome cursor-pointer px-3 py-2 text-left text-[11px] font-semibold whitespace-nowrap ${className}`}
      style={{ color: sort === key ? "var(--text-primary)" : "var(--text-secondary)" }}
      onClick={() => {
        if (sort === key) setAsc(!asc);
        else {
          setSort(key);
          setAsc(key === "priority" || key === "team" || key === "name");
        }
      }}
    >
      {label}
      {sort === key && <span aria-hidden="true"> {asc ? "↑" : "↓"}</span>}
    </th>
  );

  return (
    <div>
      <div className="scroll-thin overflow-x-auto">
        <table className="w-full border-collapse text-[12px]">
          <thead style={{ background: "var(--header-bg)" }}>
            <tr>
              {header("priority", "Priority")}
              {header("name", "Case")}
              {header("team", "Team")}
              <th className="chrome px-3 py-2 text-left text-[11px] font-semibold" style={{ color: "var(--text-secondary)" }}>
                Assignees
              </th>
              <th className="chrome px-3 py-2 text-left text-[11px] font-semibold" style={{ color: "var(--text-secondary)" }}>
                Status
              </th>
              {header("opened", "Opened")}
              {header("age", "Age")}
              {header("resolution", "Time to resolve")}
            </tr>
          </thead>
          <tbody>
            {sorted.slice(0, limit).map((c) => (
              <tr
                key={c.id}
                style={{ borderTop: "1px solid var(--divider)" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--hover-bg)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <td className="px-3 py-2 whitespace-nowrap">
                  <span
                    className="rounded-full px-2 py-[2px] text-[10px] font-semibold"
                    style={{ background: `${PRIORITY_COLORS[c.priority] ?? "#8D75E6"}22`, color: PRIORITY_COLORS[c.priority] ?? "#8D75E6" }}
                  >
                    {c.priority}
                  </span>
                </td>
                <td className="max-w-[380px] px-3 py-2">
                  {c.url ? (
                    <a
                      href={c.url}
                      target="_blank"
                      rel="noreferrer"
                      className="block truncate hover:underline"
                      style={{ color: "var(--text-primary)" }}
                      title={c.name}
                    >
                      {c.name}
                    </a>
                  ) : (
                    <span className="block truncate" title={c.name}>{c.name}</span>
                  )}
                  {c.tags.length > 0 && (
                    <span className="mt-0.5 block truncate text-[10px]" style={{ color: "var(--text-muted)" }}>
                      {c.tags.slice(0, 4).join(" · ")}
                      {c.tags.length > 4 ? ` +${c.tags.length - 4}` : ""}
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 whitespace-nowrap" style={{ color: "var(--text-secondary)" }}>
                  {c.team}
                </td>
                <td className="px-3 py-2 whitespace-nowrap" style={{ color: "var(--text-secondary)" }}>
                  {c.assignees.length ? c.assignees.map((a) => a.name).join(", ") : (
                    <span style={{ color: "#E49307" }}>Unassigned</span>
                  )}
                </td>
                <td className="px-3 py-2 whitespace-nowrap" style={{ color: "var(--text-secondary)" }}>
                  {c.subStatus ?? c.status}
                  {c.slaExceeded && (
                    <span className="ml-1.5 rounded-full px-1.5 py-[1px] text-[9px] font-semibold" style={{ background: "#E14F4C22", color: "#E14F4C" }}>
                      SLA
                    </span>
                  )}
                </td>
                <td className="tnum px-3 py-2 whitespace-nowrap" style={{ color: "var(--text-secondary)" }}>
                  {dateLabel(c.openedAt)}
                </td>
                <td className="tnum px-3 py-2 whitespace-nowrap" style={{ color: "var(--text-secondary)" }}>
                  {c.status === "OPEN" ? duration(ageHours(c)) : "—"}
                </td>
                <td className="tnum px-3 py-2 whitespace-nowrap" style={{ color: "var(--text-secondary)" }}>
                  {duration(c.resolutionHours)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {sorted.length === 0 && (
        <p className="py-8 text-center text-[12px]" style={{ color: "var(--text-muted)" }}>
          No cases match the current filters.
        </p>
      )}

      {limit < sorted.length && (
        <button
          type="button"
          onClick={() => setLimit(limit + 50)}
          className="chrome mt-3 w-full cursor-pointer rounded-[8px] border py-2 text-[12px] font-medium"
          style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
        >
          Show 50 more — {num(sorted.length - limit)} remaining
        </button>
      )}
    </div>
  );
}
