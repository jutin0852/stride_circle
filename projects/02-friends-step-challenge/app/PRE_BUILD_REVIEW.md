# Pre-build review — 2026-10-03

Status: Reliability repairs and native locked-screen recording implementation are in place; 66 automated regression tests pass. Physical-device and live Firebase verification remain pending before relying on outdoor tracking.

This review covers source inspection, baseline lint/type checking, and deterministic regression probes against the actual hooks with simulated React lifecycle, time, sensor callbacks, and persistence. Simulations do not replace physical-device testing or live Firebase testing.

## Repair checkpoint — 2026-10-03

- Pause/resume, weak GPS, and long sample gaps preserve earlier route segments without adding artificial connecting distance. Segment boundaries survive saving, downsampling, and map rendering.
- Failed resume keeps the walk paused and finishable. Pending setup is guarded against repeated taps, reset, Finish, unmount, and background interruptions.
- Step saving samples the latest total every 15 seconds, flushes on app-state changes, and coalesces pending updates during slow writes. Date/account context is captured for each write.
- Every walking circle receives daily steps. Partial circle failures expose retry without hiding a successful personal save.
- Android session counts accumulate across sensor resets and persist locally across remounts. The UI and saved source identify this as session counting, not complete all-day tracking.
- History uses a live subscription, and local midnight/account changes isolate counts, records, and sync feedback.
- Activity saves reuse a stable ID in a Firestore transaction so retries cannot double activity or circle totals. The completion date stays fixed across retries.
- Walk is the default. Permission recovery uses platform-neutral copy; Android Back cannot discard while saving. Recorder metrics follow the measured control-sheet height so recovery text does not cover them.
- Native recording uses an entry-point-defined Expo task, with Android foreground-service notification and iOS background-location indication. Leaving the recording screen or locking the phone no longer intentionally pauses the native session.
- The task persists route, duration boundaries, owner, activity type, and stable save ID locally without depending on mounted UI. OS-stopped sessions recover paused without counting the closed-app gap. Pause, Finish, sign-out, and account changes stop/cancel tracking; stop/storage failures expose recovery actions.

Current verification:

- `npm test`: 66 passed, 0 failed. These execute actual source with simulated lifecycle, sensors, task execution, time, storage, map configuration, and Firestore boundaries.
- `npm run lint -- --max-warnings 0`: passed without warnings. Local TypeScript `tsc --noEmit`: passed.
- Android/iOS/web Expo production exports: passed for the background recorder (`work/background-export`).
- Expo configuration introspection confirms iOS `UIBackgroundModes` includes `location` and the Always permission description. Generated Android manifest includes background location and location foreground-service permissions.
- Added SDK-compatible `expo-task-manager` 57.0.21 using Expo install. Existing app configuration edits were retained in `app.json`.
- Android native compilation: FAILED. The initial offline attempt could not resolve the uncached Foojay Gradle plugin. The network-enabled `:app:assembleDebug` retry reached app Java/Kotlin compilation but failed after 50m 16s in `:react-native-screens:buildCMakeDebug[arm64-v8a]` and `:react-native-worklets:buildCMakeDebug[arm64-v8a][worklets]`: `ninja: error: manifest 'build.ninja' still dirty after 100 tries`. CMake also reported object paths exceeding its 250-character limit; the warnings alone do not establish the cause of the regeneration loop. No APK was verified. No connected phone or emulator was available (`adb devices` returned an empty list).
- Native generation note: SDK 57 prebuild regenerated the ignored `android/` folder because this CLI defaults to cleaning; previous native files were not snapshotted. Tracked app source was untouched by that regeneration. Use `expo prebuild --no-clean --no-install --platform android` for future incremental generation; machine-local SDK configuration is supplied through environment variables for verification.
- Android map configuration gap: no Maps SDK API key was present in `app.json` or the generated manifest. Optional `GOOGLE_MAPS_ANDROID_API_KEY` is now wired through `app.config.ts`; without it, Android maps show an explicit fallback instead of mounting an unconfigured native Google map. Recording remains available independently. No cloud account, key, or billing configuration was created.

Remaining boundaries:

- Resolve the Android CMake/Ninja regeneration failure before installing this native change. Investigate generated dependency build files and a shorter build path; do not change global Windows settings, relocate the user's checkout, or delete broad caches without a scoped plan. The Gradle verification process has exited.
- Native background GPS is implemented but not yet phone-verified. A rebuilt native app and background permission are required; Expo Go/web are not proof of support. Browser recording still pauses when leaving the foreground.
- Android does not yet use Health Connect for complete all-day steps. Foreground/session counts are preserved and labeled honestly.
- Local native sessions can be recovered after process termination, but force-quitting is not promised to continue tracking. Recovery conservatively pauses if the native task stopped. Firebase writes are not a durable offline job queue.
- Firestore transaction behavior and security-rule authorization were checked through source/mocks, not against deployed rules or an emulator.
- The physical-device/account checklist in `tests/README.md` has not been executed. Bundling is not an installed-native-build or hardware test.

## Baseline confirmed failures (before repairs)

### 1. Recorded route is lost after pause/resume or poor GPS recovery

Severity: High.

Source: `src/hooks/use-activity-tracking.ts`, `handleLocation`.

When the previous GPS point is cleared, the next accepted sample calls `setRoute([point])`. This replaces the whole route rather than preserving earlier points. Both pause/resume and a weak GPS sample clear the previous point.

Probe results:

- Before pause: two recorded points. After resume: one point. Accumulated distance remained 11.12 metres.
- After a weak sample followed by a good sample: earlier points disappeared.

Required behavior: Keep completed route segments, start a new segment after interruption, and do not count or draw movement across a pause or a gap in reliable GPS.

### 2. A failed resume prevents finishing the existing walk

Severity: High.

Source: `src/hooks/use-activity-tracking.ts`, `resume` and `finish`; `src/app/(tabs)/activity.tsx`, recovery controls.

When Location Services are disabled during a pause, resume changes the status to `error`. The Finish action is only available for `tracking` or `paused`; `finish()` also rejects `error`. The remaining Start action resets the recording.

Probe result: A previously recorded walk returned `null` from `finish()` after resume failed.

Required behavior: Preserve the existing recording and provide Retry Resume, Save/Finish, and Discard options when recording cannot resume.

### 3. Steps do not save regularly during continuous walking

Severity: High.

Source: `src/hooks/use-daily-step-record.ts`, synchronization effect.

Saving waits 15 seconds after a step-count change. Every new count cancels and restarts that timer. A person who keeps walking can keep postponing synchronization. Closing the app before that quiet period also prevents the pending write.

Probe result: Twenty updates three seconds apart produced zero writes over 60 seconds.

Required behavior: Periodically save the latest value during movement, handle foreground/background transitions, retain explicit date and user context, and recover after failed synchronization.

### 4. Android session steps are treated as daily steps

Severity: High for Android.

Source: `src/hooks/use-step-tracking.ts`, Android callback and foreground availability check; `src/lib/daily-steps.ts`, source metadata.

Android directly assigns the watcher count to `todaySteps`. Returning to the app creates a new subscription without preserving the previous total. The same value is used for daily goals, history, and circle scores. The persisted source is also always labeled `ios-pedometer`.

Probe result: A displayed total of 300 became 5 after foregrounding and receiving the new subscription's count.

Required behavior: Establish an accurate Android daily-step source. If session counting is retained temporarily, label it honestly and preserve session progress; do not present it as complete all-day tracking. Expo's [SDK 57 pedometer reference](https://docs.expo.dev/versions/v57.0.0/sdk/pedometer/) documents that historical date-range counting is available on iOS and suggests Health Connect for Android background step data.

## Additional gaps found in source inspection

### Background recording and interruption recovery

The app uses `Location.watchPositionAsync`, which supplies foreground updates only. It has no background task registration or persisted active-session recovery. Duration can continue advancing while route updates are missing. The first subsequent sample can also connect locations across a period when movement was not observed.

The limitation is documented in [Expo's SDK 57 location reference](https://docs.expo.dev/versions/v57.0.0/sdk/location/#locationwatchpositionasyncoptions-callback-errorhandler). Confirm the exact behavior on iPhone and Android with the screen locked before treating recording as reliable outdoors.

### Only the selected walking circle receives daily steps

Home passes one selected walking-circle ID to the saving hook. That hook writes one circle entry. A member of several walking circles therefore has no equivalent automatic fan-out of step totals to the other circles. Recorded activities do fan out to matching circles.

### History can stay stale after a new save

`useDailyStepHistory` fetches once when the user or day-count dependency changes. It does not subscribe to saves or refresh on screen focus. An already mounted History screen can continue displaying old daily-step data.

### Calendar rollover is not a first-class state

The step-saving deduplication key includes circle and steps but not user/date. Saved daily steps are loaded only when the user changes. A mounted session that crosses midnight needs explicit rollover behavior to avoid stale display and missed or incorrectly attributed writes.

### Save and startup interruptions need coverage

The activity summary handles Android Back through `onDiscard`, even while saving disables the visible Discard button. Activity startup also leaves the main control available during asynchronous permission/watcher setup. These paths need tests for pending setup, duplicate taps, Back during save, and leaving the screen.

### Walking defaults and product documentation

- The activity recorder defaults to running.
- Permission and map messages repeatedly assume iPhone, although the app targets Android too.
- The selected design palette has not been applied to the existing theme.
- `PRODUCT_BRIEF.md` and `PROJECT_CHECKLIST.md` describe older scope and progress; the checklist marks several implemented features as unfinished.
- There is no existing project test suite or test command.

## Baseline verification record (before repairs)

- `npm run lint`: passed.
- Local TypeScript `tsc --noEmit`: passed.
- `npm ls --depth=0`: passed; no missing or invalid top-level dependencies reported.
- The original `node work/preflight-check.cjs` probes reproduced five behavioral failures above. That runner has now been replaced with an entry point to the maintained regression suite; its current exit code indicates test pass/fail.
- Expo production exports for Android, iOS, and web: passed. This verifies bundling, not hardware behavior, installed native builds, or live Firebase access.

The regression probe file does not use live accounts, change device permissions, or write Firebase data.

## Original repair and build order

1. Repair route preservation, failed-resume recovery, and recording lifecycle guards.
2. Repair periodic step synchronization, date rollover, multiple-circle synchronization, and stale history.
3. Resolve the Android daily-step behavior and define locked-screen recording support.
4. Add focused automated regression tests for these behaviors and repeat physical-device checks.
5. Build the Home → Quest → Active Walk → Completion → Return Home journey using the selected visual system.
6. Verify permission-denied, weak GPS, offline/save failure, interrupted sessions, long content, and repeated actions alongside the normal journey.

No audit can prove an app has zero bugs. Release confidence requires both automated regression checks and real-device/account verification of hardware and shared-data behavior.
