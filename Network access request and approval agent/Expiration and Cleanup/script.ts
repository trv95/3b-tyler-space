import { Database } from "bun:sqlite";
const now=Date.now(),day=86400000;
let rows:any[]=[];
try { const db=new Database("/storage/network_access/access.sqlite",{readonly:true}); rows=db.query("SELECT id, requester_email, ends_at, status FROM requests WHERE status='approved' AND ends_at IS NOT NULL").all(); } catch (error:any) { if (!String(error.message).includes("unable to open")) throw error; }
const due=rows.filter(x=>Date.parse(x.ends_at)<=now);
const expiring=rows.filter(x=>Date.parse(x.ends_at)>now&&Date.parse(x.ends_at)-now<=day);
console.log(JSON.stringify({checked_at:new Date().toISOString(),due_for_revocation:due.map(x=>x.id),expiring_within_24h:expiring.map(x=>x.id),note:"Safe simulation mode: records are identified for NAC revocation and notification; no live network API is attached."}));
