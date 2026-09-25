import { FormEvent, useEffect, useMemo, useState } from "react";

type Request = {
  id: string;
  created_at: string;
  system: string;
  access_level: string;
  justification: string;
  status: string;
  expires_at: string;
  department?: string;
  job_title?: string;
  manager_name?: string;
};
type Grant = { id: string; system: string; access_level: string; granted_at: string; status: string };
type Data = { requester: string; requests: Request[]; grants: Grant[] };

const api = () => `${window.__ROUTE_PATH__.replace(/\/portal$/, "")}/api/requests`;
const systems: Record<string, string[]> = {
  Salesforce: ["Read only", "Standard user", "Administrator"],
  GitHub: ["Read", "Write", "Repository admin"],
  Snowflake: ["Analyst", "Developer", "Account admin"],
  Jira: ["User", "Project admin", "Site admin"],
  "Google Workspace": ["Standard", "Groups admin", "Super admin"],
};

export default function App() {
  const [data, setData] = useState<Data>({ requester: "", requests: [], grants: [] });
  const [system, setSystem] = useState("Salesforce");
  const [access, setAccess] = useState(systems.Salesforce[0]);
  const [justification, setJustification] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; kind: "ok" | "bad" } | null>(null);

  const load = async () => {
    const response = await fetch(api(), { credentials: "same-origin" });
    if (!response.ok) throw new Error("Could not load your access profile");
    setData(await response.json());
  };
  useEffect(() => { load().catch((e) => setMessage({ text: e.message, kind: "bad" })); }, []);

  const pending = useMemo(() => data.requests.filter((r) => r.status === "pending"), [data.requests]);
  const active = useMemo(() => data.grants.filter((g) => g.status === "active"), [data.grants]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setMessage(null);
    try {
      const response = await fetch(api(), {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ requester_email: data.requester, system, access_level: access, justification }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Request could not be submitted");
      setJustification("");
      setMessage({ text: `Request ${result.id} is with ${result.approval.escalated ? "the access team" : "your manager"} in Slack.`, kind: "ok" });
      await load();
    } catch (e) {
      setMessage({ text: e instanceof Error ? e.message : "Request failed", kind: "bad" });
    } finally { setBusy(false); }
  }

  return <main className="shell">
    <header className="topbar">
      <div className="brand"><span className="brandmark">A</span><span>Access desk</span></div>
      <div className="identity"><span className="pulse" />{data.requester || "Signed-in employee"}</div>
    </header>

    <section className="hero">
      <div>
        <p className="eyebrow">EMPLOYEE SELF-SERVICE</p>
        <h1>Access, without<br/><em>the runaround.</em></h1>
        <p className="lede">Request the tools you need. Your org details are verified through BambooHR and approval goes straight to the right person in Slack.</p>
      </div>
      <div className="orbit" aria-hidden="true"><div className="orbit-core">✓</div><i/><i/><i/></div>
    </section>

    <section className="workspace">
      <form className="request-card" onSubmit={submit}>
        <div className="card-head"><span>01</span><div><h2>New access request</h2><p>Your manager, department and role are added automatically.</p></div></div>
        <label>System<select value={system} onChange={(e) => { setSystem(e.target.value); setAccess(systems[e.target.value][0]); }}>{Object.keys(systems).map((s) => <option key={s}>{s}</option>)}</select></label>
        <label>Access level<select value={access} onChange={(e) => setAccess(e.target.value)}>{systems[system].map((a) => <option key={a}>{a}</option>)}</select></label>
        <label>Business justification<textarea value={justification} onChange={(e) => setJustification(e.target.value)} minLength={8} maxLength={600} required placeholder="What will this access enable you to do?"/></label>
        {message && <div className={`notice ${message.kind}`}>{message.text}</div>}
        <button disabled={busy || !data.requester}>{busy ? "Submitting…" : "Send for approval"}<span>↗</span></button>
      </form>

      <aside className="status-panel">
        <div className="panel-title"><div><span>02</span><h2>Your access</h2></div><button className="refresh" onClick={() => load()} aria-label="Refresh">↻</button></div>
        <div className="metrics"><div><strong>{active.length}</strong><span>Active grants</span></div><div><strong>{pending.length}</strong><span>Awaiting decision</span></div></div>
        <div className="list">
          {data.requests.length === 0 && <div className="empty"><b>No requests yet</b><span>Your request history will appear here.</span></div>}
          {data.requests.slice(0, 6).map((r) => <article key={r.id}>
            <div className="system-glyph">{r.system.slice(0, 1)}</div>
            <div className="request-copy"><b>{r.system}</b><span>{r.access_level} · {new Date(r.created_at).toLocaleDateString()}</span></div>
            <span className={`status ${r.status}`}>{r.status}</span>
          </article>)}
        </div>
      </aside>
    </section>

    <section className="process"><p>HOW IT WORKS</p><div><span><b>1</b>BambooHR verifies your profile</span><i>→</i><span><b>2</b>Your manager decides in Slack</span><i>→</i><span><b>3</b>Every action is audit logged</span></div></section>
    <footer><span>Access Desk · Employee IAM</span><a href="https://se-demo.3b.dev/workflows/XqirJHpgKqPQ">View Tines workflow ↗</a></footer>
  </main>;
}

declare global { interface Window { __ROUTE_PATH__: string } }
