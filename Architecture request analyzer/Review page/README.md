The upload page users visit. Served at `GET /architecture-review` (`route_type = "webpage"`, space-authenticated).

A React app ([App.tsx](App.tsx)) with a drag-and-drop image dropzone (PNG/JPEG/WebP/GIF, 5 MB cap), a preview, and a "Run review" button. On submit it reads the file as a data URI and POSTs it to `/architecture-analyze` — see [the Analyze diagram step](<../Analyze diagram (AI)/script.ts>) — then renders the returned Markdown review in place.

No connectors; all model access happens in the analyze step.
