# Current implementation state

This is a concise implementation snapshot for coding agents. Product scope and decisions remain in [PRODUCT_SCOPE.md](PRODUCT_SCOPE.md) and [DECISIONS.md](DECISIONS.md); the source code and tests are the final evidence of behavior.

## Application

Stride Circle is an Expo SDK 57 / React Native 0.86 / TypeScript mobile app for social walking. It runs on iOS, Android, and a web fallback used for previews and browser-safe checks.

The visible navigation is Home, Circles, Activity, History, and Profile. Activity owns walking, route planning, and the map; the route inventory is in [FEATURE_MAP.md](FEATURE_MAP.md).

## Current services

- Firebase Authentication: email/password, native Google Sign-In ID-token exchange, and a Firebase Google popup on web. iOS OAuth configuration is set up; native login still requires an updated development client and device acceptance. Android additionally requires the real build's signing SHA-1 registration. See [GOOGLE_SIGN_IN.md](GOOGLE_SIGN_IN.md).
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
- Membership-scoped circle chat with optimistic sends, retryable failures, member avatars, paged message history, and a device-local unread badge on circle standings. The badge watches messages newer than a per-circle cursor and is limited to the latest 50 unread messages.
- Public-circle safety MVP: users can report public circles from Discover and report members/messages from circle views; owners can appoint/demote moderators; owners and moderators have a private report inbox; members can block/unblock people from roster/chat and manage the blocked list in Profile. Blocked users are hidden locally from circle chat, standings, and recap names; this does not remove shared messages or prevent other circle members from seeing them.
- Circle standings keep Today/This Week leaderboards and expose a compact Activity link; its destination contains shared weekly-goal progress, the prior-week recap, and links to circle walk plans.
- Circle walk plans with member RSVPs and member-only general meetup labels; circle owners can set a shared weekly step target with visible goal thresholds.
- Circle weekly recap presentation backed by scheduled recap data, including a saved top-walker snapshot.
- Walking reminder settings from Profile and Home settings: local daily time, explicit permission opt-in, five-second test, account-scoped on-device preferences, sign-out cancellation, and foreground permission reconciliation. Native delivery still requires an updated development build and device verification.
- Global walking leaderboard entry in Circles Discover with This Week and All Time views, backed by a server-generated Firestore projection contract.
- Personal History calendar, weekly target progress, recap, saved walks, and private saved route details. The History screen no longer exposes the per-day journal; legacy private notes remain stored but are not surfaced.
- Activity tab with a location-centered map, explicit Start a walk and Plan a walk actions, and a location-permission recovery state.
- GPS walk recording with pause/resume/finish, a live blue route, session step access requested on first walk use, and save-to-History behavior.
- Named place search and map-selected route points, walking directions, and saved-route reuse; raw latitude/longitude entry is not exposed in the planner.
- Loading, empty, error, stale, permission, reduced-motion, and narrow-layout states for the redesigned Home and History surfaces.

## Transitional architecture

The target feature/domain/data/service boundaries are documented in [ARCHITECTURE.md](ARCHITECTURE.md), but the migration is incomplete. Home and History have coordinator/presentation splits; many other routes still call transitional repositories in `src/lib` directly. Circle mutations and circle message writes are still partly direct client Firestore operations even though initial Cloud Functions exist. Legacy run records remain readable, but new activity UI is walking-only.

## Not complete

- Approval joining, platform-wide/admin abuse review and escalation, report appeals/retention tooling, global profile/cheer report entry points, account deletion, privacy/legal surfaces, remote notifications, analytics, crash monitoring, and full App Check wiring.
- The new Firestore Rules and `reports` composite index must be deployed to the target Firebase project before these cloud-backed safety flows work there. Client-side blocks hide content in this app; they do not delete messages or enforce visibility for other readers of the shared circle chat.
- Full server-authoritative circle mutation/projection integration.
- New circle walk/goal Firestore rules, walk-plan index, and recap-function changes must be deployed to the target Firebase project before the cloud-backed additions work there.
- Production deployment and scale validation of the global leaderboard aggregation job.
- Broader challenge/reward systems. Weekly recap UI is present; deploying the recap function is still required for new top-walker snapshots.
- Function integration tests, broader Rules coverage, deterministic authenticated E2E, and native UI automation.
- Physical-device proof for HealthKit/Health Connect and location permissions, background delivery, revocation, restart recovery, timezones, and release builds.

## Verification currently available

- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run test:rn`
- `npm run emulators:test` for Firestore Rules tests
- Development-only Auth and Firestore emulator routing is opt-in and requires a `demo-*` project ID plus an explicit emulator host; it does not connect in production builds.
- `npm run functions:build`
- `npm --prefix functions test` for Functions domain tests covering date-key validation, UTC week boundaries, and server ranking
- `npm run verify` (alias `verify:quick`) for the normal incremental per-edit loop, without Metro/browser startup
- `npm run verify:fast` for the deterministic local verification set
- Fast verification includes activity/background/persistence Node tests and Functions domain tests
- `npm run verify:visual` for explicitly requested/necessary Home/History rendered preview checks
- `npm run verify:full` for fast checks plus Expo Doctor, emulator Rules tests, and Home/History preview checks at milestones/releases or on request
- Isolated Home and History preview servers with Playwright checks under `scripts/`
- Manual web/native verification contract under `.agents/skills/verify-stride-circle/`

The verification runner owns the local Metro and preview-server lifecycle. Browser previews and emulator checks still do not prove native HealthKit, Health Connect, GPS, background delivery, signed entitlements, or physical-device behavior. General quality CI remains outside this phase.
