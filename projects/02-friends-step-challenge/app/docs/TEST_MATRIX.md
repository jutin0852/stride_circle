# Stride Circle launch test matrix

Status: working verification contract  
Last reviewed: 2026-10-02

## Unit tests

Domain tests must run without Firebase or a device and cover:

- Daily and weekly ranking.
- Tie handling and deterministic ordering.
- Circle timezone date boundaries.
- Weekly totals and consistency/streak rules.
- Score validation and non-negative values.
- Circle capacity and visibility/join-policy validation.
- Cheer limits and duplicate prevention.
- Idempotency keys for finalization, recaps, and notifications.

## Emulator integration tests

Run against Firebase Auth, Firestore, Functions, and Security Rules emulators:

- Unauthenticated users cannot access app data.
- Private circles cannot be discovered.
- Private invite codes cannot be reused incorrectly.
- Public open circles can be joined once and stop at 20 members.
- Approval and invite-only policies reject open joins.
- Members see allowed aggregate scores but not raw routes.
- Only owners can delete circles.
- Owners can remove members; moderators can perform allowed moderation actions.
- Ordinary users cannot assign roles or edit another user's score.
- Clients cannot write arbitrary winners, ranks, or finalized recaps.
- Blocked users cannot interact on relevant surfaces.
- Reports cannot be edited by the reported user.
- Retried backend operations do not duplicate members, scores, recaps, cheers, or notifications.
- Account deletion removes or anonymizes required records.

## Device and provider tests

Run on real iPhone and Android devices, with a development build:

- First launch and registration.
- Health permission grant, denial, revocation, and recovery.
- Background step updates through HealthKit and Health Connect.
- Device restart and app restart.
- Offline step reads queued and synchronized later.
- Midnight rollover in the circle timezone.
- User timezone change while in a circle.
- Multiple circles and selected-circle switching.
- Two users competing in one circle.
- Public discovery without exact location exposure.
- Public join, capacity rejection, removal, blocking, and reporting.

## Release checks

- TypeScript passes.
- Expo lint passes.
- Expo Doctor is clean or every warning is documented.
- Security Rules coverage is reviewed.
- Preview and production Firebase projects are distinct.
- Crash monitoring receives a test event.
- Analytics event names and payloads match the contract.
- Firestore indexes are deployed and tested against production-shaped data.
- Rollback and incident runbooks have been exercised.

## Current implementation checkpoint

The circle domain model, public/private circle UI, transitional Firestore rules, HealthKit/Health Connect adapters, idempotent Cloud Functions, health-provider boundary, pure-domain tests, React Native smoke test, and emulator-backed Firestore Rules tests are implemented. Native device verification, App Check wiring, function integration tests, moderation flows, location-safe discovery, and device test automation remain subsequent slices.
