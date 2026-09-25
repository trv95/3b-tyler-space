Entry point for the workflow. HTTP route **`/temporary-access`** (webpage), served to space members.

- **GET** renders the temporary application access request form (First name, Last name, Email, Duration in minutes, Reasoning, Applications = multi-select of Tines / Okta / Jira).
- **POST** validates the submission and then, in one run:
  1. creates a Tines **Case** (`POST /api/v2/cases`) named `Temporary Application Access Request | <email>`, status *Pending approval in Slack*;
  2. creates a Tines **Record** (`POST /api/v1/records`, `record_type_id` 10822) linked to that Case;
  3. writes the pending request to the `access_requests` volume keyed by a generated id;
  4. posts a Slack Block Kit approval message (Approve / Deny buttons) to `#3b-demo`; the buttons link to the [Access decision](<../Access decision/script.ts>) route carrying the request `id` and `decision`.

Uses the **Tines** connector (Cases + Records) and **Slack** connector (`chat.postMessage`). Tenant-specific values (`TINES_TEAM_ID`, record field ids, approver channel, decision external_id) live in [lib.ts](lib.ts).
