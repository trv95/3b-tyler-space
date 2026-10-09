Receives Slack’s `/calendar` slash-command webhook and immediately returns an ephemeral button linking the invoking user to the private calendar viewer.

The route uses an external-ID webhook URL. Configure that exact published URL as the Slack command’s Request URL. The response contains no calendar data.
