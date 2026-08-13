Asks Claude to triage the message like a SOC analyst and return a structured verdict. Input comes from [VirusTotal enrichment](<../VirusTotal enrichment/README.md>).

Calls `POST {ANTHROPIC_BASE_URL}/messages` (`claude-sonnet-4-5`) through the Anthropic connector with the headers, plain-text body, attachment metadata, URLs, and the full VirusTotal enrichment as evidence.

The prompt in [script.ts](script.ts) requires JSON only:

```json
{ "risk_score": 1-100, "verdict": "benign|suspicious|likely_phishing|confirmed_malicious",
  "confidence": "low|medium|high", "summary": "...", "justification": ["..."],
  "techniques": ["..."], "recommended_actions": ["..."] }
```

The score is validated to be a number in 1–100; an unparseable or out-of-range response fails the step rather than passing a junk verdict to the case. Output is the input plus an `analysis` object (including the resolved model id).
