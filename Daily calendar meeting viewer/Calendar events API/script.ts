const STEP = "Calendar events API";
const log = (level: string, event: string, msg: string, extra = {}) => console.error(JSON.stringify({ ts: new Date().toISOString(), level, step: STEP, event, msg, ...extra }));
const respond = (status: number, body: unknown) => {
  const json = JSON.stringify(body);
  console.log(`HTTP/1.1 ${status}\r\nContent-Type: application/json; charset=utf-8\r\nCache-Control: no-store\r\nContent-Length: ${Buffer.byteLength(json)}\r\n\r\n${json}`);
};

try {
  log("info", "calendar_fetch_started", "Fetching the connected user’s upcoming meetings.");
  const started = Date.now();
  const settingsRes = await fetch("https://www.googleapis.com/calendar/v3/users/me/settings/timezone");
  log("info", "google_call_completed", "Fetched Google Calendar timezone.", { endpoint: "/calendar/v3/users/me/settings/timezone", status: settingsRes.status, duration_ms: Date.now() - started });
  if (!settingsRes.ok) throw new Error(`Google Calendar timezone request failed (${settingsRes.status})`);
  const setting = await settingsRes.json() as { value?: string };
  const timeZone = setting.value || "UTC";
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const get = (type: string) => parts.find(p => p.type === type)?.value || "";
  const date = `${get("year")}-${get("month")}-${get("day")}`;
  const offsetParts = new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "longOffset" }).formatToParts(now);
  const offsetName = offsetParts.find(p => p.type === "timeZoneName")?.value || "GMT+00:00";
  const offset = offsetName.replace("GMT", "") || "+00:00";
  const timeMin = now.toISOString();
  const timeMax = new Date(`${date}T23:59:59${offset}`).toISOString();
  const query = new URLSearchParams({ timeMin, timeMax, singleEvents: "true", orderBy: "startTime", maxResults: "50", timeZone });
  const eventsStarted = Date.now();
  const eventsRes = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?${query}`);
  log("info", "google_call_completed", "Fetched today’s Google Calendar events.", { endpoint: "/calendar/v3/calendars/primary/events", status: eventsRes.status, duration_ms: Date.now() - eventsStarted });
  if (!eventsRes.ok) throw new Error(`Google Calendar events request failed (${eventsRes.status})`);
  const data = await eventsRes.json() as { items?: any[] };
  const meetings = (data.items || []).filter(event => event.status !== "cancelled").map(event => ({
    id: event.id,
    title: event.summary || "Untitled meeting",
    start: event.start?.dateTime || event.start?.date,
    end: event.end?.dateTime || event.end?.date,
    allDay: Boolean(event.start?.date),
    location: event.location || "",
    meetingUrl: event.hangoutLink || event.htmlLink || "",
    attendees: Array.isArray(event.attendees) ? event.attendees.length : 0
  }));
  log("info", "calendar_fetch_completed", "Fetched upcoming meetings.", { count: meetings.length });
  respond(200, { date, timeZone, meetings });
} catch (error) {
  log("error", "calendar_fetch_failed", "Failed to fetch upcoming meetings.", { error: error instanceof Error ? error.message : String(error) });
  respond(502, { error: "Unable to load Google Calendar meetings" });
  process.exitCode = 1;
}
