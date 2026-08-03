import { createAnthropic } from "@ai-sdk/anthropic";
import { streamText } from "ai";

const SYSTEM = `You are a principal cloud architect reviewing an architecture diagram.

Respond in Markdown with exactly these sections:

## What this system does
Two or three sentences describing the system as depicted.

## Components and data flow
Bulleted list of the components you can identify and how requests/data move between them.

## Risks
Concrete architectural risks — single points of failure, tight coupling, missing redundancy. Each with a one-line impact.

## Security gaps
Exposure, authentication/authorization, encryption, network boundary, and secrets-handling concerns.

## Scalability recommendations
Prioritised, actionable changes.

Only describe what is visible in the diagram. Where the diagram is ambiguous or illegible, say so explicitly rather than inventing components.`;

function respond(status: number, body: unknown): never {
  const payload = JSON.stringify(body);
  process.stdout.write(
    [
      `HTTP/1.1 ${status} ${status === 200 ? "OK" : "Error"}`,
      "Content-Type: application/json",
      `Content-Length: ${Buffer.byteLength(payload)}`,
      "",
      payload,
    ].join("\r\n"),
  );
  process.exit(status === 200 ? 0 : 1);
}

const raw = await Bun.stdin.text();
const separator = raw.indexOf("\r\n\r\n");
const body = separator === -1 ? raw : raw.slice(separator + 4);

let request: { image?: string; mediaType?: string };
try {
  request = JSON.parse(body);
} catch {
  respond(400, { error: "Request body must be JSON" });
}

const image = request.image?.trim();
if (!image) respond(400, { error: "Missing 'image' in request body" });

const dataUri = image.match(/^data:([^;]+);base64,(.+)$/s);
const mediaType = dataUri?.[1] ?? request.mediaType ?? "image/png";
const base64 = dataUri?.[2] ?? image;

if (!/^image\/(png|jpeg|jpg|webp|gif)$/.test(mediaType)) {
  respond(400, { error: `Unsupported image type: ${mediaType}` });
}

const anthropic = createAnthropic({
  apiKey: "set-by-connector",
  baseURL: process.env.ANTHROPIC_BASE_URL,
});

const result = streamText({
  model: anthropic("claude-sonnet-4-5"),
  system: SYSTEM,
  messages: [
    {
      role: "user",
      content: [
        { type: "text", text: "Review this architecture diagram." },
        { type: "image", image: base64, mediaType },
      ],
    },
  ],
});

let review = "";
for await (const chunk of result.textStream) {
  review += chunk;
  process.stderr.write(".");
}
process.stderr.write("\n");

if (!review.trim()) throw new Error("Model returned an empty review");

respond(200, { review });
