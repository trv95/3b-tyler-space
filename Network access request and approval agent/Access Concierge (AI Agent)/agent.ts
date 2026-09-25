import { runAgent } from "./runtime/loop";
import { authenticatedPrincipal, isHttpRequest, requestBodyOrRaw } from "./runtime/request";
import { parsePriorRun } from "./runtime/selfLoop";
import { startResponse } from "./runtime/response";
import { transcriptPath } from "./runtime/transcript";

function buildInput(body: string): { message: string; context?: unknown; conversationId?: string } {
  let parsed:any = {};
  try { parsed = JSON.parse(body); } catch { parsed = { message: body }; }
  const message = String(parsed.message || "").trim();
  if (!message) throw new Error("message is required");
  return { message, conversationId: parsed.conversation_id, context: { profile: parsed.profile || null } };
}
function safeConversationId(id:string|undefined){const cleaned=id?.replace(/[^a-zA-Z0-9_-]/g,"").slice(0,64)||"";return cleaned||crypto.randomUUID();}
const raw=await Bun.stdin.text();
const interactive=isHttpRequest(raw);
const priorRun=interactive?null:parsePriorRun(raw);
if(priorRun&&priorRun.status!=="running")process.exit(0);
const out=startResponse(interactive);
let message:string|null=null,context:unknown,conversationId:string;
if(priorRun){conversationId=priorRun.conversationId;}else{const input=buildInput(requestBodyOrRaw(raw));message=input.message;context=input.context;conversationId=safeConversationId(input.conversationId);}
const owner=priorRun?(priorRun.owner??"shared"):(authenticatedPrincipal(raw)??"shared");
out.event({type:"conversation",conversationId,owner});
await runAgent({message,context,transcriptFile:transcriptPath(owner,conversationId),out,interactive});
