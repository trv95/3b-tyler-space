Self-service access request workflow. An employee opens the request page, fills in who they are, what system they need, the access level, how long they need it, and why. Submitting the form creates a documented **Tines case** for the request and posts an interactive **approval message** to Slack. An approver clicks Approve or Deny in Slack; the decision is written back to the Tines case and the Slack message is updated to show the outcome.

**Flow**
- [Request form](<Request form/App.tsx>) — page at `/access-request` where a user submits the request.
- [Submit request](<Submit request/script.ts>) — API at `/access-request-submit`. Creates the Tines case (team **Demo**, id `19060`) and posts the Slack approval message to `#3b-notifications`.
- [Approval action](<Approval action/script.ts>) — webhook at `/access-request-action` that receives the Slack button click, comments/updates the case, and replaces the Slack message with the decision.

**Connectors:** Tines (Cases API) and Slack.

**Setup note:** The Slack app's *Interactivity* Request URL must point at the `/access-request-action` route so button clicks are delivered.
