Parses the reported RFC 822 message and pulls out everything worth enriching. Input comes from [Simulate reported email](<../Simulate reported email/README.md>).

What it does in [script.ts](script.ts):

- unfolds headers and reads `From`, `Reply-To`, `Return-Path`, `Subject`, `Message-ID`, `X-Mailer`, `Authentication-Results` and the full `Received` chain
- collects public IPs from routing headers only, discarding private, loopback, link-local and CGNAT ranges
- extracts URLs from the body and derives hostnames, plus the sender/reply-to/return-path domains
- walks MIME parts, decodes each `Content-Disposition: attachment`, and computes SHA-256 and MD5

No external calls. Output is the original report plus `email` (normalized headers and plain-text body) and `iocs` (`ips`, `sender_addresses`, `domains`, `urls`, `attachments` with hashes and base64 content).
