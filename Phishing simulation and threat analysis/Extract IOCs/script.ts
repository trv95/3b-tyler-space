import { createHash } from "node:crypto";

type Report = {
  simulation: boolean;
  reported_at: string;
  report_inbox: string;
  reported_by: string;
  raw_email: string;
};

const report: Report = JSON.parse(await Bun.stdin.text());
const raw = report.raw_email.replace(/\r\n/g, "\n");

const splitIndex = raw.indexOf("\n\n");
const headerBlock = splitIndex === -1 ? raw : raw.slice(0, splitIndex);
const body = splitIndex === -1 ? "" : raw.slice(splitIndex + 2);

const headers: { name: string; value: string }[] = [];
for (const line of headerBlock.split("\n")) {
  if (/^[ \t]/.test(line) && headers.length > 0) {
    headers[headers.length - 1].value += " " + line.trim();
    continue;
  }
  const match = line.match(/^([A-Za-z0-9-]+):\s*(.*)$/);
  if (match) headers.push({ name: match[1], value: match[2] });
}

const header = (name: string) =>
  headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? "";
const allHeaders = (name: string) =>
  headers.filter((h) => h.name.toLowerCase() === name.toLowerCase()).map((h) => h.value);

const isPublicIp = (ip: string) => {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p) || p < 0 || p > 255)) return false;
  const [a, b] = parts;
  if (a === 10 || a === 127 || a === 0 || a >= 224) return false;
  if (a === 192 && b === 168) return false;
  if (a === 172 && b >= 16 && b <= 31) return false;
  if (a === 169 && b === 254) return false;
  if (a === 100 && b >= 64 && b <= 127) return false;
  return true;
};

const ipSources = new Map<string, string[]>();
for (const h of headers) {
  if (!/^(received|x-originating-ip|x-sender-ip|authentication-results|x-forwarded-for)$/i.test(h.name)) continue;
  for (const ip of h.value.match(/\b\d{1,3}(?:\.\d{1,3}){3}\b/g) ?? []) {
    if (!isPublicIp(ip)) continue;
    const list = ipSources.get(ip) ?? [];
    if (!list.includes(h.name)) list.push(h.name);
    ipSources.set(ip, list);
  }
}

const addressOf = (value: string) => (value.match(/<([^>]+)>/)?.[1] ?? value).trim().toLowerCase();
const fromAddress = addressOf(header("From"));
const replyTo = header("Reply-To") ? addressOf(header("Reply-To")) : "";
const returnPath = header("Return-Path") ? addressOf(header("Return-Path")) : "";
const displayName = header("From").match(/^"?([^"<]+?)"?\s*</)?.[1]?.trim() ?? "";

const urls = new Set<string>();
for (const url of body.match(/https?:\/\/[^\s"'<>()\]]+/gi) ?? []) {
  urls.add(url.replace(/[.,;:)]+$/, ""));
}

const parts: { filename: string; contentType: string; bytes: Buffer }[] = [];
const boundary = header("Content-Type").match(/boundary="?([^";]+)"?/i)?.[1];
if (boundary) {
  for (const chunk of body.split(`--${boundary}`)) {
    const idx = chunk.indexOf("\n\n");
    if (idx === -1) continue;
    const partHeaders = chunk.slice(0, idx);
    if (!/Content-Disposition:\s*attachment/i.test(partHeaders)) continue;
    const filename =
      partHeaders.match(/filename="?([^";\n]+)"?/i)?.[1] ??
      partHeaders.match(/name="?([^";\n]+)"?/i)?.[1] ??
      "unnamed";
    const contentType = partHeaders.match(/Content-Type:\s*([^;\n]+)/i)?.[1]?.trim() ?? "application/octet-stream";
    const encoded = chunk.slice(idx + 2).trim();
    const bytes = /Content-Transfer-Encoding:\s*base64/i.test(partHeaders)
      ? Buffer.from(encoded, "base64")
      : Buffer.from(encoded, "utf8");
    parts.push({ filename: filename.trim(), contentType, bytes });
  }
}

const attachments = parts.map((p) => ({
  filename: p.filename,
  content_type: p.contentType,
  size_bytes: p.bytes.length,
  sha256: createHash("sha256").update(p.bytes).digest("hex"),
  md5: createHash("md5").update(p.bytes).digest("hex"),
  content_base64: p.bytes.toString("base64"),
}));

const domainOf = (value: string) => value.split("@").pop()?.split(/[/:]/)[0]?.toLowerCase() ?? "";
const domains = new Set<string>();
for (const value of [fromAddress, replyTo, returnPath]) if (value) domains.add(domainOf(value));
for (const url of urls) {
  try {
    domains.add(new URL(url).hostname.toLowerCase());
  } catch {}
}

const textBody = body
  .split(`--${boundary ?? "\u0000"}`)
  .find((c) => /Content-Type:\s*text\/plain/i.test(c))
  ?.split("\n\n")
  .slice(1)
  .join("\n\n")
  .trim();

const output = {
  ...report,
  email: {
    subject: header("Subject"),
    from: fromAddress,
    from_display_name: displayName,
    to: header("To"),
    reply_to: replyTo,
    return_path: returnPath,
    date: header("Date"),
    message_id: header("Message-ID"),
    x_mailer: header("X-Mailer"),
    received_chain: allHeaders("Received"),
    authentication_results: header("Authentication-Results"),
    body_text: textBody ?? body.slice(0, 4000),
  },
  iocs: {
    ips: [...ipSources].map(([ip, found_in]) => ({ ip, found_in })),
    sender_addresses: [fromAddress, replyTo, returnPath].filter(Boolean),
    domains: [...domains].filter(Boolean),
    urls: [...urls],
    attachments,
  },
};

console.error(
  `Extracted ${output.iocs.ips.length} IPs, ${output.iocs.urls.length} URLs, ${output.iocs.domains.length} domains, ${attachments.length} attachments`,
);
console.log(JSON.stringify(output));
