# Feature and route map

This map describes the current repository, not the full launch wish list. `Implemented` means the flow exists in code; `Partial` means important pieces or production validation remain; `Missing` means no current user-facing implementation was found.

| Surface | Route / entry point | Status | Current behavior and limits |
| --- | --- | --- | --- |
| Authentication | `/sign-in` | Implemented/partial | Email/password; native Google ID-token exchange and web Firebase popup with cancellation/retry. Google provider and iOS client are configured; updated native build/device proof and Android signing SHA-1 registration remain. See `GOOGLE_SIGN_IN.md`. |
| Home | `/` | Implemented | Daily steps, goal progress, streak, featured circle, daily standings preview, circle switching, cheers, health recovery, and motion states. Walk recording and route planning live in Activity. |
| Circles | `/circle` | Partial | Private invite-only and public open circles, discovery labels, 20-member cap, create/join/leave/manage flows, and a report action on public Discover entries. Approval joining, nearby discovery, admin abuse escalation, and full Functions routing remain incomplete. |
| Circle detail | `/circle/[circleId]` | Implemented/partial | Daily/weekly standings remain primary; compact Activity link opens circle activity, and a chat icon shows device-local unread messages. Server-finalized projection adoption remains incomplete. |
| Circle activity | `/circle/[circleId]/activity` | Implemented/partial | Shared weekly-goal progress and owner goal action, with links to last week’s recap and walk-together plans. |
| Circle weekly recap | `/circle/[circleId]/recap` | Implemented/partial | Shows the previous competition week’s saved circle summary and top-walker snapshot. |
| Circle walk plans | `/circle/[circleId]/walks` | Implemented/partial | Members schedule future walks with a local date/time, optional general landmark or area, details, and a member-only RSVP. Plans do not expose coordinates or routes. |
| Shared circle goal | `/circle/[circleId]/weekly-goal` | Implemented/partial | Circle owner sets a combined weekly step target; current progress and 25/50/75/100% thresholds appear on circle Activity. |
| Circle chat | `/circle/[circleId]/chat` | Implemented/partial | Membership-scoped text chat with optimistic send/retry, member avatars, latest-message subscription, older-message paging, and a local read cursor powering the detail badge. Message/member reporting and local block filtering are available. The badge tracks the newest 50 unread messages on this device; cross-device unread sync, push notifications, server-side content moderation, and Functions routing remain incomplete. |
| Circle management | `/circle/[circleId]/actions`, `/edit`, `/members`, `/reports` | Partial | Owners can assign/demote moderators and remove members; all members can report/block from the roster; owners/moderators can review circle reports. Reports are private to moderators and writes are Rules-validated. Admin escalation, appeals, and deployment of current Rules/indexes remain outstanding. |
| History | `/history` | Implemented | Personal step calendar, month browsing, weekly target progress, seven-day recap, streak/milestones, and saved walk list. Private date-based journal notes are retained in storage but are not exposed in the History screen. |
| Activity | `/activity` | Partial | Visible tab with a location-centered map, first-use foreground location prompt, Start a walk and Plan a walk actions, and a useful permission fallback. Live GPS tracking and blue route rendering are native; web cannot prove device location. |
| Walk recording | `/walk/record` | Partial | Foreground/background-capable GPS recording with pause/resume/finish, step permission requested at first walk start, and save-to-History. Native GPS/health behavior needs device proof. |
| Route planning | `/walk/plan` | Partial | Starts at current location when available; search places or tap map to add stops, request walking directions, and save/reuse routes. Requires Mapbox and network access. |
| Saved walk detail | `/activity/[activityId]` | Implemented/partial | Private saved route and walk summary. Legacy run records remain readable for compatibility. |
| Profile | `/profile` | Implemented | Profile view, character entry point, and sign-out; available from the Profile tab. |
| Profile editing | `/edit-profile`, `/profile-character` | Implemented | Display name and DiceBear character selection. Account deletion and privacy settings are missing. |
| Step goals | `/daily-goal` | Implemented | Preset/custom daily goal plus a Monday-to-Sunday personal weekly target saved to the user profile. |
| Health data | Home health sheet and `src/services/health-data` | Partial | HealthKit, Health Connect, and iOS pedometer fallback with bounded cumulative sync. Native permissions/background/restart behavior still requires physical-device proof. |
| Backend projections | `functions/src/index.ts` | Partial | Initial callables plus scheduled daily finalization and weekly recap generation exist; generated recaps include up to three top-walker snapshots. Deployment and comprehensive function tests remain incomplete. |
| Safety | `/circle/[circleId]/report`, `/circle/[circleId]/reports`, `/blocked-people`; Firestore Rules | Partial | Users can report public circles, members, and chat messages; owners/moderators review reports; owners assign moderators; users manage blocks from member/chat controls and Profile. Blocks hide people locally from circle chat, standings, and recap names, but do not erase shared messages or enforce hiding for other circle readers. Admin escalation, appeals, global profile/cheer entry points, and cloud deployment remain incomplete. |
| Walking reminders | `/walking-reminders`, Profile, Home settings | Implemented/partial | Opt-in local daily reminder at a chosen time, permission/settings recovery, five-second test, and account-scoped on-device preferences. Expo Notifications is configured; native delivery requires an updated build and physical-device verification. Remote chat/recap push alerts remain missing. |
| Analytics/crash monitoring | — | Missing | No analytics contract or runtime monitoring integration. |
| Global leaderboard | `/global-leaderboard`, Discover card | Partial | Public walking podium and ranked list with This Week/All Time views. The client reads server-generated projections; scheduled aggregation code exists, but deployment and production-shaped verification remain. |

## Verification entry points

- App pure/domain tests: `src/**/*.test.ts` through `npm test`; Functions domain tests through `npm --prefix functions test`.
- Activity/background/persistence Node tests: `tests/*.test.cjs` through `npm run test:activity`.
- React Native component tests: `src/**/*.rn.test.tsx` through `npm run test:rn`.
- Firestore Rules tests: `tests/rules` through `npm run emulators:test`.
- Home and History presentation previews: `scripts/*-preview*` and `scripts/check-*-preview.mjs`.
- Harness checks: `npm run verify` (quick), `verify:fast`, `verify:visual`, and `verify:full`.
- User-facing verification contract: `.agents/skills/verify-stride-circle/SKILL.md`.

Web previews do not prove HealthKit, Health Connect, GPS, native navigation, background delivery, or physical-device permissions.
