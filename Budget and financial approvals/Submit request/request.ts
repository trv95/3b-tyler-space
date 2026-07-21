// Shared types + normalization for the approval request payload.

export type RequestKind = "budget" | "capex" | "headcount";

export interface SubmitPayload {
  kind?: string;
  fields?: Record<string, unknown>;
}

export interface NormalizedRequest {
  kind: RequestKind;
  fields: Record<string, string>;
}

interface KindMeta {
  label: string;
  // type-specific field keys (order = display order)
  fieldKeys: string[];
  labels: Record<string, string>;
}

export const KIND_META: Record<RequestKind, KindMeta> = {
  budget: {
    label: "Budget Request",
    fieldKeys: ["department", "budget_period", "category"],
    labels: {
      department: "Department",
      budget_period: "Budget period",
      category: "Spend category",
    },
  },
  capex: {
    label: "Capex Request",
    fieldKeys: ["asset", "vendor", "useful_life_years", "funding_source"],
    labels: {
      asset: "Asset / item",
      vendor: "Vendor",
      useful_life_years: "Useful life (years)",
      funding_source: "Funding source",
    },
  },
  headcount: {
    label: "Headcount Request",
    fieldKeys: ["role_title", "department", "num_positions", "employment_type"],
    labels: {
      role_title: "Role title",
      department: "Department",
      num_positions: "Number of positions",
      employment_type: "Employment type",
    },
  },
};

const COMMON_REQUIRED = [
  "title",
  "requester_name",
  "requester_email",
  "amount",
  "needed_by",
  "priority",
  "justification",
];

export function normalizeRequest(
  payload: SubmitPayload,
): NormalizedRequest | { error: string } {
  const kind = payload.kind as RequestKind;
  if (!kind || !(kind in KIND_META)) {
    return { error: "Unknown or missing request type" };
  }
  const src = payload.fields ?? {};
  const fields: Record<string, string> = {};
  for (const [k, v] of Object.entries(src)) {
    fields[k] = v == null ? "" : String(v).trim();
  }

  const required = [...COMMON_REQUIRED, ...KIND_META[kind].fieldKeys];
  const missing = required.filter((k) => !fields[k]);
  if (missing.length) {
    return { error: `Missing required fields: ${missing.join(", ")}` };
  }

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(fields.requester_email)) {
    return { error: "Requester email is invalid" };
  }
  if (!(Number(fields.amount) > 0)) {
    return { error: "Amount must be greater than 0" };
  }

  return { kind, fields };
}

export function priorityFor(formPriority: string): string {
  const p = formPriority.toLowerCase();
  if (["critical", "high", "medium", "low", "info"].includes(p)) return p;
  return "medium";
}

export function currency(amount: string): string {
  const n = Number(amount);
  if (!isFinite(n)) return `$${amount}`;
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
}

export function fieldLabel(kind: RequestKind, key: string): string {
  return KIND_META[kind].labels[key] ?? key;
}

export function buildDescription(req: NormalizedRequest): string {
  const meta = KIND_META[req.kind];
  const f = req.fields;
  const lines: string[] = [
    `**${meta.label}** — submitted via the approvals form.`,
    "",
    `| Field | Value |`,
    `| --- | --- |`,
    `| Requester | ${f.requester_name} (${f.requester_email}) |`,
    `| Amount | ${currency(f.amount)} |`,
    `| Priority | ${f.priority} |`,
    `| Needed by | ${f.needed_by} |`,
  ];
  for (const k of meta.fieldKeys) {
    lines.push(`| ${meta.labels[k]} | ${f[k]} |`);
  }
  lines.push("", "**Business justification**", "", f.justification);
  return lines.join("\n");
}
