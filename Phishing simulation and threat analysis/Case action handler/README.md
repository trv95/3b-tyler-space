Backs the two case action buttons that [the Create Tines case step](<../Create Tines case/script.ts>) attaches to every case it opens.

Triggered by an HTTP request to `/phishing-case-action` (auth: `external_id`, so the Tines case action button can call it). Tines appends the button's `query_params`, so the request carries:

- `action` — `block-sender` or `remove-from-inboxes`
- `case_id`, `case_action_id`
- `sender`, `subject` — used in the note text

[script.ts](script.ts) then, against the Tines API (Tyler Tines Stories connector):

1. `DELETE /api/v2/cases/<case_id>/actions/<case_action_id>` — the clicked button disappears, so each action can only be taken once.
2. `POST /api/v2/cases/<case_id>/notes` — adds a titled, colour-coded case note.

For **Block Sender** the note records the blocked address, who clicked, and when. For **Remove from inboxes** the note reports simulated sweep results (how many other mailboxes held a copy, how many recipients opened or clicked) and states the email was removed from all inboxes. The counts are derived deterministically from the case id and sender, so the same case always reports the same numbers.

Both notes are labelled as simulated — nothing is changed in a real mail system.

Responds `200` with a small JSON summary, or `400` when the required parameters are missing.
