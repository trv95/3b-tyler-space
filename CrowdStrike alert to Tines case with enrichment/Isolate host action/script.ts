import { tines } from "./tines";
import { findActor, httpResponse, readRequest } from "./request";

const request = await readRequest();
console.error(`Isolate Host clicked: ${request.body.slice(0, 2000)}`);

const caseId = request.params.get("case_id");
const actionId = request.params.get("action_id");
const hostname = request.params.get("hostname") ?? "the host";
const deviceId = request.params.get("device_id");

if (!caseId) {
  console.log(httpResponse("400 Bad Request", JSON.stringify({ error: "case_id is required" })));
  process.exit(1);
}

if (actionId) {
  await tines(`/api/v2/cases/${caseId}/actions/${actionId}`, { method: "DELETE" });
  console.error(`Removed case action ${actionId}`);
}

const isolatedAt = new Date().toISOString();
const actor = findActor(request.json, request.headers);

const content = [
  `**${hostname}** has been isolated.`,
  "",
  `| Field | Value |`,
  `| --- | --- |`,
  `| Host | ${hostname} |`,
  `| Device ID | ${deviceId ?? "unknown"} |`,
  `| Isolated at | ${isolatedAt} |`,
  `| Isolated by | ${actor} |`,
].join("\n");

await tines(`/api/v2/cases/${caseId}/notes`, {
  method: "POST",
  body: JSON.stringify({ title: "Host isolated", content, color: "red" }),
});

console.error(`Added isolation note to case ${caseId}`);

console.log(
  httpResponse("200 OK", JSON.stringify({ case_id: Number(caseId), isolated_at: isolatedAt, isolated_by: actor })),
);
