Cross-dataset enrichment endpoint. Given a lookup key it returns a single joined view across all four datasets — useful when another workflow has, for example, a service name or a CVE and wants everything known about it in one call.

**Trigger:** HTTP `GET /vulndata/enrich` — authenticated as `connector`.

Provide at least one of `service`, `ownerEmail`, `bug`, `cve` (substring), or `qid`. Returns:

```json
{ "query": {...}, "owners": [...], "qualys": [...], "securityCentral": [...], "bugdb": [...] }
```

BugDB records are matched both by the supplied keys and by any bug IDs discovered in the Qualys/Security Central matches, so a `service` lookup still returns the related tickets even though BugDB has no service column. Reads the read-only `vulndata` volume built by the [Seed database step](<../Seed database/script.ts>). See [api.json](api.json) for the contract.
