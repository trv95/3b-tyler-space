import {
  TINES_URL,
  OKTA_ORG_URL,
  JIRA_BASE_URL,
  JIRA_PRODUCTS,
  RequestState,
  parseHttpRequest,
  html,
  tines,
  slack,
  caseDescription,
  fmtTime,
  resultPage,
} from "./lib";

const STORE = "/storage/access_requests";

async function createOktaUser(s: RequestState): Promise<string> {
  const res = await fetch(`${OKTA_ORG_URL}/api/v1/users?activate=true`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      profile: { firstName: s.first_name, lastName: s.last_name, email: s.email, login: s.email },
    }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Okta create user -> ${res.status}: ${text}`);
  return JSON.parse(text).id;
}

async function createJiraUser(s: RequestState): Promise<string> {
  const res = await fetch(`${JIRA_BASE_URL}/rest/api/3/user`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({ emailAddress: s.email, products: JIRA_PRODUCTS }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Jira create user -> ${res.status}: ${text}`);
  return JSON.parse(text).accountId;
}

async function createTinesUser(s: RequestState): Promise<string | number> {
  const res = await tines("/api/v1/admin/users", "POST", {
    email: s.email,
    first_name: s.first_name,
    last_name: s.last_name,
    admin: false,
  });
  return res.id;
}

async function dmGrant(slackUserId: string, app: string, minutes: number, expiresIso: string) {
  await slack("chat.postMessage", {
    channel: slackUserId,
    text: `Access to *${app}* has been granted for the next ${minutes} minutes!\n\nPlease be sure to complete any tasks and log out by *${fmtTime(expiresIso)}*.`,
  });
}

async function main() {
  const raw = await Bun.stdin.text();
  const req = parseHttpRequest(raw);
  const id = req.query.get("id") ?? "";
  const decision = req.query.get("decision") ?? "";

  if (!id || !/^[a-f0-9-]{36}$/i.test(id)) {
    process.stdout.write(html(400, "Bad Request", resultPage("no", "Invalid request", "Missing or malformed request id.")));
    return;
  }

  const path = `${STORE}/${id}.json`;
  const file = Bun.file(path);
  if (!(await file.exists())) {
    process.stdout.write(html(404, "Not Found", resultPage("no", "Request not found", "This access request no longer exists.")));
    return;
  }
  const state = (await file.json()) as RequestState;

  // Idempotent: repeated button clicks shouldn't re-provision.
  if (state.status !== "pending") {
    const msg =
      state.status === "approved"
        ? "This request has already been approved."
        : state.status === "denied"
        ? "This request has already been denied."
        : "This request has already been processed.";
    process.stdout.write(html(200, "OK", resultPage("warn", "Already processed", msg)));
    return;
  }

  // ---- Denied ----
  if (decision === "no") {
    state.status = "denied";
    await tines(`/api/v2/cases/${state.case_id}`, "PUT", {
      description: caseDescription(state, "Denied"),
    });
    await Bun.write(path, JSON.stringify(state, null, 2));
    process.stdout.write(html(200, "OK", resultPage("no", "Access denied", `The request from ${state.first_name} ${state.last_name} has been denied.`)));
    return;
  }

  if (decision !== "yes") {
    process.stdout.write(html(400, "Bad Request", resultPage("no", "Invalid decision", "The decision must be approve or deny.")));
    return;
  }

  // ---- Approved: provision each requested app ----
  const expiresIso = new Date(Date.now() + state.duration_minutes * 60_000).toISOString();
  state.expires_at = expiresIso;

  for (const app of state.apps) {
    if (app === "Okta") state.provisioned.Okta = { userId: await createOktaUser(state) };
    else if (app === "Jira") state.provisioned.Jira = { accountId: await createJiraUser(state) };
    else if (app === "Tines") state.provisioned.Tines = { userId: await createTinesUser(state) };
  }

  // Update the Case to granted.
  await tines(`/api/v2/cases/${state.case_id}`, "PUT", {
    description: caseDescription(state, `Granted until ${fmtTime(expiresIso)}`),
  });

  // Notify the requester in Slack (one DM per granted app), best-effort.
  try {
    const lookupRes = await fetch(
      `https://slack.com/api/users.lookupByEmail?email=${encodeURIComponent(state.email)}`,
      { headers: { "content-type": "application/x-www-form-urlencoded" } },
    );
    const lookup = (await lookupRes.json()) as any;
    if (!lookup.ok) throw new Error(`lookupByEmail: ${lookup.error}`);
    const slackUserId = lookup.user?.id;
    if (slackUserId) {
      for (const app of state.apps) await dmGrant(slackUserId, app, state.duration_minutes, expiresIso);
    }
  } catch (e) {
    console.error("Slack DM skipped:", (e as Error).message);
  }

  state.status = "approved";
  await Bun.write(path, JSON.stringify(state, null, 2));

  process.stdout.write(
    html(
      200,
      "OK",
      resultPage(
        "ok",
        "Access granted",
        `${state.apps.join(", ")} access granted to ${state.first_name} ${state.last_name} until ${fmtTime(expiresIso)}. It will be revoked automatically.`,
      ),
    ),
  );
}

main().catch((e) => {
  console.error(e);
  process.stdout.write(html(500, "Internal Server Error", resultPage("no", "Something went wrong", "The decision could not be processed. Check the run logs.")));
});
