Lets someone upload an architecture diagram and get an AI architecture review back on the same page.

**Trigger:** open `/architecture-review` in a browser (space members only).

**Flow:** the [Review page](<Review page/App.tsx>) React step renders the upload form. When a diagram is submitted, the browser POSTs the image (base64 data URI) to `/architecture-analyze`, handled by [Analyze diagram (AI)](<Analyze diagram (AI)/script.ts>). That step calls the Anthropic Messages API with Claude Sonnet 4.5 and a reviewer system prompt, and returns `{ "review": "<markdown>" }`, which the page renders.

**External services:** Anthropic (via the Anthropic connector on the analyze step). Nothing is stored and nothing is written to any external system — the workflow is read-only apart from the model call.

**Operational notes:** the two steps are independent routes, not linked, so the page loads instantly. Analysis typically takes 20–60 seconds; the analyze step's timeout is 240s. Common failures: an unsupported or oversized image (rejected in-browser and again server-side with a 400) or an Anthropic API error (surfaced on the page).

**Common changes:** to adjust what the review covers, edit the `SYSTEM` prompt in [Analyze diagram (AI)/script.ts](<Analyze diagram (AI)/script.ts>). To change accepted file types or the size cap, edit `ACCEPTED`/`MAX_BYTES` in [Review page/App.tsx](<Review page/App.tsx>).
