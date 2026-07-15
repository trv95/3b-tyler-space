Pulls **related logs** for the affected user and source IP from Databricks via the [SQL Statement Execution API](https://docs.databricks.com/api/workspace/statementexecution/executestatement) (`POST /api/2.0/sql/statements`).

Reads the enriched alert from stdin, runs a parameterized query filtering recent auth/access logs by `affectedUser` and `sourceIp`, and appends a `databricks` object (matched log rows) downstream.

Auth via a Databricks connector. Requires a SQL warehouse ID.
