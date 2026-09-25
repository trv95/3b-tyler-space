import { useEffect, useMemo, useState } from "react";

type Grant = { id:string; employee_name?:string; employee_email:string; department?:string; job_title?:string; manager_email?:string; system:string; access_level:string; granted_at:string; status:string; attestation?:string; attested_by?:string; attestation_note?:string; case_url?:string };
type Review = { reviewer:string; cycle?:{id:string;opened_at:string;status:string}; grants:Grant[]; summary:{total:number;attested:number;revocations_pending:number} };
type Choice = { decision:"keep"|"revoke"; note:string };
const api=()=>`${window.__ROUTE_PATH__.replace(/\/review$/,"")}/api/review`;

export default function App(){
 const [data,setData]=useState<Review|null>(null),[choices,setChoices]=useState<Record<string,Choice>>({}),[busy,setBusy]=useState(false),[message,setMessage]=useState("");
 const load=async()=>{const r=await fetch(api(),{credentials:"same-origin"});if(!r.ok)throw new Error("Could not load access review");setData(await r.json())};
 useEffect(()=>{load().catch(e=>setMessage(e.message))},[]);
 const outstanding=useMemo(()=>data?.grants.filter(g=>!g.attestation)??[],[data]);
 const revokeCount=Object.values(choices).filter(c=>c.decision==="revoke").length;
 function choose(id:string,decision:"keep"|"revoke"){setChoices(c=>({...c,[id]:{decision,note:c[id]?.note??""}}))}
 async function submit(){setBusy(true);setMessage("");try{const attestations=Object.entries(choices).map(([grant_id,c])=>({grant_id,...c}));if(!attestations.length)throw new Error("Select Keep or Revoke for at least one grant.");const r=await fetch(api(),{method:"POST",headers:{"content-type":"application/json"},credentials:"same-origin",body:JSON.stringify({attestations})});const result=await r.json();if(!r.ok)throw new Error(result.error||"Submission failed");setChoices({});setMessage(`${result.recorded.length} attestation${result.recorded.length===1?"":"s"} recorded${result.revocations?`; ${result.revocations} revocation case${result.revocations===1?"":"s"} queued`:""}.`);await load()}catch(e){setMessage(e instanceof Error?e.message:"Submission failed")}finally{setBusy(false)}}
 return <main>
  <header><div className="wordmark"><i>AR</i><span>Access Review</span></div><div className="reviewer"><small>REVIEWER</small>{data?.reviewer||"Signed-in reviewer"}</div></header>
  <section className="mast"><div><p className="kicker">DAILY ATTESTATION</p><h1>Keep access<br/><em>intentional.</em></h1><p>Review active grants against current job need. Every decision is recorded; revocations open a Tines Case for tracked follow-through.</p></div><div className="stamp"><span>CYCLE</span><b>{data?.cycle?.id||"Loading"}</b><small>{data?.cycle?new Date(data.cycle.opened_at).toLocaleDateString(undefined,{month:"long",day:"numeric",year:"numeric"}):""}</small></div></section>
  <section className="scorebar"><div><b>{data?.summary.total??"—"}</b><span>ACTIVE GRANTS</span></div><div><b>{outstanding.length}</b><span>TO REVIEW</span></div><div><b>{data?.summary.attested??"—"}</b><span>ATTESTED</span></div><div className="risk"><b>{revokeCount}</b><span>MARKED TO REVOKE</span></div></section>
  <section className="review-area">
   <div className="table-head"><div><p>ACCESS REGISTER</p><h2>Current entitlements</h2></div><span>{outstanding.length} remaining</span></div>
   <div className="grant-list">
    {!data&&<div className="loading">Loading access register…</div>}
    {data?.grants.length===0&&<div className="loading">No active access grants to review.</div>}
    {data?.grants.map(g=><article className={g.attestation?"complete":""} key={g.id}>
      <div className="person"><div className="avatar">{(g.employee_name||g.employee_email).split(/\s|@/).slice(0,2).map(x=>x[0]).join("")}</div><div><b>{g.employee_name||g.employee_email}</b><span>{g.job_title||"Role unavailable"} · {g.department||"Department unavailable"}</span><small>{g.employee_email}</small></div></div>
      <div className="entitlement"><small>SYSTEM / ACCESS</small><b>{g.system}</b><span>{g.access_level}</span></div>
      {g.attestation?<div className={`attested ${g.attestation}`}><b>{g.attestation==="keep"?"✓ Retained":"↗ Revocation queued"}</b><span>by {g.attested_by}</span>{g.case_url&&<a href={g.case_url}>Open case ↗</a>}</div>:<div className="decision"><div className="toggle"><button className={choices[g.id]?.decision==="keep"?"selected keep":""} onClick={()=>choose(g.id,"keep")}>✓ Keep</button><button className={choices[g.id]?.decision==="revoke"?"selected revoke":""} onClick={()=>choose(g.id,"revoke")}>× Revoke</button></div>{choices[g.id]?.decision==="revoke"&&<input placeholder="Reason for revocation" value={choices[g.id].note} onChange={e=>setChoices(c=>({...c,[g.id]:{...c[g.id],note:e.target.value}}))}/>}</div>}
    </article>)}
   </div>
   <div className="actionbar"><div>{message?<span className="message">{message}</span>:<span><b>{Object.keys(choices).length}</b> decision{Object.keys(choices).length===1?"":"s"} ready</span>}</div><button disabled={busy||!Object.keys(choices).length} onClick={submit}>{busy?"Recording…":"Record attestations"}<i>→</i></button></div>
  </section>
  <footer><span>Decisions are immutable within this review cycle.</span><a href="https://se-demo.3b.dev/workflows/XqirJHpgKqPQ">View Tines workflow ↗</a></footer>
 </main>
}
declare global{interface Window{__ROUTE_PATH__:string}}
