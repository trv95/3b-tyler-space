Slack **slash command** trigger for access requests. Point a Slack slash command (e.g. `/access-request`) at the `/access-request-slash` route (route auth `external_id` — Slack signs its own requests).

Slack sends an `application/x-www-form-urlencoded` body. The command **text** is parsed as pipe-separated args:

```
/access-request <system> | <access level> | <duration> | <reason>
```

The invoking Slack user (`user_name`) becomes the requester. With no args, the command replies with usage help. Otherwise it normalizes the request and links to [Process request](<../Process request/script.ts>), which creates the case, posts the approval message, and returns an ephemeral confirmation to the user.

**Setup:** In your Slack app, create a slash command whose Request URL is the `/access-request-slash` route URL.
