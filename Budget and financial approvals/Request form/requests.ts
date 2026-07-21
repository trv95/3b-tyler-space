export type RequestKind = "budget" | "capex" | "headcount";

export type FieldType = "text" | "textarea" | "number" | "money" | "date" | "select";

export interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  options?: string[];
  required?: boolean;
  full?: boolean; // span full width in the grid
  hint?: string;
}

export interface KindDef {
  kind: RequestKind;
  numeral: string;
  title: string;
  tagline: string;
  description: string;
  fields: FieldDef[];
}

// Fields shared by every request type.
export const COMMON_FIELDS: FieldDef[] = [
  { key: "title", label: "Request title", type: "text", required: true, full: true, placeholder: "Short summary of what you're requesting" },
  { key: "requester_name", label: "Requester", type: "text", required: true, placeholder: "Full name" },
  { key: "requester_email", label: "Email", type: "text", required: true, placeholder: "name@company.com" },
  { key: "amount", label: "Amount requested", type: "money", required: true, placeholder: "0.00" },
  { key: "needed_by", label: "Needed by", type: "date", required: true },
  {
    key: "priority",
    label: "Priority",
    type: "select",
    required: true,
    options: ["Critical", "High", "Medium", "Low"],
  },
];

export const KINDS: KindDef[] = [
  {
    kind: "budget",
    numeral: "01",
    title: "Budget",
    tagline: "Operating spend",
    description: "New or increased operating budget for a team or program.",
    fields: [
      { key: "department", label: "Department", type: "text", required: true, placeholder: "e.g. Marketing" },
      {
        key: "budget_period",
        label: "Budget period",
        type: "select",
        required: true,
        options: ["Q1", "Q2", "Q3", "Q4", "Full year"],
      },
      {
        key: "category",
        label: "Spend category",
        type: "select",
        required: true,
        options: ["Software & tools", "Marketing & events", "Professional services", "Travel", "Facilities", "Other"],
      },
    ],
  },
  {
    kind: "capex",
    numeral: "02",
    title: "Capital expenditure",
    tagline: "Assets & equipment",
    description: "Purchase of a long-lived asset or capitalizable equipment.",
    fields: [
      { key: "asset", label: "Asset / item", type: "text", required: true, placeholder: "What is being purchased" },
      { key: "vendor", label: "Vendor", type: "text", required: true, placeholder: "Supplier name" },
      { key: "useful_life_years", label: "Useful life (years)", type: "number", required: true, placeholder: "e.g. 5" },
      {
        key: "funding_source",
        label: "Funding source",
        type: "select",
        required: true,
        options: ["Approved capital plan", "New request", "Reallocation"],
      },
    ],
  },
  {
    kind: "headcount",
    numeral: "03",
    title: "Headcount",
    tagline: "New hires",
    description: "Approval to open one or more new positions.",
    fields: [
      { key: "role_title", label: "Role title", type: "text", required: true, placeholder: "e.g. Senior Analyst" },
      { key: "department", label: "Department", type: "text", required: true, placeholder: "e.g. Finance" },
      { key: "num_positions", label: "Number of positions", type: "number", required: true, placeholder: "e.g. 2" },
      {
        key: "employment_type",
        label: "Employment type",
        type: "select",
        required: true,
        options: ["Full-time", "Part-time", "Contract", "Intern"],
      },
    ],
  },
];

export const JUSTIFICATION_FIELD: FieldDef = {
  key: "justification",
  label: "Business justification",
  type: "textarea",
  required: true,
  full: true,
  placeholder: "Explain why this request is needed and the expected impact.",
};

export function kindDef(kind: RequestKind): KindDef {
  return KINDS.find((k) => k.kind === kind)!;
}
