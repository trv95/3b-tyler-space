// Pulls related security logs for the affected user from Databricks (OCSF audit table).
const data = JSON.parse(await Bun.stdin.text());
const alert = data.alert ?? {};
const email = alert.affectedUserEmail;

const base = (process.env.DATABRICKS_URL || "").replace(/\/$/, "");
const jsonHeaders = { "content-type": "application/json", accept: "application/json" };

let databricks: Record<string, unknown> = { queried: false };

try {
  // Discover a SQL warehouse to run the query against.
  const whRes = await fetch(`${base}/api/2.0/sql/warehouses`, { headers: jsonHeaders });
  if (!whRes.ok) throw new Error(`list warehouses ${whRes.status}: ${await whRes.text()}`);
  const warehouses = ((await whRes.json()) as any).warehouses ?? [];
  const wh = warehouses.find((w: any) => w.state === "RUNNING") ?? warehouses[0];
  if (!wh) throw new Error("no SQL warehouse available");

  // Correlate against the OCSF-normalized audit log for the affected user.
  const statement = `
    SELECT
      from_unixtime(time / 1000)      AS event_time,
      class_name,
      activity_name,
      actor.user.email_addr           AS user_email,
      actor.user.full_name            AS user_full_name,
      metadata.product_name           AS product
    FROM workspace.default.tines_ocsf_silver
    WHERE actor.user.email_addr = :email
    ORDER BY time DESC
    LIMIT 25`;

  const runRes = await fetch(`${base}/api/2.0/sql/statements`, {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify({
      warehouse_id: wh.id,
      statement,
      wait_timeout: "30s",
      parameters: [{ name: "email", value: email ?? "", type: "STRING" }],
    }),
  });

  if (!runRes.ok) throw new Error(`execute statement ${runRes.status}: ${await runRes.text()}`);
  const result = (await runRes.json()) as any;

  const state = result.status?.state;
  if (state === "FAILED" || state === "CANCELED") {
    throw new Error(`statement ${state}: ${JSON.stringify(result.status?.error ?? {})}`);
  }

  const cols = (result.manifest?.schema?.columns ?? []).map((c: any) => c.name);
  const rawRows = result.result?.data_array ?? [];
  const rows = rawRows.map((r: any[]) =>
    Object.fromEntries(cols.map((c: string, i: number) => [c, r[i]])),
  );

  databricks = {
    queried: true,
    ok: true,
    table: "workspace.default.tines_ocsf_silver",
    warehouse: wh.name,
    rowCount: rows.length,
    columns: cols,
    rows,
  };
} catch (err) {
  console.error(`Databricks enrichment failed: ${err}`);
  databricks = { queried: true, ok: false, error: String(err), rowCount: 0 };
}

console.log(JSON.stringify({ ...data, databricks }));
