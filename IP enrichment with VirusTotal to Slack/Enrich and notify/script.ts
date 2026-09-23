import { isIP } from "node:net";
import { mkdir } from "node:fs/promises";

function response(status: number, body: unknown) {
  const payload = JSON.stringify(body);
  process.stdout.write(`HTTP/1.1 ${status} ${status === 200 ? "OK" : "Error"}\r\nContent-Type: application/json; charset=utf-8\r\nContent-Length: ${Buffer.byteLength(payload)}\r\nCache-Control: no-store\r\n\r\n${payload}`);
}

function parseRequest(raw: string) {
  const separator = raw.indexOf("\r\n\r\n");
  if (separator < 0) throw new Error("Malformed HTTP request.");
  const requestLine = raw.slice(0, raw.indexOf("\r\n"));
  const method = requestLine.split(" ")[0];
  return { method, body: raw.slice(separator + 4) };
}

function isPublicIp(ip: string) {
  if (isIP(ip) === 4) {
    const [a, b] = ip.split(".").map(Number);
    return !(a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224);
  }
  const normalized = ip.toLowerCase();
  return isIP(ip) === 6 && normalized !== "::" && normalized !== "::1" && !normalized.startsWith("fe80:") && !normalized.startsWith("fc") && !normalized.startsWith("fd") && !normalized.startsWith("ff");
}

try {
  const request = parseRequest(await Bun.stdin.text());
  if (request.method !== "POST") {
    response(405, { error: "Only POST requests are supported." });
    process.exit(0);
  }

  let input: unknown;
  try { input = JSON.parse(request.body); } catch { input = null; }
  const ip = typeof (input as any)?.ip === "string" ? (input as any).ip.trim() : "";
  const channel = "C0BKQMP3LSU";

  if (!isIP(ip)) {
    response(400, { error: "Enter a valid IPv4 or IPv6 address." });
    process.exit(0);
  }
  if (!isPublicIp(ip)) {
    response(400, { error: "Private, reserved, multicast, and loopback addresses cannot be enriched." });
    process.exit(0);
  }
  if (!/^[A-Z0-9]{8,20}$/.test(channel)) {
    response(400, { error: "Enter a valid Slack channel ID, such as C0123456789." });
    process.exit(0);
  }

  const vtResponse = await fetch(`https://www.virustotal.com/api/v3/ip_addresses/${encodeURIComponent(ip)}`, { signal: AbortSignal.timeout(12000) });
  if (!vtResponse.ok) {
    const requestId = vtResponse.headers.get("x-request-id");
    console.error(JSON.stringify({ service: "virustotal", status: vtResponse.status, requestId }));
    response(vtResponse.status === 404 ? 404 : 502, { error: vtResponse.status === 404 ? "VirusTotal has no report for this IP address." : "VirusTotal could not complete the enrichment." });
    process.exit(0);
  }

  const vt = await vtResponse.json() as any;
  const attributes = vt?.data?.attributes ?? {};
  const stats = attributes.last_analysis_stats ?? {};
  const analysis = {
    malicious: Number(stats.malicious ?? 0),
    suspicious: Number(stats.suspicious ?? 0),
    harmless: Number(stats.harmless ?? 0),
    undetected: Number(stats.undetected ?? 0),
  };
  const verdict = analysis.malicious > 0 ? "malicious" : analysis.suspicious > 0 ? "suspicious" : "no detections";
  const reportUrl = `https://www.virustotal.com/gui/ip-address/${encodeURIComponent(ip)}`;
  const country = attributes.country || null;
  const network = attributes.network || null;
  const asOwner = attributes.as_owner || null;
  const context = [country && `Country: ${country}`, network && `Network: ${network}`, asOwner && `AS owner: ${asOwner}`].filter(Boolean).join("  •  ") || "No network context reported";
  const text = `VirusTotal IP enrichment: ${ip} — ${verdict}`;

  const slackResponse = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      channel,
      text,
      unfurl_links: false,
      blocks: [
        { type: "header", text: { type: "plain_text", text: `IP enrichment · ${ip}` } },
        { type: "section", fields: [
          { type: "mrkdwn", text: `*Verdict*\n${verdict === "malicious" ? "🔴" : verdict === "suspicious" ? "🟠" : "🟢"} ${verdict}` },
          { type: "mrkdwn", text: `*Detections*\n${analysis.malicious} malicious · ${analysis.suspicious} suspicious` },
        ] },
        { type: "section", text: { type: "mrkdwn", text: `*Network context*\n${context}` } },
        { type: "context", elements: [{ type: "mrkdwn", text: `<${reportUrl}|Open full report in VirusTotal> · ${analysis.harmless} harmless · ${analysis.undetected} undetected` }] },
      ],
    }),
    signal: AbortSignal.timeout(12000),
  });
  const slack = await slackResponse.json() as any;
  if (!slackResponse.ok || !slack.ok) {
    console.error(JSON.stringify({ service: "slack", status: slackResponse.status, error: slack.error }));
    response(502, { error: `Slack could not deliver the message${slack.error ? `: ${slack.error}` : "."}` });
    process.exit(0);
  }

  const result = { id: crypto.randomUUID(), enrichedAt: new Date().toISOString(), ip, verdict, country, network, asOwner, analysis, reportUrl, slack: { channel: slack.channel, timestamp: slack.ts } };
  const day = result.enrichedAt.slice(0, 10);
  const historyDir = `/storage/ip-enrichment-history/${day}`;
  await mkdir(historyDir, { recursive: true });
  await Bun.write(`${historyDir}/${result.id}.json`, JSON.stringify(result));

  response(200, result);
} catch (error) {
  console.error(error instanceof Error ? error.stack : String(error));
  throw error;
}
