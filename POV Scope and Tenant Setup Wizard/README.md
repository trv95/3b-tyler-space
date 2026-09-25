A live, editable POV scoping document for this account, built with Tines branding.

Open [`/pov-scoping`](<POV Doc/App.tsx>) to fill it in — designed to be completed together on a call, then handed to the customer in their own 3B tenant so they can reference it, keep it current, and log feature requests.

**Flow:** the page ([POV Doc](<POV Doc/App.tsx>)) loads saved content from [Load POV](<Load POV/script.ts>) (`GET /pov-scoping-data`) and autosaves every change to [Save POV](<Save POV/script.ts>) (`POST /pov-scoping-save`). State lives in the `pov_scoping` volume as `doc.json` — shared by everyone in the space, with the save step as the exclusive writer.

All three routes are `tenant` authenticated: any authenticated member of the tenant can read and edit. No external services or connectors.

To add or rename a field, edit the `Doc` type and the matching `<Section>` in [POV Doc/App.tsx](<POV Doc/App.tsx>) — the storage layer is schema-free, so old documents merge with new defaults.
