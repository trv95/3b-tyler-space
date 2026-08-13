const CACHE = "/storage/tines_case_cache/cases.json";

const file = Bun.file(CACHE);

if (!(await file.exists())) {
  const body = JSON.stringify({
    error: "cache_empty",
    message:
      "No case snapshot has been built yet. Trigger the Refresh case cache step (POST /tines-case-refresh) and try again.",
  });
  process.stdout.write(
    [
      "HTTP/1.1 503 Service Unavailable",
      "Content-Type: application/json",
      `Content-Length: ${Buffer.byteLength(body)}`,
      "",
      body,
    ].join("\r\n"),
  );
  process.exit(0);
}

process.stdout.write(
  [
    "HTTP/1.1 200 OK",
    "Content-Type: application/json",
    "Cache-Control: no-store",
    `Content-Length: ${file.size}`,
    "",
    "",
  ].join("\r\n"),
);

for await (const chunk of file.stream()) {
  process.stdout.write(chunk);
}
