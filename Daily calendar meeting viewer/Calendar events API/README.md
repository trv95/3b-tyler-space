Serves the signed-in user’s remaining meetings for the current day from their connected Google Calendar account.

The step reads the user’s Calendar timezone, queries the primary calendar from now through local end-of-day, and returns normalized JSON. It requires the visitor-enabled Google Calendar connector and space authentication.
