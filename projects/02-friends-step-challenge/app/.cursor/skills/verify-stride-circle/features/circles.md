# Circles

## Sub-features

- Create an invite-only private walking circle.
- Create a public discoverable circle.
- Join a private circle with an invite code.
- Join an open public circle.
- Enforce the twenty-member cap.

## How to get to it (user POV)

Sign in, then select the Circles tab. The route is `/circle`.

## Driving it with browser automation

Assert `Circles`. Select `Create or join a circle`, assert the `Create` and `Join` choices, then assert `Private` and `Public`. For a configured test account, create a private walking circle and verify that the new circle appears in the member list. Use a separate test account to exercise invite joining and public joining.

## Gotchas

Firestore rules and authentication are required. Public discovery uses broad area labels and must not expose exact user locations. Do not use production accounts for destructive member or circle tests.

