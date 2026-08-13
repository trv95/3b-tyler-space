import { useEffect, useRef, useState } from "react";
import type { Mode, Selection } from "../lib/filters";

export function Card({
  title,
  subtitle,
  right,
  children,
  className = "",
}: {
  title?: string;
  subtitle?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-[10px] border p-4 backdrop-blur-sm ${className}`}
      style={{ background: "var(--card-bg)", borderColor: "var(--border)" }}
    >
      {(title || right) && (
        <header className="chrome mb-4 flex items-start justify-between gap-4">
          <div>
            {title && (
              <h2 className="text-[15px] font-semibold tracking-tight" style={{ color: "var(--text-primary)" }}>
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="mt-0.5 text-[11px]" style={{ color: "var(--text-muted)" }}>
                {subtitle}
              </p>
            )}
          </div>
          {right}
        </header>
      )}
      {children}
    </section>
  );
}

export function Pill({
  active,
  onClick,
  children,
  title,
}: {
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="chrome cursor-pointer rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors"
      style={{
        borderColor: active ? "var(--accent)" : "var(--border)",
        background: active ? "var(--accent)" : "transparent",
        color: active ? "#FFFFFF" : "var(--text-secondary)",
      }}
    >
      {children}
    </button>
  );
}

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  disabled = [],
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  disabled?: T[];
}) {
  return (
    <div
      className="chrome inline-flex rounded-full border p-0.5"
      style={{ borderColor: "var(--border)", background: "var(--input-bg)" }}
    >
      {options.map((o) => {
        const off = disabled.includes(o.value);
        const active = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            disabled={off}
            onClick={() => onChange(o.value)}
            className="rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors"
            style={{
              cursor: off ? "not-allowed" : "pointer",
              background: active ? "var(--accent)" : "transparent",
              color: off ? "var(--text-muted)" : active ? "#FFFFFF" : "var(--text-secondary)",
              opacity: off ? 0.5 : 1,
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function MultiSelect({
  label,
  options,
  selection,
  onChange,
}: {
  label: string;
  options: { value: string; count: number }[];
  selection: Selection;
  onChange: (s: Selection) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const n = selection.values.length;
  const filtered = query
    ? options.filter((o) => o.value.toLowerCase().includes(query.toLowerCase()))
    : options;

  const setMode = (mode: Mode) => onChange({ ...selection, mode });

  return (
    <div ref={ref} className="chrome relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex h-8 cursor-pointer items-center gap-1.5 rounded-[8px] border px-2.5 text-[12px] font-medium whitespace-nowrap"
        style={{
          borderColor: n ? "var(--accent)" : "var(--border)",
          background: "var(--input-bg)",
          color: "var(--text-primary)",
        }}
      >
        <span style={{ color: n ? "var(--text-primary)" : "var(--text-secondary)" }}>{label}</span>
        {n > 0 && (
          <span
            className="rounded-full px-1.5 text-[10px] font-semibold"
            style={{
              background: selection.mode === "exclude" ? "#E14F4C" : "var(--accent)",
              color: "#fff",
            }}
          >
            {selection.mode === "exclude" ? `−${n}` : n}
          </span>
        )}
        <svg width="9" height="6" viewBox="0 0 9 6" aria-hidden="true">
          <path d="M1 1l3.5 3.5L8 1" stroke="var(--text-muted)" strokeWidth="1.5" fill="none" />
        </svg>
      </button>

      {open && (
        <div
          className="absolute z-30 mt-1 w-72 rounded-[10px] border p-2 shadow-xl"
          style={{ background: "var(--dropdown-bg)", borderColor: "var(--dropdown-border, var(--border))" }}
        >
          <div className="mb-2 flex items-center gap-1">
            <button
              type="button"
              onClick={() => setMode("include")}
              className="flex-1 cursor-pointer rounded-[6px] px-2 py-1 text-[11px] font-medium"
              style={{
                background: selection.mode === "include" ? "var(--accent)" : "transparent",
                color: selection.mode === "include" ? "#fff" : "var(--text-secondary)",
              }}
            >
              Only these
            </button>
            <button
              type="button"
              onClick={() => setMode("exclude")}
              className="flex-1 cursor-pointer rounded-[6px] px-2 py-1 text-[11px] font-medium"
              style={{
                background: selection.mode === "exclude" ? "#E14F4C" : "transparent",
                color: selection.mode === "exclude" ? "#fff" : "var(--text-secondary)",
              }}
            >
              All except
            </button>
          </div>

          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search…"
            className="mb-2 w-full rounded-[6px] border px-2 py-1.5 text-[12px] outline-none"
            style={{
              background: "var(--input-bg)",
              borderColor: "var(--border)",
              color: "var(--text-primary)",
            }}
          />

          <div className="scroll-thin max-h-64 overflow-y-auto">
            {filtered.length === 0 && (
              <p className="px-2 py-3 text-[12px]" style={{ color: "var(--text-muted)" }}>
                No matches
              </p>
            )}
            {filtered.map((o) => {
              const checked = selection.values.includes(o.value);
              return (
                <button
                  key={o.value}
                  type="button"
                  onClick={() =>
                    onChange({
                      ...selection,
                      values: checked
                        ? selection.values.filter((v) => v !== o.value)
                        : [...selection.values, o.value],
                    })
                  }
                  className="flex w-full cursor-pointer items-center gap-2 rounded-[6px] px-2 py-1.5 text-left text-[12px]"
                  style={{ color: "var(--text-primary)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--dropdown-hover)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <span
                    className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-[4px] border"
                    style={{
                      borderColor: checked ? "var(--accent)" : "var(--border)",
                      background: checked ? "var(--accent)" : "transparent",
                    }}
                  >
                    {checked && (
                      <svg width="9" height="7" viewBox="0 0 9 7" aria-hidden="true">
                        <path d="M1 3.5L3.5 6 8 1" stroke="#fff" strokeWidth="1.6" fill="none" />
                      </svg>
                    )}
                  </span>
                  <span className="flex-1 truncate">{o.value}</span>
                  <span className="tnum text-[11px]" style={{ color: "var(--text-muted)" }}>
                    {o.count}
                  </span>
                </button>
              );
            })}
          </div>

          {n > 0 && (
            <button
              type="button"
              onClick={() => onChange({ ...selection, values: [] })}
              className="mt-2 w-full cursor-pointer rounded-[6px] border py-1 text-[11px]"
              style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
            >
              Clear {n} selected
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function Tooltip({
  x,
  y,
  children,
}: {
  x: number;
  y: number;
  children: React.ReactNode;
}) {
  return (
    <div
      className="chrome pointer-events-none absolute z-40 rounded-[8px] border px-2.5 py-1.5 text-[11px] shadow-lg"
      style={{
        left: x,
        top: y,
        transform: "translate(-50%, -100%)",
        background: "var(--dropdown-bg)",
        borderColor: "var(--border)",
        color: "var(--text-primary)",
        minWidth: 120,
      }}
    >
      {children}
    </div>
  );
}
