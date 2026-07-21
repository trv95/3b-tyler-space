Handles budget and financial approval requests end to end: a person submits a
request through a web form, a case is opened in Tines Cases to track it, and an
approval notification is posted to Slack with a link to the case.

**Who uses it:** anyone in the space who needs to request budget, capital
expenditure, or new headcount, plus the approvers who receive the Slack alert.

**The flow**

1. [Request form](<Request form/App.tsx>) — a webpage at `/budget-approvals`
   (route auth: `space`). The requester picks a request type (budget, capex, or
   headcount), fills in common fields plus type-specific fields, and submits.
2. [Submit request](<Submit request/script.ts>) — `POST /budget-approvals/submit`
   (route auth: `space`). Validates the payload, creates a case in
   [Tines Cases](https://www.tines.com/docs/cases/) (team `19060`) with a
   markdown summary and metadata, and returns `{ caseId, caseUrl }` to the form.
3. [Notify Slack](<Notify Slack/script.ts>) — posts a Block Kit approval message
   to `#3b-demo` with the request details and a button linking to the case.

**Inputs / outputs at the boundary:** the form submits JSON
(`{ kind, fields }`); the submit endpoint responds with the created case id and
URL. See [Submit request/api.json](<Submit request/api.json>) for the contract.

**External services:** Tines Cases API (case creation) and Slack
(`chat.postMessage`), both via connectors — no secrets in code. This workflow is
read-write: it creates a Tines case and posts a Slack message on each submission.

**Common changes:**
- Add or edit request-type fields: [Request form/requests.ts](<Request form/requests.ts>)
  and [Submit request/request.ts](<Submit request/request.ts>).
- Change the Slack channel: `CHANNEL` in [Notify Slack/script.ts](<Notify Slack/script.ts>).
- Change the Tines team: `TEAM_ID` in [Submit request/script.ts](<Submit request/script.ts>).
