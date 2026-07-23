import { useState } from "react";

const SYSTEMS = [
  "AWS Production",
  "GitHub Organization",
  "Salesforce",
  "Datadog",
  "Internal Admin Console",
  "VPN",
  "Other",
];
const LEVELS = ["Read-only", "Standard", "Elevated", "Admin"];
const DURATIONS = ["1 day", "1 week", "30 days", "90 days", "Permanent"];

function branchQuery() {
  const b = new URLSearchParams(window.location.search).get("branch");
  return b ? `?branch=${encodeURIComponent(b)}` : "";
}

type Field = {
  name: string;
  email: string;
  system: string;
  level: string;
  duration: string;
  reason: string;
};

const EMPTY: Field = {
  name: "",
  email: "",
  system: SYSTEMS[0],
  level: LEVELS[0],
  duration: DURATIONS[1],
  reason: "",
};

export default function App() {
  const [form, setForm] = useState<Field>(EMPTY);
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">(
    "idle",
  );
  const [result, setResult] = useState<{ case_url?: string; case_id?: number } | null>(
    null,
  );
  const [error, setError] = useState("");

  const set = (k: keyof Field) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const valid =
    form.name.trim() && form.email.trim() && form.reason.trim().length > 4;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    setStatus("sending");
    setError("");
    try {
      const res = await fetch(`/access-request-submit${branchQuery()}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || `Request failed (${res.status})`);
      setResult(data);
      setStatus("done");
    } catch (err: any) {
      setError(err.message || "Something went wrong");
      setStatus("error");
    }
  }

  if (status === "done") {
    return (
      <Shell>
        <div className="text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 ring-1 ring-emerald-500/30">
            <svg className="h-8 w-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="font-serif text-2xl text-white">Request submitted</h2>
          <p className="mt-3 text-sm leading-relaxed text-neutral-400">
            Your request is now pending approval in Slack and has been documented
            {result?.case_id ? ` as case #${result.case_id}` : ""}.
          </p>
          {result?.case_url && (
            <a
              href={result.case_url}
              target="_blank"
              rel="noreferrer"
              className="mt-6 inline-block text-sm font-medium text-purple-300 underline underline-offset-4 hover:text-purple-200"
            >
              View the case in Tines
            </a>
          )}
          <div>
            <button
              onClick={() => {
                setForm(EMPTY);
                setStatus("idle");
                setResult(null);
              }}
              className="mt-8 rounded-lg border border-neutral-700 px-5 py-2.5 text-sm font-medium text-neutral-200 transition hover:border-neutral-500 hover:bg-neutral-800"
            >
              Submit another request
            </button>
          </div>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <form onSubmit={submit} className="space-y-6">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Text label="Your name" value={form.name} onChange={set("name")} placeholder="Jordan Lee" />
          <Text label="Work email" type="email" value={form.email} onChange={set("email")} placeholder="jordan@company.com" />
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Select label="System / resource" value={form.system} onChange={set("system")} options={SYSTEMS} />
          <Select label="Access level" value={form.level} onChange={set("level")} options={LEVELS} />
        </div>
        <Select label="Duration needed" value={form.duration} onChange={set("duration")} options={DURATIONS} />
        <div>
          <Label>Justification</Label>
          <textarea
            value={form.reason}
            onChange={set("reason")}
            rows={4}
            placeholder="Why do you need this access?"
            className="w-full resize-none rounded-lg border border-neutral-700 bg-neutral-900/60 px-4 py-3 text-sm text-white placeholder-neutral-600 outline-none transition focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
          />
        </div>

        {status === "error" && (
          <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={!valid || status === "sending"}
          className="w-full rounded-lg bg-purple-600 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {status === "sending" ? "Submitting…" : "Submit access request"}
        </button>
      </form>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-neutral-950 px-4 py-12 text-neutral-100 antialiased">
      <div className="mx-auto max-w-xl">
        <div className="mb-8">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-neutral-800 bg-neutral-900 px-3 py-1 text-xs font-medium uppercase tracking-widest text-purple-300">
            <span className="h-1.5 w-1.5 rounded-full bg-purple-400" />
            Access Request
          </div>
          <h1 className="font-serif text-3xl leading-tight text-white sm:text-4xl">
            Request system access
          </h1>
          <p className="mt-2 text-sm text-neutral-400">
            Submit a request for review. Approvals happen in Slack and every request is documented.
          </p>
        </div>
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-6 shadow-2xl shadow-black/40 sm:p-8">
          {children}
        </div>
      </div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-neutral-400">{children}</label>;
}

function Text(props: {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <Label>{props.label}</Label>
      <input
        type={props.type || "text"}
        value={props.value}
        onChange={props.onChange}
        placeholder={props.placeholder}
        className="w-full rounded-lg border border-neutral-700 bg-neutral-900/60 px-4 py-2.5 text-sm text-white placeholder-neutral-600 outline-none transition focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
      />
    </div>
  );
}

function Select(props: {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: string[];
}) {
  return (
    <div>
      <Label>{props.label}</Label>
      <select
        value={props.value}
        onChange={props.onChange}
        className="w-full rounded-lg border border-neutral-700 bg-neutral-900/60 px-4 py-2.5 text-sm text-white outline-none transition focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
      >
        {props.options.map((o) => (
          <option key={o} value={o} className="bg-neutral-900">
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}
