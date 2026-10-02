# Activity

## Sub-features

- Select walking or running activity.
- Request location access.
- Start, pause, and finish a recorded activity.
- Review and save an activity summary.

## How to get to it (user POV)

Sign in, then select the Activity tab. The route is `/activity`.

## Driving it with browser automation

Assert `RECORD ACTIVITY` and the activity type control. Browser proof may assert the permission-recovery copy and controls only. For a real activity, use an Android or iOS development build, grant location access, start walking, wait for a route update, finish, and assert the activity summary before saving.

## Gotchas

The web map is a fallback. GPS, background behavior, distance, pace, and route persistence cannot be proven in the web fallback.

