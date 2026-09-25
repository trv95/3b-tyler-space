Central processor for access requests. Every trigger — the [web form](<../Submit request/script.ts>), the [Slack slash command](<../Slash command/script.ts>), and the [Saviynt webhook](<../Saviynt webhook/script.ts>) — normalizes its input into a common JSON shape and links here.

This step creates a **Tines case** (team **Demo**, id `19060`) and posts the interactive **approval message** to Slack `#3b-notifications`, exactly as before. It is the `output = true` responder for all three routes, so it tailors its HTTP response to the `source`:

- `form` / `saviynt` → JSON `{ ok, case_id, case_url }`
- `slash` → a Slack ephemeral message payload the slash command renders

**Input (stdin) — normalized JSON:**

```json
{ "source": "form|slash|saviynt", "name": "", "email": "", "system": "", "level": "", "duration": "", "reason": "" }
```

Only `name` is required; other fields fall back to sensible defaults. **Connectors:** Tines (Cases API) and Slack.
