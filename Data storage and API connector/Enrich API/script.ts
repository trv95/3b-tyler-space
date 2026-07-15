import { readRequest, json, openDb } from "./lib";

// Enrichment endpoint: given a lookup key, return a joined view of everything
// known about it across all four datasets. Accepts (in priority order):
//   ?service=  ?ownerEmail=  ?bug=  ?cve=  ?qid=
const req = await readRequest();
const db = openDb();

const keys = {
  service: req.query.get("service"),
  ownerEmail: req.query.get("ownerEmail"),
  bug: req.query.get("bug"),
  cve: req.query.get("cve"),
  qid: req.query.get("qid"),
};

if (!Object.values(keys).some(Boolean)) {
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
      const val = (keys as any)[col];
      if (!val) continue;
      if (col === "cve") {
        clauses.push("cve LIKE ?");
        params.push(`%${val}%`);
      } else {
        clauses.push(`${col} = ?`);
        params.push(val);
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
