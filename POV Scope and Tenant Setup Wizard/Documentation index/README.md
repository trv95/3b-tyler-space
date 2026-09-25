Standalone reference page listing every doc and tenant settings link used by the tenant setup guide.

Trigger: HTTP route `/tenant-setup-docs`, restricted to members of this space. Renders the React app in [App.tsx](App.tsx) from the shared link data in [content.ts](content.ts) (`settingsIndex` and `reference`).

Settings links are relative paths resolved against the tenant app host (`<tenant>.3b.dev`), since this page is served from the space host. Doc links point at `docs.3b.tines.com`.

The setup guide's welcome page links here; this page links back to [the guide](<../Tenant setup guide/App.tsx>) at `/tenant-setup`.

[content.ts](content.ts) is a copy of [the guide's content.ts](<../Tenant setup guide/content.ts>) — steps can't import across directories, so copy the file over whenever the guide's links change.
