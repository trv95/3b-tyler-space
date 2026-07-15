Creates a **case in Tines** via the [Cases API](https://www.tines.com/api/cases/) (`POST /api/v1/cases`), titled from the alert and populated with the investigation summary and key indicators.

Reads the enriched+summarized JSON from stdin, adds a `case` object (id and a browser `link`) and passes it downstream to Slack.

Auth via a Tines connector.
