import Anthropic from "@anthropic-ai/sdk";
import { mkdir, readFile, writeFile } from "node:fs/promises";

const STATE_DIR = "/storage/email-briefing-state";
const STATE_PATH = `${STATE_DIR}/cursor.json`;
const SLACK_CHANNEL = "3b-demo";
const now = new Date();
const input = await Bun.stdin.text();
let force = false;
try { force = JSON.parse(input || "{}").force === true; } catch {}
const local = new Intl.DateTimeFormat("en-US", { timeZone: "America/Los_Angeles", hour: "numeric", hour12: false, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
const part = (type: string) => local.find(p => p.type === type)?.value || "";
if (!force && Number(part("hour")) !== 7) process.exit(0);
const localDate = `${part("year")}-${part("month")}-${part("day")}`;

let state: { lastSuccessfulAt?: string; lastLocalDate?: string } = {};
try { state = JSON.parse(await readFile(STATE_PATH, "utf8")); } catch {}
if (state.lastLocalDate === localDate) process.exit(0);
const since = state.lastSuccessfulAt ? new Date(state.lastSuccessfulAt) : new Date(now.getTime() - 24 * 60 * 60 * 1000);
const afterEpoch = Math.floor(since.getTime() / 1000);

async function api(url: string, init: RequestInit = {}) {
  const response = await fetch(url, init);
  if (!response.ok) throw new Error(`${init.method || "GET"} ${url}: ${response.status} ${await response.text()}`);
  return response.json();
}
const decode = (s = "") => Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
function textFromPayload(payload: any): string {
  if (payload?.mimeType === "text/plain" && payload.body?.data) return decode(payload.body.data);
  for (const p of payload?.parts || []) { const text = textFromPayload(p); if (text) return text; }
  if (payload?.body?.data) return decode(payload.body.data);
  return "";
}
function header(message: any, name: string) {
  return message.payload?.headers?.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || "";
}
const messages = [
  { id: "sample-1", from: "Maya Chen <maya@northstar.example>", email: "maya@northstar.example", subject: "Security review blocking signature", receivedAt: now.toISOString(), body: "Legal is ready to sign, but security needs the updated SOC 2 report and subprocessors list by noon today. Can you send both and join a 2 PM review?" },
  { id: "sample-2", from: "Jordan Lee <jordan@acme.example>", email: "jordan@acme.example", subject: "Revised rollout scope", receivedAt: now.toISOString(), body: "We want to add 400 users to phase one. Please confirm pricing and whether the April 15 launch date is still achievable." },
  { id: "sample-3", from: "Priya Shah <priya@globex.example>", email: "priya@globex.example", subject: "Demo follow-up questions", receivedAt: now.toISOString(), body: "The team liked the demo. Could you clarify SSO support and send a recording before Friday?" },
  { id: "sample-4", from: "Newsletter <news@industry.example>", email: "news@industry.example", subject: "This week in enterprise software", receivedAt: now.toISOString(), body: "Your weekly roundup of product launches, funding news, and industry events." }
];
const contacts: any[] = [
  { Id: "c1", Email: "maya@northstar.example", Name: "Maya Chen", AccountId: "a1", Account: { Name: "Northstar Health" } },
  { Id: "c2", Email: "jordan@acme.example", Name: "Jordan Lee", AccountId: "a2", Account: { Name: "Acme Corp" } },
  { Id: "c3", Email: "priya@globex.example", Name: "Priya Shah", AccountId: "a3", Account: { Name: "Globex" } }
];
const opportunities: any[] = [
  { Id: "o1", Name: "Northstar Enterprise", AccountId: "a1", Amount: 750000, StageName: "Negotiation/Review", CloseDate: "2026-10-15" },
  { Id: "o2", Name: "Acme Expansion", AccountId: "a2", Amount: 325000, StageName: "Proposal/Price Quote", CloseDate: "2026-11-01" },
  { Id: "o3", Name: "Globex Pilot", AccountId: "a3", Amount: 90000, StageName: "Discovery", CloseDate: "2026-12-15" }
];
const contactByEmail = new Map(contacts.map(c => [String(c.Email).toLowerCase(), c]));
const enriched = messages.map(m => {
  const contact = contactByEmail.get(m.email);
  const opps = contact ? opportunities.filter(o => o.AccountId === contact.AccountId) : [];
  const opportunityValue = opps.reduce((sum, o) => sum + (Number(o.Amount) || 0), 0);
  return { ...m, salesforce: contact ? { contact: contact.Name, account: contact.Account?.Name, opportunityValue, opportunities: opps.map(o => ({ name: o.Name, amount: o.Amount, stage: o.StageName, closeDate: o.CloseDate })) } : null };
}).sort((a, b) => (b.salesforce?.opportunityValue || 0) - (a.salesforce?.opportunityValue || 0));

let briefing: string;
if (!enriched.length) briefing = `*Daily email briefing — ${localDate}*\n_No new unread emails since the prior briefing._`;
else {
  const client = new Anthropic({ baseURL: process.env.ANTHROPIC_BASE_URL!.trim().replace(/\/v1\/?$/, ""), apiKey: "placeholder" });
  const stream = client.messages.stream({
    model: "claude-sonnet-5", max_tokens: 3000,
    system: "Create a concise Slack morning briefing. Stack-rank every email by importance, using linked open Salesforce opportunity value as the primary signal, then urgency and required action. Never invent facts. For each item include rank, sender, subject, a 1-2 sentence summary, required action, account, and open opportunity amount/stage when available. Clearly label emails with no Salesforce match. Use Slack mrkdwn and end with a short top-priorities section.",
    messages: [{ role: "user", content: JSON.stringify({ briefingDate: localDate, emails: enriched }) }]
  });
  const final = await stream.finalMessage();
  briefing = final.content.filter((c: any) => c.type === "text").map((c: any) => c.text).join("\n");
}

console.log(JSON.stringify({ status: "preview", date: localDate, emailCount: enriched.length, channel: SLACK_CHANNEL, briefing }));
