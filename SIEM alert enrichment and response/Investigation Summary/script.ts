// Uses Claude to produce an analyst-ready investigative summary.
const data = JSON.parse(await Bun.stdin.text());

const prompt = `You are a SOC analyst. Write a concise, investigative summary of the following SIEM alert and its enrichment. Use markdown with these sections: "What happened", "Why it matters", "Key indicators" (bullet list), and "Recommended next steps" (numbered). Be specific and reference the VirusTotal verdict and any related Databricks log activity. Keep it under 250 words.

DATA:
${JSON.stringify(data, null, 2)}`;

const res = await fetch("https://api.anthropic.com/v1/messages", {
  method: "POST",
  headers: {
    "content-type": "application/json",
    "anthropic-version": "2023-06-01",
  },
  body: JSON.stringify({
    model: "claude-sonnet-4-5",
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  }),
});

if (!res.ok) {
  console.error(`Anthropic ${res.status}: ${await res.text()}`);
  process.exit(1);
}

const out = (await res.json()) as any;
const summary = (out.content ?? [])
  .filter((b: any) => b.type === "text")
  .map((b: any) => b.text)
  .join("\n")
  .trim();

console.log(JSON.stringify({ ...data, summary }));
