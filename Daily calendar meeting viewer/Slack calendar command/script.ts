const STEP = "Slack calendar command";
const log = (level: string, event: string, msg: string, extra = {}) => console.error(JSON.stringify({ ts: new Date().toISOString(), level, step: STEP, event, msg, ...extra }));

function response(status: number, type: string, body: string) {
  console.log(`HTTP/1.1 ${status}\r\nContent-Type: ${type}\r\nCache-Control: no-store\r\nContent-Length: ${Buffer.byteLength(body)}\r\n\r\n${body}`);
}

try {
  const raw = await Bun.stdin.text();
  const [head, body = ""] = raw.split("\r\n\r\n");
  const requestLine = head.split("\r\n")[0] || "";
  log("info", "command_started", "Received a Slack calendar command.", { bytes: raw.length });
  if (!requestLine.startsWith("POST ")) {
    response(405, "text/plain; charset=utf-8", "Method not allowed");
  } else {
    const form = new URLSearchParams(body);
    if (form.get("command") !== "/calendar") throw new Error("Unexpected slash command");
    const base = process.env._3B_WORKFLOW_BASE_URL;
    if (!base) throw new Error("Workflow base URL is unavailable");
    const url = `${base}/calendar`;
    const payload = JSON.stringify({
      response_type: "ephemeral",
      blocks: [
        { type: "section", text: { type: "mrkdwn", text: "*Today’s calendar*\nOpen your private calendar viewer to connect Google Calendar and see your upcoming meetings." } },
        { type: "actions", elements: [{ type: "button", text: { type: "plain_text", text: "Open calendar" }, url, action_id: "open_calendar" }] }
      ]
    });
    log("info", "command_completed", "Returned the private calendar viewer link.", { user_id_present: Boolean(form.get("user_id")) });
    response(200, "application/json; charset=utf-8", payload);
  }
} catch (error) {
  log("error", "command_failed", "Failed to handle the Slack calendar command.", { error: error instanceof Error ? error.message : String(error) });
  response(400, "text/plain; charset=utf-8", "Unable to open calendar");
  process.exitCode = 1;
}
