Receives a submitted approval request from the [Request form](<../Request form/App.tsx>) and opens a case in [Tines Cases](https://www.tines.com/docs/cases/) to track it.

**Trigger:** HTTP `POST /budget-approvals/submit` (route auth: `space`).

**Request body (JSON):**

```json
{
  "kind": "budget | capex | headcount",
  "fields": { "title": "…", "requester_name": "…", "amount": "…", "...": "…" }
}
```

**What it does:**

1. Validates the payload and normalizes the fields for the request type.
2. Creates a case via `POST https://<tenant>/api/v2/cases/` in team `19060`, with a
   markdown description, priority mapped from the form, and the form fields
   attached as case metadata.
3. Responds to the form with `{ caseId, caseUrl }`.
4. Emits an enriched object on stdout for the [Notify Slack](<../Notify Slack/script.ts>)
   step, which posts the approval notification.

Auth to the Tines API is provided by a connector (no secrets in code). The Tines
base URL is read from `WORKFLOW_URL`/connector env; the team id is a constant.
