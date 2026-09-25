Builds a synthetic phishing email and hands it to the pipeline, so the whole investigation can be exercised on demand without waiting for a real report.

Triggered manually — hit **Run** on this step.

The generated RFC 822 message models a vendor-payment lure with safe, reserved training indicators:

- vendor-payment sender and reply-to addresses under `.example`
- SPF, DKIM, and DMARC failures in `Authentication-Results`
- three TEST-NET IPs across `Received` and `X-Originating-IP`
- a lookalike vendor-portal URL under `.example`
- two harmless base64 attachments: a remittance text file and a training HTML page with no credential collection

Nothing is sent anywhere; the message only exists as JSON on stdout:

```json
{ "simulation": true, "reported_at": "...", "report_inbox": "...", "reported_by": "...", "raw_email": "<RFC 822>" }
```

Edit the message in [script.ts](script.ts) to test other scenarios. Downstream: [Extract IOCs](<../Extract IOCs/README.md>).
