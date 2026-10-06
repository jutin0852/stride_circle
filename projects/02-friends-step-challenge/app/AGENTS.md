This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Repository truth and documentation authority

Use these sources in this order when deciding what the repository currently is:

1. `src/` and `functions/src/` plus their tests are evidence of current behavior.
2. `docs/CURRENT_STATE.md` and `docs/FEATURE_MAP.md` summarize that behavior for agents.
3. `docs/PRODUCT_SCOPE.md` and `docs/DECISIONS.md` define the current product scope and decisions.
4. `docs/ARCHITECTURE.md` and `docs/DATA_MODEL.md` describe the intended architecture and data direction; they do not prove that every planned slice is implemented.
5. `README.md`, `FIREBASE_SETUP.md`, and `PROJECT_CHECKLIST.md` provide setup and progress context.
6. Historical handoffs, references, and the parent `../PRODUCT_BRIEF.md` are context only and must not override the sources above. In particular, `docs/HOME_B_IMPLEMENTATION_HANDOFF.md`, `docs/HOME_B_MOTION_BRIEF.md`, `docs/IOS_FREE_SIDeload_DEVELOPMENT.md`, and `docs/references/` are not current requirements.

The canonical verification contract is `.agents/skills/verify-stride-circle/`. The `.cursor/skills/verify-stride-circle/` location is a compatibility pointer only. Do not maintain a second independent copy.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run lint and typecheck before declaring any task done.

## Verification

- `npm run verify` (alias `verify:quick`) is the normal per-edit loop: incremental app TypeScript, cached app lint, and Vitest. Add targeted component tests for changed UI, e.g. `npm run test:rn -- src/features/history/walking-calendar.rn.test.tsx --runInBand`. Do not launch Metro, browsers, screenshots, Doctor, or emulators for routine quick verification. TypeScript remains project-wide because file-only compilation would omit the project configuration/dependency graph.
- `npm run verify:fast` runs the deterministic local checks: TypeScript, app lint, Functions lint/build, Vitest, and React Native component tests.
- `npm run verify:visual` runs the existing Home/History browser previews only; use when explicitly requested or rendered UI validation is genuinely needed.
- `npm run verify:full` retains fast checks, Expo Doctor, demo-project Firestore Rules tests, and Home/History previews. Reserve for milestones, releases, broad architectural changes, or explicit requests. Preview processes are started and cleaned up by the runner.
- Never automatically escalate quick verification to visual/full. Infrastructure failures are failures, not product passes: report them separately. Allow at most one reasonable retry, then stop; never loop through Metro/cache/browser restarts. Bundle warmup is capped at two attempts within 60 seconds, with no automatic server restart.
- The full command uses the `demo-stride-circle` emulator path; neither command intentionally connects to production Firebase.
- Browser previews and emulator tests do not prove native HealthKit, Health Connect, GPS, background delivery, signed entitlements, or physical-device behavior.
- The repository expects Node 22 (`.nvmrc`); `scripts/run-emulator-tests.mjs` selects the portable JDK 21 under `.tools` when available.

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `src/app/` — every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code (components, hooks, utils) outside `src/app/`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

### Collaboration rules

- Do not implement, edit code, install dependencies, or otherwise change this project unless the user explicitly asks to implement.
- Do not push commits or otherwise send changes to a remote Git repository unless the user explicitly asks to push.
- Planning, explaining, reviewing, and creating checklists are allowed while implementation is paused.

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md

This project is a walking/fitness mobile application. The current application name may change, so do not treat any current product name as permanent or hard-code branding unnecessarily.

Users can track walking activity, steps, distance, walking sessions, progress, challenges, achievements, leaderboards, and rewards.

The application may eventually support sponsored challenges and brand-funded rewards.

Engineering Philosophy

Build the application for simplicity today while maintaining a clear path to large-scale usage.

Do not prematurely introduce infrastructure such as:

microservices

Kubernetes

Kafka

Redis

distributed queues

database sharding

complex cloud infrastructure

Introduce additional infrastructure only when an identifiable bottleneck justifies it.

When making architectural decisions, consider how the design would behave at:

1,000 active users

10,000 active users

100,000 active users

1,000,000 registered users

This does NOT mean optimizing everything for one million users today.

Prefer designs that can evolve without requiring major rewrites.

Performance Principles

Minimize unnecessary:

API requests

database reads/writes

polling

network payloads

background processing

battery usage

third-party API calls

Walking/step data should not generate a backend request for every individual step.

Prefer local collection and sensible aggregation/synchronization where appropriate.

Design expensive shared data, such as leaderboards and challenge statistics, so caching or precomputation can be introduced later without rewriting the feature.

Mobile-First

The application should remain useful under unreliable or slow internet connections.

Consider:

offline behavior

synchronization

duplicate events

retries

conflict handling

battery usage

background execution limitations

Never assume permanent connectivity.

Trust and Rewards

Never assume client-provided fitness data is automatically trustworthy.

When working on steps, challenges, leaderboards, achievements, XP, or rewards, consider manipulation and abuse.

Do not build excessive anti-cheat infrastructure prematurely, but avoid architecture that makes server-side validation impossible later.

This becomes especially important when rewards have real monetary value.

Cost Awareness

Keep infrastructure inexpensive while the user base is small.

When proposing architecture or third-party services, consider:

current cost

cost as usage increases

free-tier limitations

potential surprise costs during viral traffic

Prefer infrastructure that scales gradually with actual usage.

Before Major Changes

For significant architecture, database, authentication, fitness tracking, challenge, leaderboard, reward, or infrastructure changes:

Inspect the existing implementation.

Understand how the current system works.

Identify the actual problem.

Explain the proposed approach.

Identify scalability, performance, security, and cost implications.

Avoid unnecessary complexity.

Implement only when explicitly requested.

Do not replace working architecture merely because another architecture is theoretically more scalable.

Reviews and Audits

When asked to review or audit the application:

inspect the actual code before making conclusions

cite relevant files

distinguish confirmed problems from theoretical future risks

prioritize findings as:

Fix now

Fix before meaningful scale

Future optimization

Do not build yet

Always prefer evidence from the existing codebase over assumptions.
