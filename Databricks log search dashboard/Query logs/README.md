Searches OCSF audit logs stored in Databricks and returns both the matching rows and an hourly log-volume series for charting.

**Trigger:** `POST /log-search-query` (space-authenticated API endpoint). Called by the [Dashboard](<../Dashboard/App.tsx>) UI.

**How it works:** Builds a parametrised SQL query against `workspace.default.tines_ocsf_silver` and runs it through the [Databricks SQL Statement Execution API](https://docs.databricks.com/api/workspace/statementexecution) using warehouse `31481edb35959d3f`. Auth and the workspace host (`DATABRICKS_URL`) come from the **Databricks workspace** connector.

**Request body** (all optional): `q` (free-text, matched case-insensitively against `activity_name`, `class_name`, `actor.user.email_addr`, `actor.user.full_name`, `metadata.product_name`), `from`/`to` (epoch ms), `limit` (1–2000, default 500).

**Response:** `{ rows[], series[], total }` — see [api.json](api.json).
