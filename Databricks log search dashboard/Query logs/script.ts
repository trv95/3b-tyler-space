// Query OCSF audit logs from Databricks via the SQL Statement Execution API.
//
// Route: POST /log-search-query  (route_type = api)
// Request body (JSON):
//   { "q": "search text", "from": <epoch ms>, "to": <epoch ms>, "limit": 500 }
// All fields optional. `q` matches (case-insensitive) against activity_name,
// class_name, actor email/full name, and product_name.
//
// Response (JSON):
//   {
//     "rows":   [ { time, class_name, activity_name, email, name, product }, ... ],
//     "series": [ { bucket: <epoch ms>, count: n }, ... ],   // hourly log volume
//     "total":  <number of matching rows returned>
//   }

const WAREHOUSE_ID = "31481edb35959d3f";
const TABLE = "workspace.default.tines_ocsf_silver";
const base = process.env.DATABRICKS_URL || "";

function parseRequest(raw: string): { body: string } {
  let sep = raw.indexOf("\r\n\r\n");
  let len = 4;
  if (sep === -1) {
    sep = raw.indexOf("\n\n");
    len = 2;
  }
  if (sep === -1) return { body: "" };
  return { body: raw.slice(sep + len) };
}

// Escape a string literal for safe inline use in SQL.
function lit(s: string): string {
  return "'" + String(s).replace(/'/g, "''") + "'";
}

async function runSql(statement: string): Promise<any> {
  const res = await fetch(`${base}/api/2.0/sql/statements`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      warehouse_id: WAREHOUSE_ID,
      statement,
      wait_timeout: "30s",
      format: "JSON_ARRAY",
    }),
  });
  let result = await res.json();
  if (!res.ok) throw new Error(`Databricks ${res.status}: ${JSON.stringify(result)}`);
  let state = result.status?.state;
  const id = result.statement_id;
  while (state === "PENDING" || state === "RUNNING") {
    await new Promise((r) => setTimeout(r, 1000));
    const p = await fetch(`${base}/api/2.0/sql/statements/${id}`, {});
    result = await p.json();
    state = result.status?.state;
  }
  if (state !== "SUCCEEDED") throw new Error(`Statement ${state}: ${JSON.stringify(result.status)}`);
  return result;
}

function rowsOf(result: any): any[] {
  return result.result?.data_array || [];
}

function respond(status: string, obj: unknown) {
  process.stdout.write(
    ["HTTP/1.1 " + status, "Content-Type: application/json", "", JSON.stringify(obj)].join("\r\n")
  );
}

async function main() {
  const { body } = parseRequest(await Bun.stdin.text());
  let req: any = {};
  try {
    req = body ? JSON.parse(body) : {};
  } catch {
    req = {};
  }

  const limit = Math.min(Math.max(parseInt(req.limit) || 500, 1), 2000);
  const conds: string[] = [];

  if (req.from) conds.push(`time >= ${Math.floor(Number(req.from))}`);
  if (req.to) conds.push(`time <= ${Math.floor(Number(req.to))}`);

  const q = (req.q || "").trim();
  if (q) {
    const like = lit("%" + q.toLowerCase() + "%");
    conds.push(
      `(lower(activity_name) LIKE ${like} OR lower(class_name) LIKE ${like} ` +
        `OR lower(actor.user.email_addr) LIKE ${like} OR lower(actor.user.full_name) LIKE ${like} ` +
        `OR lower(metadata.product_name) LIKE ${like})`
    );
  }

  const where = conds.length ? "WHERE " + conds.join(" AND ") : "";

  const rowsSql =
    `SELECT time, class_name, activity_name, ` +
    `actor.user.email_addr AS email, actor.user.full_name AS name, ` +
    `metadata.product_name AS product ` +
    `FROM ${TABLE} ${where} ORDER BY time DESC LIMIT ${limit}`;

  // Bucket by hour (3600000 ms) for the volume time series.
  const seriesSql =
    `SELECT CAST((time - (time % 3600000)) AS BIGINT) AS bucket, COUNT(*) AS cnt ` +
    `FROM ${TABLE} ${where} GROUP BY bucket ORDER BY bucket`;

  const [rowsRes, seriesRes] = await Promise.all([runSql(rowsSql), runSql(seriesSql)]);

  const rows = rowsOf(rowsRes).map((r) => ({
    time: Number(r[0]),
    class_name: r[1],
    activity_name: r[2],
    email: r[3],
    name: r[4],
    product: r[5],
  }));
  const series = rowsOf(seriesRes).map((r) => ({ bucket: Number(r[0]), count: Number(r[1]) }));

  respond("200 OK", { rows, series, total: rows.length });
}

main().catch((e) => {
  console.error(e);
  respond("500 Internal Server Error", { error: String(e) });
});
