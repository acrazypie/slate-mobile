# Google OAuth verification: justification and demo

Text for the **"How will the scopes be used?"** field, and the plan for the demo video.

## Justification (paste into the field, under 1000 characters)

Slate is a weekly time-block planner. Its Android app (com.egenesio.slate) uses two Google Calendar scopes, and only on the user's own device:

- calendar.events: when the user turns on "Copy blocks to Google", the app creates, updates and deletes the user's own planner blocks in a calendar named "Slate" in their account. When the user turns on "Show Google events", the app reads events from the user's calendars for the week on screen so they appear next to the planner.
- calendar.calendarlist.readonly: lists the user's calendars so they can choose which ones to show.

Slate has no server that receives calendar data. Requests go directly from the phone to Google, and the access token is kept only on the phone. Read-only access to Google events is needed to display them; write access is needed only for the Slate calendar copy. Narrower scopes are not enough: the app must read event times and titles to draw them, and must create events in the user's calendar to copy blocks there.
