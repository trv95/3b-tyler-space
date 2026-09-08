Provides the authenticated web interface at `/ip-enrichment` for submitting a public IPv4 or IPv6 address.

The browser sends submissions to the internal `/ip-enrichment-submit` endpoint. The page displays validation, enrichment, and delivery results; successful reports are always sent to Slack channel `#3b-demo`. Submitted addresses are not stored.
