import { readdir } from "node:fs/promises";
import {
  RequestState,
  tines,
  caseDescription,
  revokeOkta,
  revokeJira,
  revokeTines,
} from "./lib";

const STORE = "/storage/access_requests";

async function revokeOne(state: RequestState): Promise<void> {
  for (const app of state.apps) {
    if (app === "Okta" && state.provisioned.Okta) await revokeOkta(state.provisioned.Okta.userId);
    else if (app === "Jira" && state.provisioned.Jira) await revokeJira(state.provisioned.Jira.accountId);
    else if (app === "Tines" && state.provisioned.Tines) await revokeTines(state.provisioned.Tines.userId);
  }

  await tines(`/api/v2/cases/${state.case_id}`, "PUT", {
    description: caseDescription(state, "Granted and Revoked"),
  });
}

async function main() {
  let files: string[] = [];
  try {
    files = await readdir(STORE);
  } catch {
    console.error("No access_requests store yet; nothing to revoke.");
    process.stdout.write("{}");
    return;
  }

  const now = Date.now();
  let revoked = 0;
  let checked = 0;

  for (const f of files) {
    if (!f.endsWith(".json")) continue;
    const path = `${STORE}/${f}`;
    let state: RequestState;
    try {
      state = (await Bun.file(path).json()) as RequestState;
    } catch {
      continue;
    }
    checked++;

    if (state.status !== "approved" || !state.expires_at) continue;
    if (new Date(state.expires_at).getTime() > now) continue; // not yet expired

    try {
      await revokeOne(state);
      state.status = "revoked";
      await Bun.write(path, JSON.stringify(state, null, 2));
      revoked++;
      console.error(`Revoked access for ${state.email} (request ${state.id}).`);
    } catch (e) {
      console.error(`Failed to revoke request ${state.id}: ${(e as Error).message}`);
      // Leave as "approved" so the next cron tick retries.
    }
  }

  process.stdout.write(JSON.stringify({ checked, revoked }));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
