import { Database } from "bun:sqlite";
import { existsSync } from "node:fs";

const DB_PATH = "/storage/se-requests/requests.sqlite";

type Row = { step: string; title: string; notes: string; created_at: string; status: string; source: string };

const rows: Row[] = existsSync(DB_PATH)
  ? (() => {
      const db = new Database(DB_PATH, { readonly: true });
      const columns = db
        .query<{ name: string }, []>("PRAGMA table_info(requests)")
        .all()
        .map((c) => c.name);
      const status = columns.includes("status") ? "status" : "'outstanding' AS status";
      const source = columns.includes("source") ? "source" : "'guide' AS source";
      const result = db
        .query<Row, []>(
          `SELECT step, title, notes, created_at, ${status}, ${source} FROM requests
           ORDER BY status = 'done', created_at DESC`
        )
        .all();
      db.close();
      return result;
    })()
  : [];

const outstanding = rows.filter((r) => r.status !== "done").length;

const escape = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const cards = rows
  .map((r) => {
    const done = r.status === "done";
    return `
      <article class="card${done ? " done" : ""}">
        <div class="row">
          <h2>${escape(r.title)}</h2>
          <span class="badge ${done ? "ok" : "open"}">${done ? "Taken care of" : "Outstanding"}</span>
          <time>${escape(new Date(r.created_at).toLocaleString("en-US", { timeZone: "UTC" }))} UTC</time>
        </div>
        <p class="step">${r.source === "manual" ? "Added manually" : escape(r.step)}</p>
        ${r.notes ? `<p class="notes">${escape(r.notes)}</p>` : `<p class="muted">No extra detail provided.</p>`}
        <div class="actions">
          <button data-step="${escape(r.step)}" data-status="${done ? "outstanding" : "done"}" class="ghost">
            ${done ? "Reopen" : "Mark as taken care of"}
          </button>
        </div>
      </article>`;
  })
  .join("");

const empty = `
  <div class="card empty">
    <p>No help requests yet.</p>
    <p class="muted">They appear here when someone ticks “I need a Tines Solutions Engineer to help me with this” in the setup guide, or when you add one below.</p>
  </div>`;

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>SE help requests — Tines 3B tenant setup</title>
<style>
  :root {
    --page-bg: #FCF9F5;
    --card-bg: rgba(248,244,240,0.82);
    --border: #EDE9E3;
    --input-bg: #F6F2EE;
    --text-primary: #362A51;
    --text-secondary: rgba(54,42,81,0.55);
    --text-muted: rgba(54,42,81,0.35);
    --accent: #8D75E6;
    --accent-deep: #4D3E78;
    --purple50: #F3ECF7;
    --green: #25A871;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 0 0 56px;
    background:
      radial-gradient(900px 480px at 8% -10%, rgba(215,196,250,0.5), transparent 62%),
      var(--page-bg);
    color: var(--text-primary);
    font-family: "Roobert", system-ui, sans-serif;
    font-size: 14px;
    -webkit-font-smoothing: antialiased;
  }
  header { border-bottom: 1px solid var(--border); background: rgba(252,249,245,0.9); }
  .wrap { max-width: 768px; margin: 0 auto; padding: 0 28px; }
  header .wrap { display: flex; align-items: center; gap: 8px; padding-top: 16px; padding-bottom: 16px; }
  .dot { width: 16px; height: 16px; border-radius: 999px; background: var(--accent); box-shadow: 0 0 0 4px var(--purple50); }
  .brand { font-size: 15px; font-weight: 600; }
  .sub { font-size: 15px; color: var(--text-secondary); }
  .count { margin-left: auto; background: var(--purple50); color: var(--accent-deep); border-radius: 999px; padding: 4px 12px; font-size: 11px; font-weight: 600; }
  h1 { font-size: 22px; font-weight: 700; margin: 40px 0 8px; }
  .lede { font-size: 16px; color: var(--text-secondary); margin: 0 0 28px; }
  .card { background: var(--card-bg); border: 1px solid var(--border); border-radius: 10px; padding: 28px; margin-bottom: 8px; }
  .card.done h2 { color: var(--text-secondary); text-decoration: line-through; }
  .row { display: flex; align-items: baseline; gap: 12px; flex-wrap: wrap; }
  .card h2 { font-size: 14px; font-weight: 600; margin: 0; }
  .badge { border-radius: 999px; padding: 3px 10px; font-size: 11px; font-weight: 600; }
  .badge.open { background: var(--purple50); color: var(--accent-deep); }
  .badge.ok { background: rgba(37,168,113,0.12); color: var(--green); }
  time { margin-left: auto; font-size: 12px; color: var(--text-muted); white-space: nowrap; }
  .step { font-size: 12px; color: var(--text-muted); margin: 4px 0 0; }
  .notes { background: var(--input-bg); border-radius: 8px; padding: 16px; margin: 16px 0 0; line-height: 1.6; white-space: pre-wrap; }
  .muted { color: var(--text-secondary); }
  .empty p { margin: 0 0 4px; }
  .actions { margin-top: 16px; }
  button { font-family: inherit; font-size: 13px; font-weight: 600; cursor: pointer; border-radius: 8px; padding: 8px 14px; }
  button.ghost { background: #FFFEFD; border: 1px solid var(--border); color: var(--accent-deep); }
  button.primary { background: var(--accent); border: 1px solid var(--accent); color: #fff; }
  button[disabled] { opacity: 0.5; cursor: default; }
  h2.section { font-size: 16px; font-weight: 700; margin: 40px 0 8px; }
  form.card { display: grid; gap: 12px; }
  label { font-size: 12px; font-weight: 600; color: var(--text-secondary); }
  input, textarea { font-family: inherit; font-size: 14px; width: 100%; background: var(--input-bg); border: 1px solid var(--border); border-radius: 8px; padding: 12px; color: var(--text-primary); }
  textarea { line-height: 1.6; resize: vertical; }
  .formrow { display: grid; gap: 4px; }
  #status { font-size: 12px; color: var(--text-secondary); margin-left: 8px; }
</style>
</head>
<body>
<header>
  <div class="wrap">
    <span class="dot"></span>
    <span class="brand">Tines 3B</span>
    <span class="sub">/ SE help requests</span>
    <span class="count">${outstanding} outstanding · ${rows.length} total</span>
  </div>
</header>
<main class="wrap">
  <h1>Solutions Engineer help requests</h1>
  <p class="lede">Every step where someone asked for help while working through the tenant setup guide, plus anything added by hand. Outstanding first.</p>
  ${rows.length ? cards : empty}

  <h2 class="section">Add a request manually</h2>
  <form class="card" id="add">
    <div class="formrow">
      <label for="title">What's needed</label>
      <input id="title" name="title" required placeholder="e.g. Walk through egress rules for the Splunk connector">
    </div>
    <div class="formrow">
      <label for="notes">Detail (optional)</label>
      <textarea id="notes" name="notes" rows="3" placeholder="Anything the Solutions Engineer should know."></textarea>
    </div>
    <div>
      <button type="submit" class="primary">Add request</button>
      <span id="status"></span>
    </div>
  </form>
</main>
<script>
  const branch = new URLSearchParams(location.search).get("branch");
  const endpoint = "/tenant-setup-request" + (branch ? "?branch=" + encodeURIComponent(branch) : "");
  const statusEl = document.getElementById("status");

  async function post(payload) {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error(String(response.status));
  }

  document.querySelectorAll("button[data-step]").forEach((button) => {
    button.addEventListener("click", async () => {
      button.disabled = true;
      try {
        await post({ action: "status", step: button.dataset.step, status: button.dataset.status });
        location.reload();
      } catch {
        button.disabled = false;
        button.textContent = "Couldn't save — try again";
      }
    });
  });

  document.getElementById("add").addEventListener("submit", async (event) => {
    event.preventDefault();
    const title = document.getElementById("title").value.trim();
    if (!title) return;
    statusEl.textContent = "Saving…";
    try {
      await post({ action: "add", title, notes: document.getElementById("notes").value });
      location.reload();
    } catch {
      statusEl.textContent = "Couldn't save. Try again.";
    }
  });
</script>
</body>
</html>`;

process.stdout.write(
  [
    "HTTP/1.1 200 OK",
    "Content-Type: text/html; charset=utf-8",
    `Content-Length: ${Buffer.byteLength(html)}`,
    "",
    html,
  ].join("\r\n")
);
