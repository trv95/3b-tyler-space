// Enrich the CrowdStrike detection's indicators against VirusTotal API v3.
// The `virusTotal` connector injects auth automatically for requests to
// https://www.virustotal.com/api/v3/* — no API key handling in code.

const VT_BASE = "https://www.virustotal.com/api/v3";

type AnalysisStats = {
  harmless?: number;
  malicious?: number;
  suspicious?: number;
  undetected?: number;
  timeout?: number;
};

type Verdict = "malicious" | "suspicious" | "harmless" | "unknown" | "error";

type Enriched = {
  indicator: string;
  type: "file" | "domain" | "ip";
  verdict: Verdict;
  stats: AnalysisStats | null;
  permalink: string | null;
  error?: string;
};

function verdictFromStats(stats: AnalysisStats | null): Verdict {
  if (!stats) return "unknown";
  if ((stats.malicious ?? 0) > 0) return "malicious";
  if ((stats.suspicious ?? 0) > 0) return "suspicious";
  if ((stats.harmless ?? 0) > 0 || (stats.undetected ?? 0) > 0) return "harmless";
  return "unknown";
}

const RANK: Record<Verdict, number> = {
  malicious: 4,
  suspicious: 3,
  harmless: 2,
  unknown: 1,
  error: 0,
};

async function lookup(
  type: Enriched["type"],
  path: string,
  indicator: string,
  guiPath: string,
): Promise<Enriched> {
  try {
    const res = await fetch(`${VT_BASE}/${path}`, {
      headers: { accept: "application/json" },
    });
    if (!res.ok) {
      // 404 = VT has never seen this indicator; treat as unknown, not error.
      if (res.status === 404) {
        return {
          indicator,
          type,
          verdict: "unknown",
          stats: null,
          permalink: `https://www.virustotal.com/gui/${guiPath}`,
        };
      }
      return {
        indicator,
        type,
        verdict: "error",
        stats: null,
        permalink: null,
        error: `VT ${res.status}: ${(await res.text()).slice(0, 200)}`,
      };
    }
    const json: any = await res.json();
    const stats: AnalysisStats | null =
      json?.data?.attributes?.last_analysis_stats ?? null;
    return {
      indicator,
      type,
      verdict: verdictFromStats(stats),
      stats,
      permalink: `https://www.virustotal.com/gui/${guiPath}`,
    };
  } catch (err) {
    return {
      indicator,
      type,
      verdict: "error",
      stats: null,
      permalink: null,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

const raw = await Bun.stdin.text();
const detection = JSON.parse(raw);

const tasks: Promise<Enriched>[] = [];

if (detection.sha256) {
  tasks.push(
    lookup("file", `files/${detection.sha256}`, detection.sha256, `file/${detection.sha256}`),
  );
}
if (detection.domain) {
  tasks.push(
    lookup("domain", `domains/${detection.domain}`, detection.domain, `domain/${detection.domain}`),
  );
}
if (detection.external_ip) {
  tasks.push(
    lookup(
      "ip",
      `ip_addresses/${detection.external_ip}`,
      detection.external_ip,
      `ip-address/${detection.external_ip}`,
    ),
  );
}

const indicators = await Promise.all(tasks);

const worst_verdict = indicators
  .map((i) => i.verdict)
  .reduce<Verdict>((worst, v) => (RANK[v] > RANK[worst] ? v : worst), "unknown");

console.error(
  `Enriched ${indicators.length} indicator(s); worst verdict: ${worst_verdict}`,
);

console.log(
  JSON.stringify({
    ...detection,
    enrichment: {
      source: "virustotal",
      worst_verdict,
      indicators,
    },
  }),
);
