const boundary = "----=_Part_20260901_vendorportal";

const htmlBody = `<html><body>
<p>Hello Accounts Payable Team,</p>
<p>Your vendor banking profile is due for its quarterly review. A payment to <b>Northstar Medical Supplies</b> is currently on hold until the attached remittance confirmation is reviewed.</p>
<p><a href="https://vendor-portal.example.com/review?id=NS-48271">Review vendor payment</a></p>
<p>The review must be completed by <b>5:00 PM today</b> to prevent the payment from moving to the next processing cycle. If you were not expecting this request, contact the vendor through a known phone number rather than replying to this message.</p>
<p>Regards,<br>Vendor Payments Operations<br>Northstar Medical Supplies</p>
</body></html>`;

const textBody = htmlBody
  .replace(/<[^>]+>/g, "")
  .replace(/&mdash;/g, "-")
  .replace(/&amp;/g, "&")
  .replace(/\n{3,}/g, "\n\n")
  .trim();

const attachmentText = [
  "NORTHSTAR MEDICAL SUPPLIES",
  "Remittance confirmation - reference NS-48271",
  "",
  "This synthetic training attachment contains no macros, links, or executable content.",
  "Please verify payment-change requests using an independent contact method.",
].join("\n");

const attachmentHtml = `<html><body><h2>Vendor payment review</h2><p>Training simulation: no credentials are requested or collected.</p><p>Verify this request through an approved vendor contact.</p></body></html>`;

const raw = [
  "Return-Path: <notifications@northstar-payments.example>",
  "Received: from relay.vendor-portal.example (unknown [198.51.100.42])",
  "\tby mx01.bannerhealth.example (Postfix) with ESMTPS id 7C2D9A4E11",
  "\tfor <ap.rivera@bannerhealth.example>; Tue, 01 Sep 2026 13:25:28 -0700 (PDT)",
  "Received: from smtp-out.example (unknown [203.0.113.77])",
  "\tby relay.vendor-portal.example with SMTP id 61b8f3d2;",
  "\tTue, 01 Sep 2026 20:25:14 +0000 (UTC)",
  "Authentication-Results: mx01.bannerhealth.example;",
  "\tspf=softfail (sender IP is 198.51.100.42) smtp.mailfrom=northstar-payments.example;",
  "\tdkim=fail header.d=northstar-payments.example; dmarc=fail action=quarantine header.from=northstar-payments.example",
  "From: \"Northstar Vendor Payments\" <notifications@northstar-payments.example>",
  "Reply-To: <vendor-updates@northstar-payments.example>",
  "To: ap.rivera@bannerhealth.example",
  "Subject: Payment on hold: review vendor banking profile NS-48271",
  "Date: Tue, 01 Sep 2026 20:25:12 +0000",
  "Message-ID: <ns-48271-20260901-7f1c@northstar-payments.example>",
  "X-Originating-IP: [192.0.2.146]",
  "X-Mailer: Vendor Notification Service 2.4",
  "MIME-Version: 1.0",
  `Content-Type: multipart/mixed; boundary="${boundary}"`,
  "",
  `--${boundary}`,
  "Content-Type: text/plain; charset=UTF-8",
  "Content-Transfer-Encoding: 7bit",
  "",
  textBody,
  "",
  `--${boundary}`,
  "Content-Type: text/html; charset=UTF-8",
  "Content-Transfer-Encoding: 7bit",
  "",
  htmlBody,
  "",
  `--${boundary}`,
  "Content-Type: text/plain; name=\"Remittance_Confirmation_NS-48271.txt\"",
  "Content-Transfer-Encoding: base64",
  "Content-Disposition: attachment; filename=\"Remittance_Confirmation_NS-48271.txt\"",
  "",
  Buffer.from(attachmentText).toString("base64"),
  "",
  `--${boundary}`,
  "Content-Type: text/html; name=\"Payment_Review.html\"",
  "Content-Transfer-Encoding: base64",
  "Content-Disposition: attachment; filename=\"Payment_Review.html\"",
  "",
  Buffer.from(attachmentHtml).toString("base64"),
  "",
  `--${boundary}--`,
  "",
].join("\r\n");

const report = {
  simulation: true,
  reported_at: new Date().toISOString(),
  report_inbox: "reportphishing@bannerhealth.example",
  reported_by: "ap.rivera@bannerhealth.example",
  raw_email: raw,
};

console.error(`Generated synthetic vendor-payment report (${raw.length} bytes of RFC 822)`);
console.log(JSON.stringify(report));
