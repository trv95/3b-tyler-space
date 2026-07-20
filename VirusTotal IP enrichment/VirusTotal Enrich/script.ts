// POST /vt-enrich  { "ip": "8.8.8.8" }
// Looks up an IP address in VirusTotal (API v3) and returns a compact JSON summary.
// Auth (x-apikey) is injected by the connector proxy — no key in code.

type HttpResponse = { status: number; body: unknown };

function respond({ status, body }: HttpResponse): void {
  const payload = JSON.stringify(body);
  process.stdout.write(
    [
      `HTTP/1.1 ${status} ${status === 200 ? "OK" : "Error"}`,
      "Content-Type: application/json; charset=utf-8",
      `Content-Length: ${Buffer.byteLength(payload)}`,
      "",
      payload,
    ].join("\r\n"),
  );
}

// --- parse the incoming HTTP request body (RFC 7230) ---
function parseBody(raw: string): string {
  const sep = raw.indexOf("\r\n\r\n");
  return sep === -1 ? "" : raw.slice(sep + 4);
}

const IPV4 = /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/;
const IPV6 = /^(([0-9a-fA-F]{1,4}:){2,7}[0-9a-fA-F]{0,4}|::1|::)$/;

function isValidIp(ip: string): boolean {
  return IPV4.test(ip) || IPV6.test(ip);
}

async function main() {
  const raw = await Bun.stdin.text();
  let ip = "";
  try {
    const parsed = JSON.parse(parseBody(raw) || "{}");
    ip = String(parsed.ip ?? "").trim();
  } catch {
    return respond({ status: 400, body: { error: "Invalid JSON request body." } });
  }

  if (!ip) {
    return respond({ status: 400, body: { error: "Please provide an IP address." } });
  }
  if (!isValidIp(ip)) {
    return respond({ status: 400, body: { error: `"${ip}" is not a valid IPv4 or IPv6 address.` } });
  }

  let vtRes: Response;
  try {
    vtRes = await fetch(
      `https://www.virustotal.com/api/v3/ip_addresses/${encodeURIComponent(ip)}`,
      { headers: { accept: "application/json" } },
    );
  } catch (e) {
    console.error("VirusTotal request failed:", e);
    return respond({ status: 502, body: { error: "Could not reach VirusTotal. Please try again." } });
  }

  if (vtRes.status === 404) {
    return respond({ status: 404, body: { error: `No VirusTotal record found for ${ip}.` } });
  }
  if (vtRes.status === 401 || vtRes.status === 403) {
    return respond({ status: 502, body: { error: "VirusTotal authentication failed. Check the connector credentials." } });
  }
  if (vtRes.status === 429) {
    return respond({ status: 429, body: { error: "VirusTotal rate limit reached. Please wait and try again." } });
  }
  if (!vtRes.ok) {
    console.error("VirusTotal returned", vtRes.status);
    return respond({ status: 502, body: { error: `VirusTotal returned an error (HTTP ${vtRes.status}).` } });
  }

  let json: any;
  try {
    json = await vtRes.json();
  } catch {
    return respond({ status: 502, body: { error: "VirusTotal returned an unreadable response." } });
  }

  const a = json?.data?.attributes ?? {};
  const stats = a.last_analysis_stats ?? {};

  const summary = {
    ip,
    reputation: a.reputation ?? null,
    stats: {
      malicious: stats.malicious ?? 0,
      suspicious: stats.suspicious ?? 0,
      harmless: stats.harmless ?? 0,
      undetected: stats.undetected ?? 0,
      timeout: stats.timeout ?? 0,
    },
    votes: {
      harmless: a.total_votes?.harmless ?? 0,
      malicious: a.total_votes?.malicious ?? 0,
    },
    country: a.country ?? null,
    continent: a.continent ?? null,
    asn: a.asn ?? null,
    as_owner: a.as_owner ?? null,
    network: a.network ?? null,
    regional_internet_registry: a.regional_internet_registry ?? null,
    last_analysis_date: a.last_analysis_date
      ? new Date(a.last_analysis_date * 1000).toISOString()
      : null,
    last_modification_date: a.last_modification_date
      ? new Date(a.last_modification_date * 1000).toISOString()
      : null,
  };

  respond({ status: 200, body: summary });
}

main();
