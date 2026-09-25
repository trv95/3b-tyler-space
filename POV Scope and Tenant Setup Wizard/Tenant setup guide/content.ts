export type Page = {
  kind: "welcome" | "chapter" | "finish";
  optional?: boolean;
  slug: string;
  eyebrow: string;
  title: string;
  lede: string;
  body?: string[];
  bullets?: { term: string; text: string }[];
  checklist?: string[];
  choices?: { prompt: string; options: string[] };
  note?: string;
  links?: { label: string; href: string }[];
};

const DOCS = "https://docs.3b.tines.com/en/articles";

export const SETTINGS = {
  spaces: "/settings/spaces",
  members: "/settings/members/users",
  groups: "/settings/user-groups",
  roles: "/settings/roles",
  ai: "/settings/ai",
  sso: "/settings/sso",
  security: "/settings/security",
  auditLogs: "/settings/audit-logs/logs",
  networking: "/settings/networking",
  connectors: "/connectors/directory",
  skills: "/skills/list",
};

export const settingsIndex: { label: string; path: string }[] = [
  { label: "Single sign-on", path: SETTINGS.sso },
  { label: "Members", path: SETTINGS.members },
  { label: "Groups", path: SETTINGS.groups },
  { label: "Roles", path: SETTINGS.roles },
  { label: "AI providers", path: SETTINGS.ai },
  { label: "Connectors", path: SETTINGS.connectors },
  { label: "Skills", path: SETTINGS.skills },
  { label: "Networking", path: SETTINGS.networking },
  { label: "Security", path: SETTINGS.security },
  { label: "Audit logs", path: SETTINGS.auditLogs },
  { label: "Spaces", path: SETTINGS.spaces },
];


const D = {
  order: `${DOCS}/16050718-set-up-your-tenant-in-the-right-order`,
  ai: `${DOCS}/16050726-connect-your-ai-provider`,
  sso: `${DOCS}/15887097-set-up-single-sign-on-sso`,
  scim: `${DOCS}/16025187-provision-users-and-groups-automatically-with-scim`,
  members: `${DOCS}/16082359-members`,
  groups: `${DOCS}/16050800-create-and-manage-groups`,
  roles: `${DOCS}/15870655-create-custom-roles-when-the-built-in-roles-aren-t-enough`,
  connectors: `${DOCS}/16020616-connectors`,
  spaces: `${DOCS}/15871144-create-and-manage-spaces`,
  scopes: `${DOCS}/16082370-scopes`,
  dictionary: `${DOCS}/15871510-tines-3b-dictionary`,
  access: `${DOCS}/16050782-understand-how-access-control-works`,
  gitsync: `${DOCS}/16441033-sync-your-workflows-to-github-with-a-github-app`,
  serviceAccounts: `${DOCS}/16082372-service-account`,
  serviceAccountsHow: `${DOCS}/16050758-give-your-automations-their-own-identity-with-service-accounts`,
  examples: "https://www.tines.com/3b/examples/",
};

export const pages: Page[] = [
  {
    kind: "welcome",
    slug: "welcome",
    eyebrow: "Tenant onboarding",
    title: "Welcome to your 3B tenant",
    lede:
      "This guide walks you through setting your tenant up in the order things actually depend on each other — people and identity first, then the resources spaces rely on, then spaces, then building.",
  },
  {
    kind: "chapter",
    slug: "order",
    eyebrow: "Page 1 — Orientation",
    title: "Set up your tenant in the right order",
    lede:
      "Spaces feel like the natural starting point, but they come later: by the time you create one, you want the members, groups and connectors it needs to already exist.",
    body: ["Before you create anything, 3B has already done some setup for you."],
    bullets: [
      {
        term: "A personal workflow space for everyone",
        text: "Each member gets their own personal space and chat the first time they sign in.",
      },
      {
        term: "AI on by default (POV/Pilot only)",
        text: `A provider managed by Tines 3B, covering Claude and OpenAI models, is the default with no setup required during the trial period. Tenants on paid, production plans set up their own provider under Settings, then [AI providers](${SETTINGS.ai}) — though you are welcome to bring in your LLM keys during the trial. [How to connect your AI provider](${D.ai}).`,
      },
    ],
    links: [{ label: "Set up your tenant in the right order", href: D.order }],
  },
  {
    kind: "chapter",
    slug: "members",
    eyebrow: "Step 1",
    title: "Add your members",
    lede: "Everyone you'll grant access to has to exist first, so bring your people in next.",
    body: [
      `Go to Settings, then [Members](${SETTINGS.members}), and invite people by email. They'll get a sign-in link — [more on members](${D.members}).`,
      "You can choose which groups a person joins right from the invite, so this step and the next one work well together.",
    ],
    note: "If you connect SSO with automatic provisioning later, members can instead be created when they first sign in.",
    checklist: ["Admins invited", "First builders invited"],
    links: [{ label: "Members", href: D.members }],
  },
  {
    kind: "chapter",
    slug: "groups",
    eyebrow: "Step 2",
    title: "Organize people into groups",
    lede:
      "Groups are the biggest time-saver in access control. Grant a group access to something once, and every member — including people you add later — inherits it.",
    body: [
      `Create them under Settings, then [Groups](${SETTINGS.groups}) — [how to create and manage groups](${D.groups}).`,
    ],
    note: "Skip this step if your identity provider owns group membership.",
    checklist: ["Groups created (or owned by the IdP)"],
    links: [{ label: "Create and manage groups", href: D.groups }],
  },
  {
    kind: "chapter",
    slug: "roles",
    eyebrow: "Step 3",
    title: "Create custom roles — only if you need them",
    lede:
      "Many admins expect to build roles first, but you usually don't need to. 3B's built-in roles cover the common cases.",
    body: [
      `Only [build a custom role](${D.roles}) when the built-ins don't fit your needs, and do it before you start granting access so the role shows up in the picker. You'll find this under Settings, then [Roles](${SETTINGS.roles}).`,
    ],
    checklist: ["Built-in roles reviewed", "Custom roles created only where needed"],
    links: [{ label: "Create custom roles when the built-in roles aren't enough", href: D.roles }],
  },
  {
    kind: "chapter",
    slug: "resources",
    eyebrow: "Step 4",
    title: "Set up shared resources",
    lede: "Set up the shared resources your workflows will use, so access is ready before people start building.",
    bullets: [
      {
        term: "Connectors",
        text: `Store the credentials and configuration for the external APIs your workflows call — build them in the [connector directory](${SETTINGS.connectors}), or read [more on connectors](${D.connectors}).`,
      },
      {
        term: "Skills",
        text: `Package reusable instructions your team can share, in [Skills](${SETTINGS.skills}).`,
      },
      {
        term: "Networks",
        text: `Control where workflows can send outbound traffic, using egress rules under [Networking](${SETTINGS.networking}).`,
      },
      { term: "Service accounts", text: "Give automations their own identity, separate from any one person." },
    ],
    body: [
      `Grant each resource to the right groups from its own settings, choosing a [role](${D.scopes}) such as Connector user or Network user. Granting from the resource keeps all of its access in one place.`,
    ],
    checklist: ["Key connectors created", "Access granted to the right groups"],
    links: [
      { label: "Connectors", href: D.connectors },
      { label: "Scopes", href: D.scopes },
    ],
  },
  {
    kind: "chapter",
    slug: "spaces",
    eyebrow: "Step 5",
    title: "Create your spaces and grant access",
    lede:
      "Spaces are the workspaces your workflows live in, and they're last because they tie everything else together.",
    body: [
      `You already have a General space to start from, so create more only as your teams take shape — manage them under Settings, then [Spaces](${SETTINGS.spaces}), or use the plus button in spaces. [How to create and manage spaces](${D.spaces}).`,
      "Then grant access from the space's settings: add the groups or people who should have it and pick their role — Space viewer, Space editor, or Space manager. If you'd rather not create every space yourself, give the relevant groups the space creator tenant role and let teams make their own.",
    ],
    checklist: ["Spaces created", "Groups granted the right space roles"],
    links: [{ label: "Create and manage spaces", href: D.spaces }],
  },
  {
    kind: "chapter",
    optional: true,
    slug: "gitsync",
    eyebrow: "Optional",
    title: "Sync your workflows to GitHub",
    lede:
      "GitSync mirrors a space's workflows to a GitHub repository, so your automation lives alongside your other code with real version history, pull requests and review.",
    body: [
      `Set it up in two parts. First create a GitHub connector in the [connector directory](${SETTINGS.connectors}) and choose GitHub App as the connection type — 3B builds a preconfigured app for you on GitHub, then fills in the app ID, private key and installation ID itself, so you never copy a credential. Install that app on the repositories you want to sync.`,
      `Then open the space's settings, turn on the GitSync card, enter the https:// repository URL (optionally a subdirectory), pick your connector and click Connect. [Full walkthrough](${D.gitsync}).`,
      "From then on sync runs both ways and is event-driven, not scheduled: your changes are pushed to the repository, and a push to the repository reaches 3B through the app's webhook within seconds.",
    ],
    bullets: [
      { term: "Why a GitHub App", text: "Webhooks, pull request tracking, and installs scoped to only the repositories you choose — a personal access token gives you none of that." },
      { term: "Default branch must be main", text: "GitSync requires it. Protected branches are fine — changes arrive with the next merged pull request instead of a direct push." },
      { term: "Sharing a repository", text: "Two spaces can share one repository as long as each owns a directory that doesn't overlap the other." },
      { term: "GitHub Enterprise Server", text: "Enter an existing app's details manually — app ID, private key and installation ID — since the guided flow targets github.com." },
    ],
    note: "You need permission to manage the space and to create a connector. Disconnecting is safe: turning GitSync off removes the sync configuration and leaves your workflows in place.",
    choices: {
      prompt: "Where do you stand on GitSync?",
      options: ["I’ve completed this", "I don’t need to do this"],
    },
    links: [{ label: "Sync your workflows to GitHub with a GitHub App", href: D.gitsync }],
  },
  {
    kind: "chapter",
    optional: true,
    slug: "service-accounts",
    eyebrow: "Optional",
    title: "Give your automations their own identity",
    lede:
      "A service account is an identity for non-human callers — scripts, CI jobs, and automated services — so access doesn't hang off any one person's account.",
    body: [
      `They behave like independent members, shown with a robot icon, with their own roles and grants. Create them under Settings, then [Members](${SETTINGS.members}) — [how to create a service account](${D.serviceAccountsHow}), and [what they are](${D.serviceAccounts}).`,
      "Reach for one when a workload calls 3B and shouldn't break the day someone changes roles or leaves.",
    ],
    bullets: [
      { term: "API keys", text: "Long-lived secret keys for persistent authentication." },
      { term: "Temporary credentials", text: "Short-lived keys that expire automatically." },
      { term: "Federation", text: "OIDC tokens from a trusted provider such as GitHub Actions, so no static key is stored anywhere." },
      { term: "Permissions", text: "Grant access to specific spaces, connectors, skills and networks, or assign tenant-wide roles for administrative tasks." },
    ],
    choices: {
      prompt: "Where do you stand on service accounts?",
      options: ["I’ve completed this", "I don’t need to do this"],
    },
    links: [
      { label: "Service account", href: D.serviceAccounts },
      { label: "Give your automations their own identity with service accounts", href: D.serviceAccountsHow },
    ],
  },
  {
    kind: "chapter",
    optional: true,
    slug: "sso",
    eyebrow: "Optional",
    title: "Connect single sign-on",
    lede:
      "SSO lets your people sign in with your own identity provider. It's optional, and during a POV it's usually best left until the end.",
    body: [
      `Go to your [SSO settings](${SETTINGS.sso}) and configure your provider — [here's how](${D.sso}). Then decide on the sync mode; get this decision right before doing any manual creation.`,
      `When your provider owns users or groups, 3B locks the matching controls so your provider can't overwrite your manual changes. Deciding the source of truth now saves you from building groups you can't edit afterward. If your provider should own both, [provision with SCIM](${D.scim}).`,
    ],
    bullets: [
      { term: "Off", text: "You manage users and groups entirely in 3B." },
      { term: "JIT", text: "Creates user accounts automatically on first sign-in, but leaves group management to you." },
      {
        term: "JIT with groups / SCIM",
        text: "Also let your provider own group membership, and in some cases whether groups exist at all.",
      },
    ],
    note:
      "Warning: if you connect SSO during the POV, your Solutions Engineer will no longer be able to sign in to the tenant with you, so they can't get in alongside you to help you with the product. Consider leaving SSO until the POV is finished.",
    choices: {
      prompt: "Which sync mode are you going with?",
      options: [
        "Not connecting SSO during the POV",
        "Sync mode is off, I will manage users manually in 3B",
        "Sync mode is JIT",
        "Sync mode is JIT with groups / SCIM",
      ],
    },
    links: [
      { label: "Set up single sign-on (SSO)", href: D.sso },
      { label: "Provision users and groups with SCIM", href: D.scim },
    ],
  },
  {
    kind: "finish",
    slug: "build",
    eyebrow: "Step 6",
    title: "Ready to build",
    lede:
      "Your tenant is ready. Your team can now build workflows in their spaces, using the connectors and skills you've made available.",
    body: [
      `The pattern underneath all of this: people and identity first, then the resources spaces rely on, then spaces, then building. Set the foundation first, and creating spaces becomes the easy part — see [how access control works](${D.access}) if you want the model behind it.`,
      `New terms are defined in the [3B Dictionary](${D.dictionary}), and the [examples gallery](${D.examples}) is a good place to find a first workflow worth copying.`,
    ],
    links: [
      { label: "3B Dictionary", href: D.dictionary },
      { label: "Understand how access control works", href: D.access },
      { label: "Examples gallery", href: D.examples },
    ],
  },
];

export type Link = { label: string; href: string };

export const reference: { group: string; links: Link[] }[] = pages
  .filter((p) => p.links?.length)
  .map((p) => ({ group: p.title, links: p.links as Link[] }));
