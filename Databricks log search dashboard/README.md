A dashboard for searching security/audit logs in Databricks and visualising them.

**Entry point:** open [`/log-search`](<Dashboard/App.tsx>) in a browser (space-authenticated). A person types a free-text query, picks a time range, and hits search.

**The flow:** the [Dashboard](<Dashboard/App.tsx>) React app POSTs the query to the [Query logs](<Query logs/script.ts>) API at `/log-search-query`. That step runs SQL against `workspace.default.tines_ocsf_silver` via the [Databricks SQL Statement Execution API](https://docs.databricks.com/api/workspace/statementexecution) (warehouse `31481edb35959d3f`) and returns matching rows plus an hourly event-volume series. The dashboard renders stat cards, an SVG volume chart, and a results table.

**External services:** Databricks, via the **Databricks workspace** connector on the Query logs step. This workflow is read-only — it only runs `SELECT` queries.

**Common changes:** to search more/other columns or change time bucketing, edit [Query logs/script.ts](<Query logs/script.ts>); for UI/chart changes, edit [Dashboard/App.tsx](<Dashboard/App.tsx>).
