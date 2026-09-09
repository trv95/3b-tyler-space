Entry point of the workflow. Run it manually (no route or schedule).

Emits a **sample** CrowdStrike Falcon alert — a high-severity LSASS credential-dumping detection — in the shape the rest of the flow expects. No CrowdStrike API call is made, so the flow runs without Falcon credentials.

- With no input, uses the built-in sample composite ID.
- With input, accepts either a bare composite ID string or JSON `{"composite_id": "..."}` / `{"alert_id": "..."}` and stamps that ID onto the sample alert.

Outputs `{ alert, device_id }` where `alert` carries severity, MITRE mapping, process and parent process, hashes, user, network/DNS observables, and a Falcon console link. See [script.ts](script.ts).

To return to live data, restore the `GET /alerts/queries/alerts/v2` and `POST /alerts/entities/alerts/v2` calls and reattach the CrowdStrike connector.
