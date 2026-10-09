import { isIP } from "node:net";
import { appendFile, mkdir } from "node:fs/promises";

const STEP = "Enrich and notify";
function log(level: "info" | "warn" | "error", event: string, msg: string, extra: Record<string, unknown> = {}) { console.error(JSON.stringify({ ts: new Date().toISOString(), level, step: STEP, event, msg, ...extra })); }
async function audit(action: string, target: string, outcome: "success" | "failure", detail: Record<string, unknown>) { const ts = new Date().toISOString(); await mkdir("/storage/audit", { recursive: true }); await appendFile(`/storage/audit/${ts.slice(0, 10)}.jsonl`, `${JSON.stringify({ ts, workflow: "IP enrichment with VirusTotal to Slack", step: STEP, action, target, outcome, detail })}\n`); }
function response(status: number, body: unknown) { const payload = JSON.stringify(body); process.stdout.write(`HTTP/1.1 ${status} ${status === 200 ? "OK" : "Error"}\r\nContent-Type: application/json; charset=utf-8\r\nContent-Length: ${Buffer.byteLength(payload)}\r\nCache-Control: no-store\r\n\r\n${payload}`); }
function parseRequest(raw: string) { const separator = raw.indexOf("\r\n\r\n"); if (separator < 0) throw new Error("Malformed HTTP request."); return { method: raw.slice(0, raw.indexOf("\r\n")).split(" ")[0], body: raw.slice(separator + 4) }; }
function isPublicIp(ip: string) { if (isIP(ip) === 4) { const [a, b] = ip.split(".").map(Number); return !(a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224); } const n = ip.toLowerCase(); return isIP(ip) === 6 && n !== "::" && n !== "::1" && !n.startsWith("fe80:") && !n.startsWith("fc") && !n.startsWith("fd") && !n.startsWith("ff"); }
async function timedFetch(service: string, url: string, init?: RequestInit) { const started = Date.now(); const result = await fetch(url, { ...init, signal: AbortSignal.timeout(12000) }); log("info", "external_call_completed", `Called ${service}.`, { service, endpoint: new URL(url).pathname, status: result.status, duration_ms: Date.now() - started }); return result; }

try {
  const request = parseRequest(await Bun.stdin.text());
  log("info", "enrichment_started", "Started IP enrichment request.", { method: request.method });
  if (request.method !== "POST") { response(405, { error: "Only POST requests are supported." }); process.exit(0); }
  let input: unknown; try { input = JSON.parse(request.body); } catch { input = null; }
  const ip = typeof (input as any)?.ip === "string" ? (input as any).ip.trim() : "";
  const channel = "C0BKQMP3LSU";
  if (!isIP(ip)) { log("warn", "enrichment_rejected", "Rejected an invalid IP address."); response(400, { error: "Enter a valid IPv4 or IPv6 address." }); process.exit(0); }
  if (!isPublicIp(ip)) { log("warn", "enrichment_rejected", "Rejected a non-public IP address.", { ip }); response(400, { error: "Private, reserved, multicast, and loopback addresses cannot be enriched." }); process.exit(0); }

  const [vtResponse, abuseResponse] = await Promise.all([
    timedFetch("virustotal", `https://www.virustotal.com/api/v3/ip_addresses/${encodeURIComponent(ip)}`),
    timedFetch("abuseipdb", `https://api.abuseipdb.com/api/v2/check?ipAddress=${encodeURIComponent(ip)}&maxAgeInDays=90&verbose=true`, { headers: { Accept: "application/json" } }),
  ]);
  if (!vtResponse.ok || !abuseResponse.ok) {
    const service = !vtResponse.ok ? "VirusTotal" : "AbuseIPDB"; const status = !vtResponse.ok ? vtResponse.status : abuseResponse.status;
    log("error", "enrichment_failed", `${service} could not complete the enrichment.`, { service: service.toLowerCase(), status, ip });
    await audit("ip_enrichment", `ip:${ip}`, "failure", { service: service.toLowerCase(), status });
    response(status === 404 ? 404 : 502, { error: status === 404 ? `${service} has no report for this IP address.` : `${service} could not complete the enrichment.` }); process.exit(0);
  }

  const vt = await vtResponse.json() as any; const abuseJson = await abuseResponse.json() as any;
  const attributes = vt?.data?.attributes ?? {}; const stats = attributes.last_analysis_stats ?? {}; const abuseData = abuseJson?.data ?? {};
  const analysis = { malicious: Number(stats.malicious ?? 0), suspicious: Number(stats.suspicious ?? 0), harmless: Number(stats.harmless ?? 0), undetected: Number(stats.undetected ?? 0) };
  const abuseipdb = { abuseConfidenceScore: Number(abuseData.abuseConfidenceScore ?? 0), totalReports: Number(abuseData.totalReports ?? 0), lastReportedAt: abuseData.lastReportedAt || null, usageType: abuseData.usageType || null, domain: abuseData.domain || null, isTor: Boolean(abuseData.isTor), reportUrl: `https://www.abuseipdb.com/check/${encodeURIComponent(ip)}` };
  const verdict = analysis.malicious > 0 || abuseipdb.abuseConfidenceScore >= 75 ? "malicious" : analysis.suspicious > 0 || abuseipdb.abuseConfidenceScore > 0 ? "suspicious" : "no detections";
  const reportUrl = `https://www.virustotal.com/gui/ip-address/${encodeURIComponent(ip)}`;
  const country = attributes.country || abuseData.countryCode || null; const network = attributes.network || null; const asOwner = attributes.as_owner || abuseData.isp || null;
  const context = [country && `Country: ${country}`, network && `Network: ${network}`, asOwner && `AS owner: ${asOwner}`].filter(Boolean).join("  •  ") || "No network context reported";

  const slackResponse = await timedFetch("slack", "https://slack.com/api/chat.postMessage", { method: "POST", headers: { "Content-Type": "application/json; charset=utf-8" }, body: JSON.stringify({ channel, text: `IP enrichment: ${ip} — ${verdict}`, unfurl_links: false, blocks: [
    { type: "header", text: { type: "plain_text", text: `IP enrichment · ${ip}` } },
    { type: "section", fields: [
      { type: "mrkdwn", text: `*Verdict*\n${verdict === "malicious" ? "🔴" : verdict === "suspicious" ? "🟠" : "🟢"} ${verdict}` },
      { type: "mrkdwn", text: `*VirusTotal*\n${analysis.malicious} malicious · ${analysis.suspicious} suspicious` },
      { type: "mrkdwn", text: `*AbuseIPDB confidence*\n${abuseipdb.abuseConfidenceScore}%` },
      { type: "mrkdwn", text: `*AbuseIPDB reports*\n${abuseipdb.totalReports}${abuseipdb.isTor ? " · Tor exit" : ""}` },
    ] },
    { type: "section", text: { type: "mrkdwn", text: `*Network context*\n${context}` } },
    { type: "context", elements: [{ type: "mrkdwn", text: `<${reportUrl}|VirusTotal report> · <${abuseipdb.reportUrl}|AbuseIPDB report> · ${analysis.harmless} harmless · ${analysis.undetected} undetected` }] },
  ] }) });
  const slack = await slackResponse.json() as any;
  if (!slackResponse.ok || !slack.ok) { log("error", "slack_delivery_failed", "Slack could not deliver the enrichment.", { status: slackResponse.status, error_code: slack.error, ip }); await audit("slack_notification", `ip:${ip}`, "failure", { status: slackResponse.status, error_code: slack.error }); response(502, { error: `Slack could not deliver the message${slack.error ? `: ${slack.error}` : "."}` }); process.exit(0); }

  const result = { id: crypto.randomUUID(), enrichedAt: new Date().toISOString(), ip, verdict, country, network, asOwner, analysis, abuseipdb, reportUrl, slack: { channel: slack.channel, timestamp: slack.ts } };
  const historyDir = `/storage/ip-enrichment-history/${result.enrichedAt.slice(0, 10)}`; await mkdir(historyDir, { recursive: true }); await Bun.write(`${historyDir}/${result.id}.json`, JSON.stringify(result));
  await audit("ip_enrichment_and_notification", `ip:${ip}`, "success", { verdict, abuse_confidence_score: abuseipdb.abuseConfidenceScore, total_reports: abuseipdb.totalReports, channel });
  log("info", "enrichment_completed", "Completed IP enrichment and Slack delivery.", { ip, verdict, abuse_confidence_score: abuseipdb.abuseConfidenceScore, record_count: 1 }); response(200, result);
} catch (error) { log("error", "enrichment_failed", "IP enrichment failed unexpectedly.", { cause: error instanceof Error ? error.message : String(error) }); throw error; }
