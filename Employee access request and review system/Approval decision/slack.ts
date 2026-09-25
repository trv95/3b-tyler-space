export const FALLBACK_CHANNEL = "3b-demo";

async function slack(method: string, payload: unknown): Promise<any> {
  const response = await fetch(`https://slack.com/api/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({ ok: false, error: "invalid_json" }));
  return data;
}

export async function resolveDm(email: string): Promise<string | null> {
  const response = await fetch(
    `https://slack.com/api/users.lookupByEmail?email=${encodeURIComponent(email)}`,
  );
  const data = await response.json().catch(() => ({ ok: false }));
  return data.ok ? data.user.id : null;
}

export async function postMessage(channel: string, text: string, blocks?: unknown[]) {
  const data = await slack("chat.postMessage", { channel, text, blocks });
  if (!data.ok) throw new Error(`Slack chat.postMessage failed for ${channel}: ${data.error}`);
  return data as { channel: string; ts: string };
}
