---
name: verify-stride-circle
description: "Verify Stride Circle through its Expo web fallback or native development build. Use this when proving authentication, Home, Circles, walking activity, History, or Profile behavior after a change."
---

# Verify Stride Circle

This is the canonical verification contract for the current Stride Circle app. Run commands from the Expo project directory, `app/`. The app is an Expo/React Native application with a Firebase backend and native health providers; the web target is a fallback for UI and Firebase-flow checks, not proof of native health behavior.

## Launch targets

Use the least expensive target that proves the change:

```powershell
npm run web -- --port 8081
npx expo start --dev-client
npx expo run:android
```

Use a native development build for HealthKit, Health Connect, native permissions, GPS, and device lifecycle behavior. iOS native builds require macOS or an existing iOS development build service; do not claim iOS-native verification from Windows web testing.

Do not kill processes by name. Stop only a server started for this verification run, and preserve its output or the relevant URL in the evidence.

## Prerequisites

- The project `.env` contains the Firebase values required by the selected target; do not print or commit secrets.
- Use a dedicated test account or the configured Firebase Emulator Suite when a flow writes data.
- Google sign-in requires the platform-specific client IDs and redirect setup documented in `FIREBASE_SETUP.md`.
- Health verification requires a physical native device with HealthKit or Health Connect permissions and available step data.
- GPS verification requires a native device with location permission. The web fallback is not proof of native GPS behavior.
- Do not use production data for destructive checks.
- Public-circle checks must use broad discoverable-area labels and must not expose exact member locations.

## Current routes and labels

- `/sign-in`: `Welcome back`, `Email address`, `Password`, `Sign in`, and account creation with `Create your account` / `Your name`.
- `/`: Home, including `Your walking day, together.`, `Today’s steps`, and `YOUR FEATURED CIRCLE` when the user has an active circle. Routine health synchronization is background work and is not a Home status panel.
- `/circle`: `Circles`, create/join actions, private/public visibility, invite flow, and discoverable circles.
- `/circle/[circleId]`: circle standings with daily/weekly scope and a selected day.
- `/activity`: walking activity with `RECORD WALK`, `Ready to walk?`, `Walk`, and `Start`. This is an optional foreground GPS flow, not running.
- `/history`: `YOUR WALKING STORY`, `Every step counts.`, `Your step calendar`, `A week in your shoes`, and `Saved walks`.
- `/profile`: reachable from Home; profile editing, character selection, and sign-out.
- `/daily-goal`: daily step-goal presets and a custom goal.

## Evidence rules

Record the target, command or URL, exact action, expected result, observed result, and any prerequisite. A passing typecheck, unit test, or web preview does not prove native HealthKit, Health Connect, background sync, notification, or GPS behavior. Use screenshots or logs when they make the result reproducible. Keep test data isolated and clean up only records created for the run.

For normal edits use `npm run verify` (alias `verify:quick`) and targeted tests for changed components. This runs incremental TypeScript, cached lint, and Vitest without Metro, browsers, screenshots, Doctor, or emulators. Use `npm run verify:fast` for broader deterministic checks. Use `npm run verify:visual` only when explicitly requested or rendered UI validation is genuinely necessary; use `npm run verify:full` for milestones, releases, broad architecture changes, or explicit requests. Stronger checks remain unchanged in scope.

Never automatically escalate verification tiers. On infrastructure failure, preserve the error and report visual verification as incomplete rather than claiming success. Permit at most one reasonable retry, then stop. Do not repeatedly restart Metro, clear caches, or retry browser captures. The runner bounds bundle warmup to two attempts in 60 seconds and cleans up its own processes.

## Current verification limits

There is no authenticated end-to-end suite, native UI automation suite, or visual-regression baseline currently configured. The local quick, fast, and full commands are still not proof of native HealthKit, Health Connect, GPS, background delivery, signed entitlements, or physical-device behavior.
