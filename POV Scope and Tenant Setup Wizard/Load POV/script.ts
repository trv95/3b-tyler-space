const path = "/storage/pov_scoping/doc.json";
const file = Bun.file(path);
const body = (await file.exists()) ? await file.text() : JSON.stringify({ initialized: false });

process.stdout.write(
  [
    "HTTP/1.1 200 OK",
    "Content-Type: application/json",
    "Cache-Control: no-store",
    `Content-Length: ${Buffer.byteLength(body)}`,
    "",
    body,
  ].join("\r\n"),
);
