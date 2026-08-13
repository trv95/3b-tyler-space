Entry point of the workflow. Run it manually (no route or schedule).

Fetches one CrowdStrike Falcon alert and trims it down to the fields the rest of the flow needs.

- With no input, queries `GET /alerts/queries/alerts/v2` for the newest endpoint-protection alert with status `new`, then hydrates it via `POST /alerts/entities/alerts/v2`.
- With input, accepts either a bare composite ID string or JSON `{"composite_id": "..."}` / `{"alert_id": "..."}` and looks up just that alert.

Authenticated by the **CrowdStrike** connector; the base URL comes from `CROWD_STRIKE_URL`.

Outputs `{ alert, device_id }` where `alert` is a slimmed summary (severity, MITRE mapping, process and parent process, hashes, user, network/DNS observables, Falcon console link). See [script.ts](script.ts).

Exits non-zero when no alert matches, which stops the run.
