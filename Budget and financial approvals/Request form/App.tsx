import { useMemo, useState } from "react";
import {
  COMMON_FIELDS,
  JUSTIFICATION_FIELD,
  KINDS,
  kindDef,
  type FieldDef,
  type RequestKind,
} from "./requests";
import Field from "./Field";

declare global {
  interface Window {
    __ROUTE_PATH__?: string;
    __BRANCH_ID__?: string;
  }
}

type Status = "idle" | "submitting";

interface SuccessInfo {
  caseId: number | string;
  caseUrl: string;
}

function submitUrl() {
  const base = (window.__ROUTE_PATH__ || "/budget-approvals").replace(/\/$/, "");
  const branch = window.__BRANCH_ID__;
  return `${base}/submit${branch ? `?branch=${encodeURIComponent(branch)}` : ""}`;
}

export default function App() {
  const [kind, setKind] = useState<RequestKind | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<Status>("idle");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState<SuccessInfo | null>(null);

  const fields: FieldDef[] = useMemo(() => {
    if (!kind) return [];
    const def = kindDef(kind);
    // common identity/amount fields, then type-specific, then justification last.
    return [...COMMON_FIELDS, ...def.fields, JUSTIFICATION_FIELD];
  }, [kind]);

  const setValue = (key: string, value: string) => {
    setValues((v) => ({ ...v, [key]: value }));
    setErrors((e) => (e[key] ? { ...e, [key]: "" } : e));
  };

  const chooseKind = (k: RequestKind) => {
    setKind(k);
    setValues({});
    setErrors({});
    setSubmitError(null);
  };

  const validate = () => {
    const next: Record<string, string> = {};
    for (const f of fields) {
      const val = (values[f.key] || "").trim();
      if (f.required && !val) next[f.key] = "Required";
      else if (f.key === "requester_email" && val && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(val))
        next[f.key] = "Enter a valid email";
      else if ((f.type === "money" || f.type === "number") && val && Number(val) <= 0)
        next[f.key] = "Enter a value greater than 0";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async () => {
    if (!kind || !validate()) return;
    setStatus("submitting");
    setSubmitError(null);
    try {
      const res = await fetch(submitUrl(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, fields: values }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
      setSuccess({ caseId: data.caseId, caseUrl: data.caseUrl });
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setStatus("idle");
    }
  };

  return (
    <div className="min-h-screen bg-paper text-ink font-sans antialiased">
      <div className="mx-auto max-w-3xl px-6 py-14 sm:py-20">
        <Header />
        {success ? (
          <SuccessScreen
            info={success}
            onReset={() => {
              setSuccess(null);
              setKind(null);
              setValues({});
            }}
          />
        ) : (
          <>
            <KindPicker selected={kind} onSelect={chooseKind} />
            {kind && (
              <FormSection
                kind={kind}
                fields={fields}
                values={values}
                errors={errors}
                status={status}
                submitError={submitError}
                onChange={setValue}
                onSubmit={submit}
              />
            )}
          </>
        )}
        <footer className="mt-16 border-t border-ink/15 pt-5 font-mono text-[11px] uppercase tracking-[0.16em] text-ink/35">
          Finance Approvals · routed to Tines Cases &amp; Slack
        </footer>
      </div>
    </div>
  );
}

function Header() {
  return (
    <header className="mb-12">
      <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-oxblood mb-4">
        Office of Finance
      </div>
      <h1 className="font-display text-5xl sm:text-6xl leading-[0.95] tracking-tight text-ink">
        Approval
        <br />
        <span className="italic">requisition</span>
      </h1>
      <p className="mt-5 max-w-md font-sans text-[15px] leading-relaxed text-ink/60">
        Submit a budget, capital, or headcount request for review. Each
        submission opens a tracked case and notifies the approvers.
      </p>
    </header>
  );
}

function KindPicker({
  selected,
  onSelect,
}: {
  selected: RequestKind | null;
  onSelect: (k: RequestKind) => void;
}) {
  return (
    <section>
      <SectionLabel n="§" text="Request type" />
      <div className="grid gap-3 sm:grid-cols-3">
        {KINDS.map((k) => {
          const active = selected === k.kind;
          return (
            <button
              key={k.kind}
              onClick={() => onSelect(k.kind)}
              className={
                "group text-left border p-5 transition-all duration-200 " +
                (active
                  ? "border-ink bg-ink text-paper shadow-[6px_6px_0_0_rgba(124,45,45,0.9)]"
                  : "border-ink/25 bg-transparent hover:border-ink hover:-translate-y-0.5")
              }
            >
              <div
                className={
                  "font-mono text-[11px] tracking-[0.2em] " +
                  (active ? "text-paper/60" : "text-oxblood")
                }
              >
                {k.numeral}
              </div>
              <div className="font-display text-xl mt-3 leading-tight">{k.title}</div>
              <div
                className={
                  "font-mono text-[10px] uppercase tracking-[0.16em] mt-1 " +
                  (active ? "text-paper/55" : "text-ink/40")
                }
              >
                {k.tagline}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function FormSection({
  kind,
  fields,
  values,
  errors,
  status,
  submitError,
  onChange,
  onSubmit,
}: {
  kind: RequestKind;
  fields: FieldDef[];
  values: Record<string, string>;
  errors: Record<string, string>;
  status: Status;
  submitError: string | null;
  onChange: (k: string, v: string) => void;
  onSubmit: () => void;
}) {
  const def = kindDef(kind);
  return (
    <section className="mt-12 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <SectionLabel n={def.numeral} text={`${def.title} details`} />
      <p className="-mt-2 mb-7 font-sans text-[14px] text-ink/55 max-w-lg">
        {def.description}
      </p>
      <div className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
        {fields.map((f) => (
          <Field
            key={f.key}
            field={f}
            value={values[f.key] || ""}
            error={errors[f.key]}
            onChange={onChange}
          />
        ))}
      </div>

      {submitError && (
        <div className="mt-8 border border-oxblood/40 bg-oxblood/5 px-4 py-3 font-mono text-[12px] text-oxblood">
          {submitError}
        </div>
      )}

      <div className="mt-10 flex items-center gap-5">
        <button
          onClick={onSubmit}
          disabled={status === "submitting"}
          className="group relative bg-ink text-paper font-mono text-[12px] uppercase tracking-[0.2em] px-8 py-4 transition-all hover:shadow-[5px_5px_0_0_var(--color-oxblood)] hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-wait disabled:translate-y-0 disabled:shadow-none"
        >
          {status === "submitting" ? "Submitting…" : "Submit for approval"}
        </button>
        <span className="font-sans text-[13px] text-ink/40">
          <span className="text-oxblood">*</span> required
        </span>
      </div>
    </section>
  );
}

function SuccessScreen({ info, onReset }: { info: SuccessInfo; onReset: () => void }) {
  return (
    <section className="mt-6 animate-in fade-in zoom-in-95 duration-300">
      <div className="border border-ink bg-ink text-paper p-8 shadow-[8px_8px_0_0_var(--color-oxblood)]">
        <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-paper/50">
          Submitted
        </div>
        <h2 className="font-display text-3xl mt-3">Request received</h2>
        <p className="mt-4 font-sans text-[15px] leading-relaxed text-paper/70 max-w-md">
          A case has been opened for tracking and the approvers have been
          notified in Slack.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          {info.caseUrl && (
            <a
              href={info.caseUrl}
              target="_blank"
              rel="noreferrer"
              className="bg-paper text-ink font-mono text-[12px] uppercase tracking-[0.18em] px-6 py-3 hover:bg-oxblood hover:text-paper transition-colors"
            >
              View case {info.caseId ? `#${info.caseId}` : ""} →
            </a>
          )}
          <button
            onClick={onReset}
            className="font-mono text-[12px] uppercase tracking-[0.18em] px-6 py-3 border border-paper/40 text-paper hover:border-paper transition-colors"
          >
            New request
          </button>
        </div>
      </div>
    </section>
  );
}

function SectionLabel({ n, text }: { n: string; text: string }) {
  return (
    <div className="mb-5 flex items-baseline gap-3">
      <span className="font-mono text-[13px] text-oxblood">{n}</span>
      <span className="font-mono text-[11px] uppercase tracking-[0.24em] text-ink/50">
        {text}
      </span>
      <span className="flex-1 border-b border-dotted border-ink/25 translate-y-[-2px]" />
    </div>
  );
}
