Persists the POV scoping document. `POST /pov-scoping-save` (tenant-authenticated) with the full document JSON as the body; it is written to `doc.json` on the `pov_scoping` volume (exclusive writer) with an `updatedAt` stamp.

Called by the [POV Doc page](<../POV Doc/App.tsx>) on every autosave. See [script.ts](script.ts).
