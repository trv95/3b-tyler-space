export type Person = { name: string; email: string | null };

export type CaseRecord = {
  id: number;
  name: string;
  url: string | null;
  status: string;
  subStatus: string | null;
  priority: string;
  team: string;
  teamId: number | null;
  author: Person | null;
  assignees: Person[];
  tags: string[];
  techniques: string[];
  tactics: string[];
  otherLabels: string[];
  openedAt: string | null;
  resolvedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  resolutionHours: number | null;
  slaExceeded: boolean;
  slaWarning: boolean;
  slaTypes: string[];
  taskCount: number;
  openTaskCount: number;
  linkedCaseCount: number;
  metadataKeys: string[];
};

export type Snapshot = {
  fetchedAt: string;
  tenant: string;
  caseCount: number;
  pagesFetched: number;
  cases: CaseRecord[];
};

export const PRIORITIES = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO", "UNSET"] as const;

export const PRIORITY_COLORS: Record<string, string> = {
  CRITICAL: "#E14F4C",
  HIGH: "#F47E3F",
  MEDIUM: "#E49307",
  LOW: "#4E8FD0",
  INFO: "#04B9AD",
  UNSET: "#8D75E6",
};

export const SERIES_COLORS = [
  "#8D75E6",
  "#04B9AD",
  "#25A871",
  "#F47E3F",
  "#E269A4",
  "#4E8FD0",
  "#A990F5",
  "#E49307",
  "#35BD9F",
  "#E14F4C",
];

export const UNASSIGNED = "Unassigned";
export const NO_TACTIC = "Untagged";
