// Emits a simulated Panther SIEM alert for downstream enrichment.
const now = new Date();

const alert = {
  alert: {
    id: `PANTHER-${now.getFullYear()}-${Math.floor(Math.random() * 900000 + 100000)}`,
    source: "Panther",
    rule: "Impossible Travel — Suspicious Login",
    title: "Suspicious login for sberniard from known-malicious IP",
    severity: "HIGH",
    detectedAt: now.toISOString(),
    affectedUser: "sberniard",
    affectedUserEmail: "sberniard@tines.io",
    sourceIp: "185.220.101.47", // Tor exit node used as a demo indicator
    geo: { city: "Frankfurt", country: "DE" },
    context: {
      eventType: "aws.console.login",
      priorLoginLocation: "San Francisco, US",
      mfaUsed: false,
      userAgent: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36",
    },
    description:
      "User sberniard authenticated from 185.220.101.47 (Frankfurt, DE) ~40 minutes after a session originating in San Francisco, US. MFA was not satisfied. Flagged as impossible travel.",
  },
};

console.log(JSON.stringify(alert));
