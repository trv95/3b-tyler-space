const payload = JSON.parse(await Bun.stdin.text());
const { email, iocs, virustotal } = payload;

const evidence = {
  headers: {
    subject: email.subject,
    from: email.from,
    from_display_name: email.from_display_name,
    reply_to: email.reply_to,
    return_path: email.return_path,
    to: email.to,
    x_mailer: email.x_mailer,
    authentication_results: email.authentication_results,
    received_chain: email.received_chain,
  },
  body_text: email.body_text,
  attachments: iocs.attachments.map((a: any) => ({
    filename: a.filename,
    content_type: a.content_type,
    size_bytes: a.size_bytes,
    sha256: a.sha256,
  })),
  urls: iocs.urls,
  virustotal: virustotal.results,
  virustotal_summary: virustotal.summary,
};

const system = `You are a senior SOC analyst triaging a user-reported email in a phishing report inbox.
Assess the message body, headers, sender, URLs, and attachments together with the VirusTotal enrichment provided.

Score risk from 1 to 100, where 1 is certainly benign and 100 is a confirmed malicious credential-phishing or
malware delivery attempt. Weigh VirusTotal detections heavily, but do not treat "not found in VirusTotal" as
benign — newly registered infrastructure is common in phishing. Also weigh authentication results (SPF/DKIM/DMARC),
sender/reply-to mismatch, display-name impersonation, urgency and fear pressure, credential-harvesting intent,
and instructions to bypass the helpdesk.

Reply with JSON only, no markdown fence, matching exactly:
{
  "risk_score": <integer 1-100>,
  "verdict": "<one of: benign, suspicious, likely_phishing, confirmed_malicious>",
  "confidence": "<low|medium|high>",
  "summary": "<2-3 sentence plain-language summary of what this email is and what it tries to do>",
  "justification": ["<specific evidence-backed reason>", "..."],
  "techniques": ["<social engineering / delivery technique observed>", "..."],
  "recommended_actions": ["<concrete containment or response action>", "..."]
}`;

const response = await fetch(`${process.env.ANTHROPIC_BASE_URL}/messages`, {
  method: "POST",
  headers: {
    "content-type": "application/json",
    "x-api-key": "placeholder",
    "anthropic-version": "2023-06-01",
  },
  body: JSON.stringify({
    model: "claude-sonnet-4-5",
    max_tokens: 2000,
    system,
    messages: [
      {
        role: "user",
        content: `Reported by ${payload.reported_by} to ${payload.report_inbox}.\n\nEvidence:\n${JSON.stringify(evidence, null, 2)}`,
      },
    ],
  }),
});

if (!response.ok) {
  throw new Error(`Anthropic request failed: ${response.status} ${await response.text()}`);
}

const body = await response.json();
const text = body.content
  .filter((block: any) => block.type === "text")
  .map((block: any) => block.text)
  .join("")
  .trim();

const json = text.replace(/^```(?:json)?\s*/i, "").replace(/```$/, "").trim();
const analysis = JSON.parse(json);

if (typeof analysis.risk_score !== "number" || analysis.risk_score < 1 || analysis.risk_score > 100) {
  throw new Error(`Model returned an invalid risk_score: ${JSON.stringify(analysis.risk_score)}`);
}

console.error(`Risk score ${analysis.risk_score} (${analysis.verdict}, confidence ${analysis.confidence})`);
console.log(JSON.stringify({ ...payload, analysis: { ...analysis, model: body.model, analyzed_at: new Date().toISOString() } }));
