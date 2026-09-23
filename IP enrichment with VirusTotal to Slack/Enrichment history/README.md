Serves authenticated `GET /ip-enrichment-history` requests from the enrichment interface.

It reads persisted successful enrichment records and returns them newest-first as JSON. The volume is mounted read-only; this step has no external side effects.
