# Stride Circle launch checklist

This checklist follows the canonical first-edition scope in [docs/PRODUCT_SCOPE.md](docs/PRODUCT_SCOPE.md). A checked implementation item means the code or configuration exists; release verification items remain unchecked until the relevant real-device or emulator/integration proof passes.

## Foundation

- [x] Firebase remains the backend; no destructive schema rewrite.
- [x] Expo Router and TypeScript remain the mobile foundation.
- [x] EAS development, preview, and production profiles exist.
- [x] Firebase Emulator Suite configuration exists.
- [x] Feature-based architecture and domain/data/service boundaries are documented.
- [x] Typecheck, lint, and Vitest scripts exist.
- [x] Pure tests cover ranking, ties, totals, and timezone conversion.
- [x] Jest + React Native Testing Library smoke-test tooling exists.
- [x] Stride Circle design tokens and reusable UI primitives are documented and tested.

## Circle experience

- [x] Private circles are invite-only and hidden from list queries.
- [x] Public circles can be discovered and joined openly.
- [x] Circle membership has a 20-member cap in client validation and rules.
- [x] Circle roles include owner, moderator, and member in the data model.
- [x] Circle competition timezone is stored and used for daily score boundaries.
- [x] Public circles can store a broad discovery-area label without exact location.
- [ ] Move the remaining circle creation, joining, leaving, deletion, and moderation client mutations behind Cloud Functions 2nd gen. Initial callable functions exist, but the app still uses direct Firestore for several operations.
- [ ] Add approval join policy and owner/moderator management UI.
- [x] Add initial server-generated daily score projections and weekly recap jobs in Cloud Functions; connect and validate their projections in the app before launch.
- [x] Add daily live standings with deterministic tie handling. Weekly standings/recap presentation remains incomplete.

## Health data

- [x] Step tracking is accessed through a provider interface.
- [x] Personal totals continue to use the user's local date.
- [x] Circle totals use the circle timezone.
- [x] Android foreground-only pedometer values are not saved as daily totals.
- [x] Add the native HealthKit provider for iOS.
- [x] Add the native Health Connect provider for Android.
- [x] Add permission re-check/recovery states and bounded offline queueing/retry synchronization in code; physical-provider validation remains below.
- [ ] Validate background and device-restart behavior on real devices.

## Motivation and safety

- [x] Add personal daily streaks, milestones, goal celebrations, and fixed cheers in the current client experience; weekly recap UI remains incomplete.
- [ ] Add reporting UI for circles, members, cheers, and profiles. Firestore Rules primitives exist.
- [ ] Add complete blocking UI and blocked-surface filtering. Block records and limited cheer filtering exist.
- [ ] Add owner removal and moderator assignment through backend authorization.
- [ ] Add admin report review tooling and abuse runbook.
- [ ] Add privacy policy, Terms, and health-data disclosures.

## Backend and quality

- [x] Add Cloud Functions 2nd gen package and idempotent circle/score mutations.
- [x] Add scheduled daily finalization and weekly recap jobs in code; notification and cleanup jobs remain incomplete.
- [ ] Add Firebase App Check and production monitoring.
- [x] Add Security Rules tests against Auth/Firestore emulators.
- [ ] Add function integration tests and rule coverage review.
- [ ] Add GitHub Actions for install, typecheck, lint, unit tests, and security scans.
- [ ] Add crash monitoring and analytics event contracts.
- [ ] Add Maestro smoke tests for onboarding, permissions, circles, and safety flows.

## Release gates

- [ ] Closed beta with multiple circles and two real platforms.
- [ ] Firestore read/write volume and cost review with production-shaped data.
- [ ] Public-circle safety review completed.
- [ ] Preview and production Firebase projects are separate.
- [ ] Production build and store metadata are ready.
- [ ] Incident, rollback, account deletion, and data-retention runbooks are tested.
- [ ] Global leaderboard remains deferred to a later edition.
