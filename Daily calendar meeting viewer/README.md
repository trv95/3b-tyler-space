Opens a signed-in user’s remaining Google Calendar meetings for the day from Slack’s `/calendar` command.

The Slack webhook returns an ephemeral **Open calendar** button. The button opens a space-authenticated viewer, where the user connects their own Google Calendar account and sees today’s upcoming events in their Calendar timezone.

Flow:
1. Slack calls [Slack calendar command](<Slack calendar command/>).
2. The user opens [Calendar viewer](<Calendar viewer/>).
3. The viewer calls [Calendar events API](<Calendar events API/>), which queries Google Calendar through a visitor-enabled connector.

External services are Slack and Google Calendar. The workflow reads calendar events but does not modify calendars or send messages. Configure Slack’s `/calendar` Request URL after publishing using the generated external-ID webhook URL.
