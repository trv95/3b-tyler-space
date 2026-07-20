export interface Enrichment {
  ip: string;
  reputation: number | null;
  stats: {
    malicious: number;
    suspicious: number;
    harmless: number;
    undetected: number;
    timeout: number;
  };
  votes: { harmless: number; malicious: number };
  country: string | null;
  continent: string | null;
  asn: number | null;
  as_owner: string | null;
  network: string | null;
  regional_internet_registry: string | null;
  last_analysis_date: string | null;
  last_modification_date: string | null;
}

export type Verdict = "malicious" | "suspicious" | "clean" | "unknown";

export function verdictOf(e: Enrichment): Verdict {
  if (e.stats.malicious > 0) return "malicious";
  if (e.stats.suspicious > 0) return "suspicious";
  const total = e.stats.malicious + e.stats.suspicious + e.stats.harmless + e.stats.undetected;
  if (total === 0) return "unknown";
  return "clean";
}

export function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit",
  });
}

const FLAGS: Record<string, string> = {};
export function flag(cc: string | null): string {
  if (!cc || cc.length !== 2) return "";
  if (FLAGS[cc]) return FLAGS[cc];
  const f = String.fromCodePoint(...[...cc.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
  FLAGS[cc] = f;
  return f;
}
