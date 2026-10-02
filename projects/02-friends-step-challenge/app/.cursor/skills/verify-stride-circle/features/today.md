# Today

## Sub-features

- Daily step total and goal progress.
- Personal streak and goal celebration.
- Health-data permission and recovery states.
- Selected circle summary and standings entry point.

## How to get to it (user POV)

Sign in, then select the Home tab. The route is `/`.

## Driving it with browser automation

Assert `Today`, `YOUR WALKING SCORE`, `DAILY GOAL`, and `Your circle today`. Select the daily goal panel to reach daily-goal settings. With a native development build and permission granted, assert that the sync row names Apple Health or Health Connect and that the step total is visible.

## Gotchas

Web cannot prove HealthKit or Health Connect. Android requires a development build with Health Connect permissions. The home screen reads Firestore-backed profile and circle state after authentication.

