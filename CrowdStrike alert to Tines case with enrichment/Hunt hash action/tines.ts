// The Tines connector's TINES_URL is stored with a duplicated scheme and a "www." prefix that
// doesn't resolve, so derive candidate hosts rather than trusting the value verbatim.
function candidateBases(): string[] {
  const host = (process.env.TINES_URL ?? "").replace(/^(https?:\/\/)+/, "").replace(/\/+$/, "");
  if (!host) throw new Error("TINES_URL is not set");
  const hosts = [host];
  if (host.startsWith("www.") && host.split(".").length > 3) hosts.push(host.slice(4));
  return hosts.map((h) => `https://${h}`);
}

let resolved: string | undefined;

export async function tines(path: string, init: RequestInit = {}): Promise<Response> {
  const bases = resolved ? [resolved] : candidateBases();
  let lastError = "";
  for (const base of bases) {
    let response: Response;
    try {
      response = await fetch(`${base}${path}`, {
        ...init,
        headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
      });
    } catch (error) {
      lastError = `${base}: ${String(error)}`;
      continue;
    }
    resolved = base;
    if (!response.ok) {
      throw new Error(`Tines ${init.method ?? "GET"} ${path} failed: ${response.status} ${await response.text()}`);
    }
    return response;
  }
  throw new Error(`Could not reach the Tines API. ${lastError}`);
}
