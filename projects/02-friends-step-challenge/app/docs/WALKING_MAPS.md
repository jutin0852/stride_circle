# Walking and Maps

Implementation branch: `Map`. This document describes the implemented native walking
foundation and the external validation still required. No account, subscription, or
purchase was created, and no token is stored in the repository.

## Architecture and Audit

The existing `activity-recording.ts` engine, `background-activity.ts` serialized
location service, bundle-entry task registration, Expo Location/Task Manager,
health-data providers, Firestore activity summaries, circle aggregate transaction,
History calendar, semantic themes, Nunito Sans, and UI primitives are reused.

`react-native-maps` and its optional Google Android key configuration were removed.
The old hidden `/activity` tab redirects to `/walk/record`. Existing activity detail
pages remain available for older records. There is one native recording service,
not a second independent location subscription system. Foreground-only recording
uses the same service and recovery snapshot when background access is declined.

New boundaries:

- `domain/walk.ts`: versioned completed/planned models, validators, geographic
  calculations, formatting, privacy, GeoJSON, and social data allowlist.
- `services/maps/`: token validation, walking directions, optional map matching,
  static images, and theme-aware vector style specification.
- `services/walks/repository.ts`: durable local cache/outbox using the app's existing
  AsyncStorage dependency, followed by owner-only Firestore sync. Local saves do not
  wait for a cloud upload. No second database was introduced.
- `services/walks/session-steps.ts`: sensor totals for the persisted active intervals.
- `features/walks/`: recorder, detail, planner, and privacy-safe share card.
- `/walk/record`, `/walk/[id]`, `/walk/plan`: authenticated Expo Router screens.

## Packages and Compatibility

Added through Expo's SDK 57 installer:

| Package | Version | Purpose |
| --- | --- | --- |
| `@rnmapbox/maps` | 10.3.7 | Native interactive Mapbox maps |
| `react-native-view-shot` | 5.1.0 | Local PNG capture |
| `expo-sharing` | ~57.0.21 | Native image share sheet |

The Mapbox package declares Expo >=47, React >=17, and RN >=0.79. Its native SDK
11.23.1 is pinned in app config. These ranges include this app's Expo 57/RN 0.86;
they are not proof of a successful native build on this exact combination. Expo's
SDK 57 bundled module manifest supplied the capture/sharing versions. TypeScript
and Expo config evaluation are verified separately from native compilation.

Upstream installation references inspected:

- https://github.com/rnmapbox/maps/blob/main/README.md
- https://github.com/rnmapbox/maps/blob/main/plugin/install.md
- Installed Mapbox plugin, package metadata, native download integration, and
  installed Expo Location/Sharing TypeScript APIs.

The versioned Expo docs request was blocked by the cloud network policy. A network
configuration draft adds the documentation host for future inspection. Native maps
are not available in Expo Go; the guarded renderer shows a fallback for missing
tokens or modules. Build a new development client or production binary.

## Configuration and Manual Actions

1. Create a Mapbox account and a public-scoped `pk.` client token. Set
   `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN` in your ignored app `.env` and the appropriate
   EAS environment. No secret `sk.` token is accepted by the map client.
2. If native SDK downloads require authentication, create a separate token with
   `Downloads:Read`. Set `RNMAPBOX_MAPS_DOWNLOAD_TOKEN` as an EAS/GitHub Actions
   secret. Never put it in `EXPO_PUBLIC_` variables, app config, or source files.
3. For the unsigned IPA workflow, add the public token as the GitHub repository
   variable `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN`, and the native download token as the
   GitHub secret above. The workflow passes the latter only to the build process.
   Its free-signing preparation removes both the HealthKit plugin and explicit
   HealthKit entitlements, while leaving production app settings intact.
4. Rebuild the app, for example `npx expo run:ios`, `npx expo run:android`, or your
   existing EAS/unsigned IPA workflow. An OTA update cannot install native maps or
   sharing modules. Linux cloud verification does not compile an iOS binary.
5. Deploy the updated owner-only Firestore rules using the existing Firebase
   deployment workflow. Until then, cloud detail/raw-route/planned-route writes can
   fail; completed walks and planned routes remain on the device with retries.
6. Review/save the cloud environment draft and publish it. It adds the public token
   variable requirement and `docs.expo.dev`, `api.mapbox.com`, and
   `storage.googleapis.com` to the custom allowed-domain list. A saved draft does
   not apply access or create credentials in the running environment.

For cloud npm commands use a writable cache if the agent home is unavailable:
`npm_config_cache=/tmp/stride-npm-cache`. `EXPO_NO_TELEMETRY=1 EXPO_OFFLINE=1` allows
Expo config/install resolution from the installed SDK manifest in this environment.
Use Node 22 as pinned by the repository. This cloud currently executed checks on
Node 24; the native workflow continues to select Node 22.

## Map Design

The functional style JSON uses `mapbox://mapbox.mapbox-streets-v8`; no Studio style
publication is required. It includes land, parks, water, buildings, roads, walking
paths, road names, and place names. Default POI clutter, 3D buildings, and animations
are omitted. Mapbox attribution/logo remain enabled. SDK telemetry is disabled.

| Layer | Light | Dark |
| --- | --- | --- |
| Land | app `background` | app `background` (navy canvas) |
| Buildings | app `borderSubtle`, 70% opacity | same semantic token |
| Roads | #D4E2E7 | #354D58 |
| Parks | #D9EBDD | #253E37 |
| Walking paths | #8EAF9B, dashed | #6C8C82, dashed |
| Water | #C6E2EC | #213D50 |
| Labels | app `muted` / `ink` | same semantic tokens |
| Recorded path and location | app `accent` | app `accent` |
| Planned path | app `muted`, dashed | same semantic token |

Roads grow from 1px at zoom 10 to 6px at zoom 16; buildings begin at zoom 14,
road labels at 13. Labels have canvas-colored halos. Camera changes use no motion;
users can pan, recenter, or fit the full route. Single-point routes use a local zoom,
and missing completed geometry shows an empty-route message instead of a world map.

For optional Studio refinement, reproduce these layer colors, source schema, zoom
stops, halos, and low-POI policy in separate light/dark styles. Retain road/path/place
labels and provider attribution. Do not hide paths to match surface colors. Static
share images currently use Mapbox light-v11/dark-v11 with the app's route color;
interactive maps do not depend on that API. A local route illustration is used when
static images are unavailable, too long for the API URL, or time out.

## Recording, Permissions, and Steps

Start checks location services and foreground access, then explains optional locked
screen recording before asking for background permission. Denied foreground access
has Settings recovery. Declined/unavailable background access can use foreground
recording; the screen identifies that mode, and backgrounding pauses it.

The active snapshot is durable before starting the native service. Pause closes the
active timer/step interval and stops location delivery. Resume starts a fresh route
segment in the same walk. Finish requires confirmation, freezes the session, stops
location delivery, queries final sensor steps, saves locally, and opens walk detail.
Save failure keeps a retryable finished snapshot. A stop failure is visible and
must be retried before the finish screen navigates away.

The existing health provider queries each active session interval, rather than
subtracting today's totals. This is a time-baseline equivalent that excludes steps
outside the walk, handles midnight, and excludes manual pauses. UI refreshes every
15 seconds while the recorder is mounted; completion reads the final closed ranges.
No GPS-derived step estimate is used for actual walks. Missing/denied step data is
shown as unavailable. Connect step data requests the existing provider's permission.

On iOS the existing default pedometer mode supports free-signed builds and historical
interval queries. HealthKit remains explicitly selected only for entitled binaries.
Android uses the existing Health Connect provider; absence of that provider's valid
historical data is not converted into an invented count. Sensor availability,
read authorization, historical range limits, and provider update delays still apply.

## Background, Recovery, GPS, and Battery

Native settings reuse existing iOS background location descriptions/mode and Android
background/foreground-service location permissions. Background recording uses
Expo Location + Task Manager with the existing bundle-entry task registration.
Android displays an active-recording notification. Foreground recording uses the
same state service with `watchPositionAsync` and stops on lock/background.

Current walking sampling: `Accuracy.High`, 5 seconds on Android, 5 meters minimum
displacement, Fitness activity type, automatic OS pauses disabled, visible iOS
background indicator. These constants live in `background-activity.ts`. This is not
maximum navigation accuracy or per-frame sampling. iOS delivery is controlled by
Core Location; its callback interval is not guaranteed to be five seconds.

Samples are timestamp-ordered. Invalid coordinates, duplicate/old/pre-resume samples,
accuracy worse than 35m, and speeds above 8m/s do not extend the cleaned path. Fix
gaps over 15 seconds create separate segments. At least 2m displacement is needed
for a counted segment. Great-circle distances accumulate per segment; no distance
is added across pauses or GPS gaps. Active time excludes manual pauses; elapsed time
includes them. Moving time is a GPS estimate for accepted segments at >=0.3m/s,
not a sensor-confirmed claim. Pace is active seconds per km and unavailable below
20m; formatting handles zero, nonfinite values, and minute rounding.

Raw samples keep timestamp, coordinate, accuracy, altitude, and speed metadata;
rejected but valid fixes remain available privately for debugging. Cleaned display
geometry is independent. Rendering is memoized and capped at 1,500 points while raw
samples remain intact. Existing segmented rendering avoids bridges across gaps.

Reopening restores the snapshot. If the OS ended the task, the walk returns paused
and excludes the unobserved closed-app time; resume uses a fresh segment. A finished
snapshot preserves its original ID and completion time. Force quit, reboot, battery
restrictions, and platform termination can stop updates. This does not promise GPS
recovery while the OS forbids the application from running. Local storage errors
pause the recorder and stop the service instead of claiming durable recording.

## Data, Sync, Privacy, and Sharing

Completed activities include user/ID/title/private notes, timestamps/date, active
and elapsed durations, estimated moving duration, meters, measured steps (nullable),
pace, full raw samples, cleaned display geometry, private endpoints, bounds,
privacy settings, creation/update times, and sync state. Runtime validators reject
corrupt cache/remote records without replacing the stored bytes with an empty list.

Offline activities save in the existing device storage. Small ID indexes point to
individual activity/plan records. Raw GPS uses separate 500-sample local chunks for
both active sessions and completed activities, rather than one ever-growing storage
entry. Home/History load metadata and bounded display geometry, not all raw traces.
Recovery checks missing/truncated chunks, and old inline recording snapshots migrate
on their next durable write. Sync writes raw GPS in
500-sample owner-only Firestore chunks under `users/{uid}/activities/{id}/rawRoute`,
details under `users/{uid}/walkDetails/{id}`, and the existing activity summary and
circle aggregates through their idempotent transaction. Raw chunks are not uploaded
again after successful sync when only title/notes/privacy change. Updates made
during an upload remain pending. Retry happens on reopen/foreground, a one-minute
timer while walk consumers are mounted, and the detail retry button.

Home exposes Start Walk and Plan a Walk without changing its hero. History keeps its
calendar and daily totals; selecting a date exposes the walks for that date, merging
local and cloud records without duplicates. Date-specific cloud queries do not rely
on the previous 30-most-recent activity limit. Older formats open their legacy detail.
The new detail shows map, times, measured stats, title/notes editing, privacy, optional
alignment, and sharing. The Circles aggregate path is retained; a dedicated social
payload supports future activity cards without building a feed in this change.

Default share privacy masks approximately 200m at each end. Both traveled-distance
clipping and radial endpoint exclusion apply, including loops that return home.
Short routes can be entirely hidden. The distance is configurable and the map can
be hidden entirely. Private display remains full, raw GPS is never modified, and
unmasking endpoints requires a warning/confirmation. The social allowlist contains
stats and filtered geometry only, with no raw coordinates, private notes, owner
endpoints, or full-route bounds. Changing privacy invalidates the old share preview.

Map matching is explicit/optional, isolated in a service, and never blocks completion.
It sends only the requested cleaned segments to Mapbox; failures keep the original
display route. Long segments are matched in overlapping chunks of at most 100
coordinates; each chunk incurs an API request, only on explicit user action.
Static images are requested on opening share,
using only privacy-safe geometry. Failed/12-second stalled loads use the local route
illustration. The PNG capture supports Story (1080x1920) and square (1080x1080), then
opens the native share sheet. Web falls back to sharing text.

Location is not logged or sent to analytics. Mapbox receives map tile requests and
explicit routing/matching/static-image requests as part of the requested feature.
Firestore raw/detail records are owner-only, including against other circle members.
AsyncStorage uses the existing app sandbox and is not an encrypted location vault;
device backup and OS protections apply. No new analytics provider was added.

## Planning and Saved Routes

Planner supports current location, map-selected coordinates, accessible numeric
coordinate entry, start/destination/intermediate stops, removal, real walking
directions, distance/time, and explicitly estimated steps. The approximation is
centralized at 0.75m per step. Missing tokens, invalid coordinates, too many stops,
no route, permission failures, and network errors are handled. Stale responses cannot
replace a newer waypoint selection. Loading never displays straight-line guidance.

Routes save offline with owner/name/ID/waypoints/returned geometry/distance/duration.
Pending saves/deletions sync to owner-only `users/{uid}/plannedWalks`; deletions retain
a local tombstone until synced. Cloud routes hydrate without overwriting pending
local edits. Saved routes can be viewed, renamed, deleted, adjusted by removing and
adding stops/recalculating, and passed to the recorder through `routeId`. Planned
and walked routes use different line patterns. There is no turn-by-turn navigation.

## Accessibility and Verification

Screens use shared typography, semantic colors, scrollable content, wrapping stat
rows, accessible names/roles/states, minimum touch targets, pause/recording screen
reader announcements, and motion-free map camera updates. Coordinate inputs are an
accessible alternative to selecting stops on a map. Stats/state do not rely on color.

Run from the app directory:

```sh
npm run verify:quick
npm run test:activity
npm run test:rn -- --runInBand
FIREBASE_EMULATORS_PATH=/tmp/stride-firebase-emulators npm run emulators:test
```

Automated coverage includes recording lifecycle, duration, GPS filtering/segments,
recovery, permission/background/foreground delivery, duplicate starts, stop/storage
failures, stale sensor reads, session intervals, raw/display separation, privacy
ends/loops/short walks, pace/distance, offline saves and retry/edit concurrency,
planned ownership/deletion, directions parsing/waypoint order, missing tokens,
matching fallback, recorder UI, detail empty routes, and share masking.

Final cloud results: TypeScript and ESLint passed through QUICK; Vitest passed
74 tests in 13 files; recorder/map/node suites passed 67 tests; React Native passed
46 tests across 8 suites, including Home, History, Circles, and walking UI. Expo
public config evaluation and npm lockfile dry-run passed. Existing optional peer
warnings remain for Expo worklets and the test renderer's React reconciler; they
are not evidence of native compatibility. No full harness was run.

Firestore emulator verification was attempted twice: first its home-directory cache
was unwritable; the supported `/tmp` cache override then reached a blocked emulator
JAR download at `storage.googleapis.com`. Added owner-only rule tests remain unrun
until that download is available. Native compilation, real map tiles, live APIs,
PNG capture on iOS/Android, and physical sensor/GPS delivery are also outstanding.

Physical device acceptance checklist (iPhone and Android): start outside, check
route/steps/distance, lock and walk, reopen without route loss, manually pause and
walk without accruing stats, resume, confirm finish, verify background service stops,
relaunch after interruption, save offline, retry sync, view by date, mask loop/short
routes, share Story/square, plan/save/delete/follow a route, test both themes, a narrow
phone, and the largest supported text setting. Test foreground-only permission mode
and Android OEM battery restrictions separately. Native device tests cannot be
replaced by the passing JavaScript suites.

## Cost impact

| Addition/service | Cost model | Scale that can trigger payment | Payment details needed to begin |
| --- | --- | --- | --- |
| `@rnmapbox/maps` wrapper | Open source; underlying Mapbox SDK/service has Mapbox terms | SDK mobile monthly active users beyond account allowance | Package install requires none; Mapbox account signup requirements must be checked |
| Mapbox map data/tiles | Usage-based with free allowances | Active-user/tile usage beyond current plan | Current signup/plan rules could not be verified here |
| Mapbox walking Directions | Usage-based with free allowance | Route calculation requests beyond monthly quota | Same Mapbox account requirements |
| Mapbox Map Matching | Usage-based with free allowance; opt-in only | Explicit matching requests beyond monthly quota | Same Mapbox account requirements |
| Mapbox Static Images | Usage-based with free allowance; share preview only | Share map image requests beyond monthly quota | Same Mapbox account requirements |
| `react-native-view-shot` | Free/open source | No per-user or capture charge | No |
| `expo-sharing` | Free/open source | No per-share charge | No |
| Expo Location/Task Manager | Existing free/open-source packages | No SDK per-walk fee | No |
| Firebase Firestore | Existing service; Spark free quota, Blaze usage pricing | Private route storage plus reads/writes exceed project quotas | Existing Spark usage needs no billing upgrade; Blaze requires billing |

Current numeric Mapbox free-tier limits and card requirements were not independently
verified in this restricted cloud. Check https://www.mapbox.com/pricing/ and the
account dashboard before launch; do not treat historical allowances as a guarantee.
Free development is possible within the account's actual allowances, but free use at
arbitrary scale is not promised. A typical one-hour walk creates around 720 GPS fixes
at the Android time interval before displacement filtering, about two raw-route
document writes plus metadata/summary/circle writes on its initial sync. Planning,
matching, and static maps occur only for explicit user actions. No paid routing
provider, new SaaS, subscription, analytics platform, or infrastructure was introduced.
Nothing was purchased and no payment information was entered.

## File Inventory

Added:

- `docs/WALKING_MAPS.md`
- `src/app/walk/{_layout,record,plan,[id]}.tsx`
- `src/domain/walk.ts`, `src/domain/walk.test.ts`
- `src/features/walks/{walk-recorder,walk-detail,walk-planner,share-card}.tsx`
- `src/features/walks/walks.rn.test.tsx`
- `src/hooks/use-walks.ts`
- `src/services/maps/{mapbox.ts,mapbox.test.ts,style.ts}`
- `src/services/walks/{repository.ts,repository.test.ts,session-steps.ts,session-steps.test.ts,share.ts}`

Changed:

- Repository `.github/workflows/ios-unsigned-ipa.yml`
- App `.env.example`, `app.config.ts`, `package.json`, `package-lock.json`
- `firebase/firestore.rules`, `tests/rules/firestore.rules.test.ts`
- `src/app/(tabs)/{activity,history}.tsx`
- `src/components/activity-map.{native,web}.tsx`
- `src/features/history/{history-screen,history-view,saved-walks}.tsx`
- `src/features/home/{home-screen,home-view}.tsx`
- `src/hooks/{use-activity-history,use-activity-tracking.native,use-activity-tracking}.ts`
- `src/lib/{activities,activity-recording,background-activity}.ts`
- `tests/{activity-map.test,background-activity.test,hook-harness}.cjs`

No unrelated screens were redesigned. No push or commit was performed for this task.
