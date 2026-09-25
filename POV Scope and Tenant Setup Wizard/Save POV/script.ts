const raw = await Bun.stdin.text();
const sep = raw.indexOf("\r\n\r\n");
const body = sep === -1 ? "" : raw.slice(sep + 4);

const doc = JSON.parse(body);
doc.updatedAt = new Date().toISOString();

await Bun.write("/storage/pov_scoping/doc.json", JSON.stringify(doc, null, 2));

const res = JSON.stringify({ ok: true, updatedAt: doc.updatedAt });
process.stdout.write(
  [
    "HTTP/1.1 200 OK",
    "Content-Type: application/json",
    `Content-Length: ${Buffer.byteLength(res)}`,
    "",
    res,
  ].join("\r\n"),
);
