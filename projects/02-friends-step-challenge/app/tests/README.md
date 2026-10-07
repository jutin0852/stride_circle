# Tracking and persistence regression tests

Run from `app/`:

```sh
npm test
npm run lint -- --max-warnings 0
./node_modules/.bin/tsc --noEmit
```

The tests use Node's built-in runner and the installed TypeScript compiler. They transpile the actual hooks, route helpers, activity persistence, and summary modal, with controlled sensor/storage/Firestore boundaries. The small hook harness explicitly simulates rendering, effect cleanup, callbacks, time, and app-state changes. It is not a real React renderer or a phone emulator. No device permissions or live Firebase records are changed.

Covered: route preservation and segmented drawing, weak/stale GPS, failed or pending resume, duplicate startup, immediate Finish, cancellation, browser foreground auto-pause, native background task persistence, headless/session recovery, permission rationale/denial, sign-out/account startup races, storage/stop failures, Android map fallback/configuration, bounded cumulative step synchronization, offline outbox replay, day rollover and account isolation, provider-sourced Android step refresh, idempotent activity persistence, live History, and Android Back while saving. There are 64 tests; they do not replace real React rendering or hardware tests.

## Physical-device and account checks — pending

Use separate test accounts/circles and an installed iOS/Android build. These checks have not been run by the agent.

1. Walk, pause, move elsewhere, resume, and finish. Earlier segments must remain; paused movement must not add distance or a connecting line. Repeat after weak GPS and a long signal gap.
2. Pause, disable Location Services/access, and try Resume. The existing walk must remain finishable. Restore access and retry; repeated taps must not create duplicate watchers.
3. In a rebuilt native app, grant background access, start a walk, then lock the phone and walk for at least five minutes. On reopening, recording must remain active, elapsed time must include the locked interval, and the route/distance must include the observed movement. Verify Android's recording notification and iOS's location indication, then Pause/Finish and confirm GPS/service recording stops. Repeat with the Activity screen unmounted. Browser recording should still auto-pause on backgrounding.
4. Walk continuously for more than 60 seconds as a member of two walking circles. Verify periodic personal and both circle updates, without waiting for movement to stop. Background and reopen; inspect the latest saved total.
5. Disable connectivity while saving an activity, reconnect, and retry. Verify one activity and exactly one matching circle increment; the completion date must remain unchanged. Android Back must not discard during saving. Test failed membership/rule authorization separately.
6. On Android, test sensor interruption, returning to the app, and restarting it. Session totals must not decrease or double. The UI must make the limited counting scope clear. Full all-day/background Health Connect counting is not implemented.
7. Cross local midnight with Home mounted; old-day totals must stay on the old date. Switch accounts and verify step totals, sync feedback, and History never expose the previous account's values.
8. Keep History mounted while saving steps elsewhere. It must update from the live subscription; verify denied permissions, unavailable hardware, long recovery text, large text settings, and small screens.

9. Decline/cancel background permission: no native service should start, and recovery must explain Settings/build requirements. Test iOS Allow Once and Android's system-settings permission flow, cancellation while startup is pending, and revoking access mid-walk.
10. Terminate the app and reopen it. If the OS stopped the task, recover the recorded portion paused without adding the whole closed-app interval. Recovered Finish/save must retain its original ID, type, and completion date. Switch accounts while startup is pending; old callbacks and controls must not affect the new account's walk.

Force-quit continuation is not guaranteed, and a durable Firebase offline save queue remains outside this work. Do not treat simulated tests or production exports as proof of physical-device behavior. After native/config changes, rebuild rather than only reloading JavaScript. For incremental SDK 57 generation use `expo prebuild --no-clean --no-install --platform android` (the CLI otherwise regenerates native folders).

## Android map preview

There is currently no Google Maps Android SDK key in the reproducible app configuration. `ActivityMap` deliberately renders a text fallback on Android unless a key is supplied; GPS recording and route storage remain independent of map rendering. iOS continues using Apple Maps.

To enable Android map preview, supply `GOOGLE_MAPS_ANDROID_API_KEY` locally (see `.env.example`), using a key restricted to the Android package and signing certificate. `app.config.ts` passes it to the `react-native-maps` config plugin and sets a capability flag for the UI. Rebuild after changing it, and verify the configured map on a real device. No key, Google Cloud account, or billing setup was created by the agent.
