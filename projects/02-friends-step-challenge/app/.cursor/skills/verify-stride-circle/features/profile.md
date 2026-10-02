# Profile

## Sub-features

- View the current profile and selected circle.
- Edit the display name.
- Choose a character avatar.
- Sign out.

## How to get to it (user POV)

Sign in, then select the Me tab. The route is `/profile`.

## Driving it with browser automation

Assert the profile heading and the visible edit-profile, character, daily-goal, and sign-out controls. Open edit profile, change the display name in the `Display name` field, save, and assert that the updated name is visible after returning.

## Gotchas

Profile persistence requires Firebase authentication and Firestore. Avatar SVGs are loaded from DiceBear, so a network failure should be verified as the initials fallback rather than treated as a route failure.

