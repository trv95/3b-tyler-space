import { reference, settingsIndex } from "./content";

const T = {
  pageBg: "#FCF9F5",
  cardBg: "rgba(248,244,240,0.82)",
  border: "#EDE9E3",
  inputBg: "#F6F2EE",
  textPrimary: "#362A51",
  textSecondary: "rgba(54,42,81,0.55)",
  textMuted: "rgba(54,42,81,0.35)",
  accent: "#8D75E6",
  accentDeep: "#4D3E78",
  purple50: "#F3ECF7",
};

// This page is served from <space>.<tenant>.3b.run, while tenant settings live on the
// tenant app host <tenant>.3b.dev — so settings paths are resolved against that host.
function tenantOrigin() {
  const labels = window.location.hostname.split(".");
  if (labels.length < 4) return window.location.origin;
  const host = labels.slice(1).join(".").replace(/\.run$/, ".dev");
  return `https://${host}`;
}

function guideHref() {
  const branch = new URLSearchParams(window.location.search).get("branch");
  return `/tenant-setup${branch ? `?branch=${encodeURIComponent(branch)}` : ""}`;
}

function Group({ heading, links }: { heading: string; links: { label: string; href: string }[] }) {
  return (
    <div className="rounded-lg p-4" style={{ background: T.inputBg }}>
      <p className="text-[12px] font-semibold" style={{ color: T.textPrimary }}>
        {heading}
      </p>
      <ul className="mt-2 space-y-1">
        {links.map((l) => (
          <li key={l.href}>
            <a
              href={l.href}
              target="_blank"
              rel="noreferrer"
              className="text-[14px] underline decoration-1 underline-offset-2"
              style={{ color: T.accentDeep }}
            >
              {l.label} ↗
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function App() {
  return (
    <div className="min-h-screen" style={{ background: T.pageBg, color: T.textPrimary }}>
      <title>Documentation index — Tines 3B tenant setup</title>

      <div
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            "radial-gradient(900px 480px at 8% -10%, rgba(215,196,250,0.5), transparent 62%), radial-gradient(700px 420px at 98% 0%, rgba(243,236,247,0.9), transparent 60%)",
        }}
      />

      <header
        className="sticky top-0 z-40 backdrop-blur-md"
        style={{ background: "rgba(252,249,245,0.9)", borderBottom: `1px solid ${T.border}` }}
      >
        <div className="mx-auto flex max-w-3xl items-center gap-4 px-7 py-4">
          <span
            className="inline-block h-4 w-4 rounded-full"
            style={{ background: T.accent, boxShadow: `0 0 0 4px ${T.purple50}` }}
          />
          <span className="text-[15px] font-semibold">Tines 3B</span>
          <span className="text-[15px]" style={{ color: T.textMuted }}>
            /
          </span>
          <span className="text-[15px]" style={{ color: T.textSecondary }}>
            Documentation index
          </span>
          <a
            href={guideHref()}
            className="ml-auto rounded-lg px-4 py-2 text-[13px] font-semibold text-white"
            style={{ background: T.accent }}
          >
            Back to setup guide
          </a>
        </div>
      </header>

      <main className="relative mx-auto max-w-3xl px-7 pb-20 pt-10">
        <div className="rounded-[10px] p-7" style={{ background: T.cardBg, border: `1px solid ${T.border}` }}>
          <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: T.accent }}>
            Reference
          </p>
          <h1 className="mt-2 text-[22px] font-bold leading-snug">Documentation index</h1>
          <p className="mt-4 text-[16px] leading-relaxed" style={{ color: T.textSecondary }}>
            Every doc and settings page referenced by the tenant setup guide, in one place. Come back
            here any time you need one.
          </p>

          <div className="mt-7 space-y-2">
            <Group
              heading="Your tenant settings"
              links={settingsIndex.map((s) => ({
                label: s.label,
                href: s.path.startsWith("/") ? `${tenantOrigin()}${s.path}` : s.path,
              }))}
            />
            {reference.map((section) => (
              <Group key={section.group} heading={section.group} links={section.links} />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
