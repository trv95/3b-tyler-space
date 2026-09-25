Serves the interactive tenant onboarding guide at `/tenant-setup` (space members only). It's a single React app that renders immediately — no upstream steps.

Eleven pages, navigated with the footer buttons or the arrow keys, with a progress bar in the header that fills to "Ready to build" on the last page:

1. Welcome / get started — links out to the standalone documentation index
2. Set up your tenant in the right order (from the [3B doc](https://docs.3b.tines.com/en/articles/16050718-set-up-your-tenant-in-the-right-order))
3. Add your members
4. Organize people into groups
5. Create custom roles, only if needed
6. Set up shared resources
7. Create your spaces and grant access
8. Sync your workflows to GitHub (optional)
9. Give your automations their own identity — service accounts (optional)
10. Connect single sign-on (optional — carries a warning that connecting SSO during a POV stops the Solutions Engineer signing in to help)
11. Ready to build

Page copy and links live in [content.ts](content.ts) — edit there to change wording, add a page, or repoint a doc link. The standalone [Documentation index step](<../Documentation index/App.tsx>) at `/tenant-setup-docs` is derived from those same links, so it stays in sync. Layout, progress bar and navigation are in [App.tsx](App.tsx); palette and fonts are in [globals.css](globals.css).

**Tenant settings links.** Every "go to Settings, then X" phrase links straight into this tenant's own settings page, and the documentation index page lists them all under "Your tenant settings". Those links are written as plain paths (`/settings/user-groups`, `/settings/members/users`, …) in the `SETTINGS` map in [content.ts](content.ts), and resolved in the browser against the tenant app host: the page is served from `<space>.<tenant>.3b.run`, so `tenantOrigin()` in [App.tsx](App.tsx) drops the space label and swaps the suffix to `.dev`, giving `https://<tenant>.3b.dev`. Nothing is hardcoded, so exporting this workflow into another tenant points the links at that tenant with no edits. If a deployment serves the tenant app on a different host pattern, `tenantOrigin()` is the one function to change.

Checklist ticks and the Solutions Engineer note are kept in the visitor's `localStorage` (`3b-tenant-setup-progress`, `3b-tenant-setup-se-notes`), so they survive a reload but aren't shared between people.

Ticking "I need a Tines Solutions Engineer to help me with this" — or pressing Save details — POSTs to [Record request](<../Record request/README.md>) at `/tenant-setup-request`, which persists it for review on [Review requests](<../Review requests/README.md>). Un-ticking withdraws it.
