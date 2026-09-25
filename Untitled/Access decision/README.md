HTTP route **`/access-decision`** (auth `external_id`). The Approve / Deny buttons in the Slack approval message link here with `?id=<request id>&decision=yes|no`.

Reads the pending request from the `access_requests` volume and is **idempotent** — a second click on an already-processed request just shows "already processed".

- **Deny** → updates the Tines Case description to *Status: Denied*.
- **Approve** → for each requested application, provisions a user:
  - **Okta** — `POST {OKTA_ORG_URL}/api/v1/users?activate=true`
  - **Jira** — `POST {JIRA_BASE_URL}/rest/api/3/user`
  - **Tines** — `POST /api/v1/admin/users`

  then updates the Case to *Granted until <expiry>*, stores the created user ids + `expires_at` back to the volume, and DMs the requester in Slack (`users.lookupByEmail` → `chat.postMessage`, one message per app).

Revocation is **not** done here — the [Revoke expired access](<../Revoke expired access/script.ts>) cron picks up the stored `expires_at`.

Connectors: **Tines** (Cases, admin users), **Slack**, **Okta**, **Jira**. Set `OKTA_ORG_URL` / `JIRA_BASE_URL` in [lib.ts](lib.ts).
