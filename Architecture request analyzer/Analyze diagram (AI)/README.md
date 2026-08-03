Receives an architecture diagram image and returns an AI architecture review as JSON.

Trigger: `POST /architecture-analyze` (`route_type = "api"`, space-authenticated). Request body is JSON: `{ "image": "<data URI or bare base64>", "mediaType": "image/png" }`.

Calls the Anthropic Messages API (`/v1/messages`, via the Anthropic connector) with Claude Sonnet 4.5 using the vercel AI SDK. The prompt asks for a structured architecture review: what the system is, components, data flow, then risks, security gaps and scalability recommendations.

Response: `{ "review": "<markdown>" }`. Contract in [api.json](api.json), implementation in [script.ts](script.ts). Called by [the Review page step](<../Review page/App.tsx>).
