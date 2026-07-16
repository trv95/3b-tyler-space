import { readRequest, json, openDb } from "./lib";

// Enrichment endpoint: given one or more lookup keys, return a joined view of
// everything known about them across all four datasets. Each key accepts
// multiple values — repeated params (?service=a&service=b) and/or
// comma-separated (?service=a,b) — so callers can enrich a whole batch in one
// request instead of querying one at a time. Keys:
//   ?service=  ?ownerEmail=  ?bug=  ?cve=  ?qid=
const req = await readRequest();
const db = openDb();

const multi = (field: string): string[] => {
  const out: string[] = [];
  for (const raw of req.query.getAll(field)) {
    for (const part of raw.split(",")) {
      const v = part.trim();
      if (v !== "") out.push(v);
    }
  }
  return out;
};

const keys = {
  service: multi("service"),
  ownerEmail: multi("ownerEmail"),
  bug: multi("bug"),
  cve: multi("cve"),
  qid: multi("qid"),
};

if (!Object.values(keys).some((v) => v.length > 0)) {
  db.close();
  json({ error: "Provide at least one of: service, ownerEmail, bug, cve, qid" }, 400);
} else {
  // Which of the supplied keys each table actually has a column for.
  const COLS: Record<string, string[]> = {
    owners: ["service", "ownerEmail"],
    qualys: ["service", "ownerEmail", "bug", "qid", "cve"],
    security_central: ["service", "ownerEmail", "bug", "qid", "cve"],
    bugdb: ["ownerEmail", "bug", "cve"],
  };

  const scoped = (table: string, extraBugs: string[] = []): any[] => {
    const clauses: string[] = [];
    const params: any[] = [];
    for (const col of COLS[table]) {
      const vals: string[] = (keys as any)[col];
      if (!vals || vals.length === 0) continue;
      if (col === "cve") {
        // Substring match, any of the supplied CVEs.
        clauses.push(`(${vals.map(() => "cve LIKE ?").join(" OR ")})`);
        params.push(...vals.map((v) => `%${v}%`));
      } else if (vals.length === 1) {
        clauses.push(`${col} = ?`);
        params.push(vals[0]);
      } else {
        clauses.push(`${col} IN (${vals.map(() => "?").join(", ")})`);
        params.push(...vals);
      }
    }
    // Let bugdb be reachable via bugs discovered from service/owner scans.
    let extra = "";
    if (extraBugs.length) {
      extra = `bug IN (${extraBugs.map(() => "?").join(",")})`;
    }
    let where = "";
    if (clauses.length && extra) where = `WHERE (${clauses.join(" AND ")}) OR ${extra}`;
    else if (clauses.length) where = `WHERE ${clauses.join(" AND ")}`;
    else if (extra) where = `WHERE ${extra}`;
    else return [];
    return db.query(`SELECT * FROM ${table} ${where}`).all(...params, ...extraBugs);
  };

  const qualys = scoped("qualys");
  const securityCentral = scoped("security_central");
  const relatedBugs = [
    ...new Set([...qualys, ...securityCentral].map((r: any) => r.bug).filter(Boolean)),
  ];

  const result = {
    query: keys,
    owners: scoped("owners"),
    qualys,
    securityCentral,
    bugdb: scoped("bugdb", relatedBugs),
  };

  db.close();
  json(result);
}
