# Current implementation state

This is a concise implementation snapshot for coding agents. Product scope and decisions remain in [PRODUCT_SCOPE.md](PRODUCT_SCOPE.md) and [DECISIONS.md](DECISIONS.md); the source code and tests are the final evidence of behavior.

## Application

Stride Circle is an Expo SDK 57 / React Native 0.86 / TypeScript mobile app for social walking. It runs on iOS, Android, and a web fallback used for previews and browser-safe checks.

The visible navigation is Home, Circles, and History. Profile and the optional walking-activity flow remain reachable from Home. The route inventory is in [FEATURE_MAP.md](FEATURE_MAP.md).

## Current services

- Firebase Authentication: email/password and Google sign-in.
- Cloud Firestore: profiles, circle membership, circles, daily steps, standings data, saved walks, cheers, circle messages, blocks, and reports.
- Cloud Functions 2nd gen: initial callable circle operations plus scheduled daily score finalization and weekly recap generation.
- Health data: native HealthKit on iOS, Health Connect on Android, and a guarded iOS Expo Pedometer fallback for development builds.
- Expo Location and React Native Maps: optional private GPS walking sessions.
- DiceBear CDN: selectable profile characters with initials fallback.

Walking reminders use Expo Notifications for an opt-in daily local notification. There is no remote-push, analytics, crash-monitoring, Firebase Storage, or client App Check integration yet.

## Implemented behavior

- Authentication and profile creation/editing.
- Private invite-only circles and public open circles with a 20-member cap.
- Fixed circle competition timezones and live daily standings.
- Personal cumulative daily steps, bounded synchronization, offline outbox retry, goals, streaks, milestones, and goal celebrations.
- Fixed cheers with Firestore duplicate protection.
- Membership-scoped circle chat with optimistic sends, retryable failures, member avatars, and paged message history.
- Circle walk plans with member RSVPs and member-only general meetup labels; circle owners can set a shared weekly step target with visible goal thresholds.
- Circle weekly recap presentation backed by scheduled recap data, including a saved top-walker snapshot.
- Walking reminder settings from Profile and Home settings: local daily time, explicit permission opt-in, five-second test, account-scoped on-device preferences, sign-out cancellation, and foreground permission reconciliation. Native delivery still requires an updated development build and device verification.
- Global walking leaderboard entry in Circles Discover with This Week and All Time views, backed by a server-generated Firestore projection contract.
- Personal History calendar, private per-day journal notes, weekly target progress, recap, saved walks, and private saved route details.
- Optional foreground GPS walk recording with pause/resume/finish and native map rendering.
- Loading, empty, error, stale, permission, reduced-motion, and narrow-layout states for the redesigned Home and History surfaces.

## Transitional architecture

The target feature/domain/data/service boundaries are documented in [ARCHITECTURE.md](ARCHITECTURE.md), but the migration is incomplete. Home and History have coordinator/presentation splits; many other routes still call transitional repositories in `src/lib` directly. Circle mutations and circle message writes are still partly direct client Firestore operations even though initial Cloud Functions exist. Legacy run records remain readable, but new activity UI is walking-only.

## Not complete

- Approval joining, moderator assignment, complete moderation UI, message reporting/moderation, public-circle safety tooling, account deletion, privacy/legal surfaces, remote notifications, analytics, crash monitoring, and full App Check wiring.
- Full server-authoritative circle mutation/projection integration.
- New circle walk/goal/journal Firestore rules, walk-plan index, and recap-function changes must be deployed to the target Firebase project before the cloud-backed additions work there.
- Production deployment and scale validation of the global leaderboard aggregation job.
- Broader challenge/reward systems. Weekly recap UI is present; deploying the recap function is still required for new top-walker snapshots.
- Function integration tests, broader Rules coverage, deterministic authenticated E2E, and native UI automation.
- Physical-device proof for HealthKit/Health Connect permissions, background delivery, revocation, restart recovery, timezones, and release builds.

## Verification currently available

- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run test:rn`
- `npm run emulators:test` for Firestore Rules tests
- `npm run functions:build`
- `npm run verify` (alias `verify:quick`) for the normal incremental per-edit loop, without Metro/browser startup
- `npm run verify:fast` for the deterministic local verification set
- `npm run verify:visual` for explicitly requested/necessary Home/History rendered preview checks
- `npm run verify:full` for fast checks plus Expo Doctor, emulator Rules tests, and Home/History preview checks at milestones/releases or on request
- Isolated Home and History preview servers with Playwright checks under `scripts/`
- Manual web/native verification contract under `.agents/skills/verify-stride-circle/`

The verification runner owns the local Metro and preview-server lifecycle. Browser previews and emulator checks still do not prove native HealthKit, Health Connect, GPS, background delivery, signed entitlements, or physical-device behavior. General quality CI remains outside this phase.
