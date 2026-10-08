# Feature and route map

This map describes the current repository, not the full launch wish list. `Implemented` means the flow exists in code; `Partial` means important pieces or production validation remain; `Missing` means no current user-facing implementation was found.

| Surface | Route / entry point | Status | Current behavior and limits |
| --- | --- | --- | --- |
| Authentication | `/sign-in` | Implemented | Email/password and Google sign-in; Google requires OAuth configuration and a native-capable build. |
| Home | `/` | Implemented | Daily steps, goal progress, streak, featured circle, daily standings preview, circle switching, cheers, health recovery, and motion states. |
| Circles | `/circle` | Partial | Private invite-only and public open circles, discovery labels, 20-member cap, create/join/leave/manage flows. Approval joining, nearby discovery, moderation UI, and full Functions routing remain incomplete. |
| Circle detail | `/circle/[circleId]` | Implemented/partial | Seven-day circle race and standings use live Firestore step entries; server-finalized projection adoption remains incomplete. |
| Circle management | `/circle/[circleId]/actions`, `/edit`, `/members` | Partial | Owner edit/delete/member removal and member leave exist. Moderator assignment, reports, blocks, and complete safety controls are missing. |
| History | `/history` | Implemented | Personal step calendar, month browsing, seven-day recap, streak/milestones, and saved walk list. Weekly circle recap presentation is missing. |
| Walking activity | `/activity` | Partial | Optional foreground GPS walk recording with native map, pause/resume/finish, and save-to-history. Web is fallback-only; background GPS and production device proof are absent. |
| Saved walk detail | `/activity/[activityId]` | Implemented/partial | Private saved route and walk summary. Legacy run records remain readable for compatibility. |
| Profile | `/profile` | Implemented | Profile view, character entry point, and sign-out. It is not a visible tab; Home provides access. |
| Profile editing | `/edit-profile`, `/profile-character` | Implemented | Display name and DiceBear character selection. Account deletion and privacy settings are missing. |
| Daily goal | `/daily-goal` | Implemented | Preset/custom daily step goal saved to the user profile. |
| Health data | Home health sheet and `src/services/health-data` | Partial | HealthKit, Health Connect, and iOS pedometer fallback with bounded cumulative sync. Native permissions/background/restart behavior still requires physical-device proof. |
| Backend projections | `functions/src/index.ts` | Partial | Initial callables plus scheduled daily finalization and weekly recap generation exist. Mobile integration and comprehensive function tests are incomplete. |
| Safety | Firestore Rules plus partial client filtering | Partial | Rules contain cheer, block, and report primitives. Complete block/report flows, moderator tooling, and admin review are missing. |
| Notifications | — | Missing | No notification package or service implementation. |
| Analytics/crash monitoring | — | Missing | No analytics contract or runtime monitoring integration. |
| Global leaderboard | `/global-leaderboard`, Discover card | Partial | Public walking podium and ranked list with This Week/All Time views. The client reads server-generated projections; scheduled aggregation code exists, but deployment and production-shaped verification remain. |

## Verification entry points

- Pure/domain tests: `src/**/*.test.ts` through `npm test`.
- React Native component tests: `src/**/*.rn.test.tsx` through `npm run test:rn`.
- Firestore Rules tests: `tests/rules` through `npm run emulators:test`.
- Home and History presentation previews: `scripts/*-preview*` and `scripts/check-*-preview.mjs`.
- Harness checks: `npm run verify` (quick), `verify:fast`, `verify:visual`, and `verify:full`.
- User-facing verification contract: `.agents/skills/verify-stride-circle/SKILL.md`.

Web previews do not prove HealthKit, Health Connect, GPS, native navigation, background delivery, or physical-device permissions.
