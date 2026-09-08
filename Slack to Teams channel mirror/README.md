Two-way mirror between the Slack channel `C0C096CMZ5Z` (Tyler Slack workspace) and the Microsoft Teams channel **Tyler Slack Mirroring** in the team `Tines.io`. Every top-level message and thread reply posted in one channel is reposted in the other, in the matching thread.

**Flow**

- Slack → Teams: Slack Events API posts to [Slack events](<Slack events/config.toml>) (`/slack-events`), which normalizes the event and links to [Mirror to Teams](<Mirror to Teams/script.ts>).
- Teams → Slack: a Graph change-notification subscription posts to [Teams notifications](<Teams notifications/config.toml>) (`/teams-notifications`), which links to [Mirror to Slack](<Mirror to Slack/script.ts>).
- [Manage Teams subscription](<Manage Teams subscription/script.ts>) runs every 20 minutes to create or renew that subscription (Teams channel-message subscriptions expire within 60 minutes).

**State** — the `mirror_state` volume holds `mirror.sqlite` with `thread_map` (Slack `ts` ↔ Teams root message id, used to keep threads aligned), `mirrored_slack` / `mirrored_teams` (ids this workflow posted, so mirrored messages never bounce back), and `settings` (the Graph subscription id).

**Setup**

1. Publish the workflow so both webhook routes answer on the live host.
2. In the Slack app for the Tyler Slack connector, enable Event Subscriptions with request URL `https://tyler-space.se-demo.3b.run/slack-events?external_id=XtzqgOjj6hQtjWdBuZhTo`, subscribe to `message.channels` (or `message.groups`), and invite the bot to the channel.
3. Run [Manage Teams subscription](<Manage Teams subscription/script.ts>) once; the cron keeps it renewed.

**Notes** — formatting is converted between Slack mrkdwn and Teams HTML for bold, italics, code, links, and line breaks. Files, reactions, and edits/deletes are not mirrored. Both routes use `external_id` auth.
