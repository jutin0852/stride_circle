---
name: verify-stride-circle
description: "Verify Stride Circle through its Expo web fallback or native development build. Use this when proving authentication, Today, Circles, Activity, History, or Profile behavior after a change."
---

# Verify Stride Circle

This is the project-local verification contract for the Stride Circle Expo app. It drives the app as a user would and keeps proof separate from unit and rules tests.

## Launch

Run from the Expo project root.

```powershell
Set-Location "C:\Users\jutin\.codex\worktrees\9d52\FRONTEND ENGINNEER\projects\02-friends-step-challenge\app"
npm run web -- --port 8081
```

The instance is ready when Expo reports that the web bundle is waiting on `http://localhost:8081` and a request to that URL returns successfully. Use the web fallback for navigation and layout proof.

For native step and GPS behavior, use an Android development build.

```powershell
npx expo run:android
npx expo start --dev-client
```

The project has native HealthKit and Health Connect configuration. Expo Go is not sufficient for those paths. iOS native verification requires macOS or an EAS development build.

The app needs `app/.env` with Firebase values before an authenticated user can reach the tabs. The committed `.env.example` names the required variables. Do not commit `.env`.

Stop only the server started for the run. Use its terminal and press `Ctrl+C`, or retain its process ID and stop that exact process. Do not kill by process name.

## Doctor

Run this before driving an instance.

```powershell
$uri = [Uri]"http://localhost:8081"
$response = Invoke-WebRequest -Uri $uri -UseBasicParsing -TimeoutSec 10
if ($response.StatusCode -ne 200) { throw "Expo web server returned $($response.StatusCode)" }
if (-not (Test-Path -LiteralPath ".env")) { Write-Warning "Firebase configuration is missing. The sign-in gate is testable, authenticated tabs are not." }
Write-Output "Stride Circle verification server is reachable at $uri"
```

This check proves only that the expected Expo web instance is reachable. It does not prove authentication, health permissions, Firestore writes, or native background behavior.

## Drive

Use browser automation or a real browser against `http://localhost:8081`. Prefer accessible labels and visible text over coordinates.

- Authentication starts at `/sign-in`. Use the `Email address`, `Password`, and `Your name` fields. The `Sign in` and `Create an account` controls exercise the Firebase boundary. The `New to Stride Circle? Create an account` control switches modes without network access.
- Today is the Home tab at `/`. After authentication, assert `Today`, `YOUR WALKING SCORE`, and `Your circle today`. The `Enable step tracking` control is a native permission boundary. Do not count a web unavailable state as proof of HealthKit or Health Connect.
- Circles is the Circles tab at `/circle`. Assert `Circles`, then exercise `Create or join a circle`, `Private`, and `Public`. Public discovery requires Firestore data and a configured user.
- Activity is the Activity tab at `/activity`. Assert `RECORD ACTIVITY` and the `Start walking` or equivalent primary control. GPS permission and route updates require a native development build.
- History is the History tab at `/history`. Assert `YOUR HISTORY`, `Your progress`, and a step-day summary. Firebase-backed history requires an authenticated user.
- Profile is the Me tab at `/profile`. Assert the profile heading and the edit-profile or character controls. Profile persistence requires Firebase authentication and Firestore.

Drive one feature per proof run. Reset to the sign-in route or relaunch between runs when auth or permissions make the state ambiguous.

## Evidence

Store proof under `.artifacts/verification/` in the Expo project. Keep evidence after cleanup.

Each proof should contain:

1. The exact launch command and checkout path.
2. The doctor output and Expo URL.
3. The user action, such as selecting `Create an account`.
4. The resulting visible state, such as the `Your name` field becoming visible.
5. Any side effect that can be observed, such as the route changing or a saved document appearing.
6. The exact prerequisite when a feature is unreachable.

A passing TypeScript check, unit test, or Rules test is supporting evidence. It is not a substitute for driving the user-facing route. A web bundle is not proof of native health access.

## Cleanup

Stop the Expo process started by the run. Remove only temporary browser profiles or scratch files created by the run. Never delete the evidence directory. If a drive fails, clean up before retrying and run Doctor again after relaunching.

## Helpers

No helper script is required. The Doctor command above is the canonical read-only check. If a future harness script is added, keep it under this skill directory and document its exact invocation here.

