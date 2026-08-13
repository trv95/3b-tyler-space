Builds a synthetic phishing email and hands it to the pipeline, so the whole investigation can be exercised on demand without waiting for a real report.

Triggered manually — hit **Run** on this step.

The generated RFC 822 message deliberately contains realistic triage material:

- spoofed `From` (`it-servicedesk@account-sec-review.com`) with an unrelated `Reply-To` and `Return-Path`
- failing SPF/DKIM/DMARC in `Authentication-Results`
- three public IPs across `Received` and `X-Originating-IP`
- two URLs — one known-bad (`malware.wicar.org`) and one lookalike Microsoft login host
- two attachments — a `.doc` whose bytes are the EICAR test string (so VirusTotal returns real detections) and a credential-harvesting HTML form

Nothing is sent anywhere; the message only exists as JSON on stdout:

```json
{ "simulation": true, "reported_at": "...", "report_inbox": "...", "reported_by": "...", "raw_email": "<RFC 822>" }
```

Edit the message in [script.ts](script.ts) to test other scenarios. Downstream: [Extract IOCs](<../Extract IOCs/README.md>).
