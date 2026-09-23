import { readdir } from "node:fs/promises";

function response(status: number, body: unknown) {
  const payload = JSON.stringify(body);
  process.stdout.write(`HTTP/1.1 ${status} ${status === 200 ? "OK" : "Error"}\r\nContent-Type: application/json; charset=utf-8\r\nContent-Length: ${Buffer.byteLength(payload)}\r\nCache-Control: no-store\r\n\r\n${payload}`);
}

try {
  const raw = await Bun.stdin.text();
  const method = raw.slice(0, raw.indexOf(" "));
  if (method !== "GET") {
    response(405, { error: "Only GET requests are supported." });
    process.exit(0);
  }

  const root = "/storage/ip-enrichment-history";
  const items: any[] = [];
  let days: string[] = [];
  try { days = await readdir(root); } catch (error: any) {
    if (error?.code !== "ENOENT") throw error;
  }

  for (const day of days.sort().reverse()) {
    let files: string[] = [];
    try { files = await readdir(`${root}/${day}`); } catch { continue; }
    for (const file of files.filter((name) => name.endsWith(".json"))) {
      try { items.push(await Bun.file(`${root}/${day}/${file}`).json()); } catch { /* Ignore incomplete legacy records. */ }
    }
  }

  items.sort((a, b) => String(b.enrichedAt).localeCompare(String(a.enrichedAt)));
  response(200, { items, total: items.length });
} catch (error) {
  console.error(error instanceof Error ? error.stack : String(error));
  throw error;
}
