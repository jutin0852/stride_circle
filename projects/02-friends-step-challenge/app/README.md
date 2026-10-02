# Stride Circle

**Move together. Keep each other going.**

Stride Circle is a social walking app for people who want more motivation than a personal step counter can provide. It turns movement into a shared experience through small circles, daily and weekly standings, lightweight celebrations, and encouraging reactions.

> **Demo video:** add your uploaded demo-video link here before sharing this repository publicly.

## The problem

Fitness trackers are useful for recording movement, but they can be solitary. Stride Circle explores a simpler social loop: make progress visible to a small group of friends, give everyone a reason to come back each day, and keep the experience encouraging rather than overwhelming.

## What I built

- Daily step tracking using the phone's built-in pedometer
- Personal daily goals, progress, streaks, and milestone celebrations
- Public and private walking circles with a 20-member cap
- Fixed circle competition timezones so members share one daily boundary
- Broad discovery-area labels that never expose exact member locations
- A provider boundary for health-data step totals
- Existing GPS walk/run recording as a deferred or legacy experience
- Daily circle standings and a visual race track that shows each member's live position
- Previous-day results, including the day’s winner and final standings
- Circle management: rename, member management, leave, and owner-only deletion
- Firebase email/password and Google authentication with persistent sessions
- Custom profile characters with a grouped character picker
- Skeleton loading, permission, weak-signal, empty, and error states for the key flows

## Screens

<p align="center">
  <img src="assets/screenshots/home.png" alt="Stride Circle home showing step goal and streak" width="220" />
  <img src="assets/screenshots/circles.png" alt="Stride Circle circles list" width="220" />
  <img src="assets/screenshots/circle-race.png" alt="Stride Circle daily circle race track" width="220" />
  <img src="assets/screenshots/activity-ready.png" alt="Stride Circle activity recording screen" width="220" />
</p>

<p align="center">
  <img src="assets/screenshots/activity-paused.png" alt="Paused GPS activity controls" width="220" />
  <img src="assets/screenshots/history.png" alt="Stride Circle personal history" width="220" />
  <img src="assets/screenshots/profile.png" alt="Stride Circle profile" width="220" />
  <img src="assets/screenshots/character-picker.png" alt="Stride Circle character picker" width="220" />
</p>

## My role

I owned the project end-to-end: product definition, feature planning, interaction design, UI implementation, mobile architecture, Firebase integration, testing, and iteration on real-device feedback.

I deliberately scoped the app as a portfolio-quality product rather than a static interface. That meant designing for actual mobile states—permissions, loading, authentication, empty circles, weak GPS signals, activity recovery, and secure shared data—not just the happy path.

## Technical choices

| Area | Choice | Why |
| --- | --- | --- |
| Mobile app | React Native, Expo, TypeScript | One codebase for iOS, Android, and web-friendly development |
| Navigation | Expo Router | File-based routing for tabs, sheets, and detail screens |
| Authentication | Firebase Authentication | Email/password and Google sign-in with persistent sessions |
| Shared data | Cloud Firestore | Real-time circle membership, shared scores, profiles, and activity data |
| Movement | Health-data provider boundary | HealthKit and Health Connect are the launch targets; the current adapter is a guarded iOS pedometer transition |
| GPS activity | Expo Location + React Native Maps | Records walks/runs, distance, pace, and route context |
| UI | React Native StyleSheet + Expo Vector Icons | Native-feeling layout, accessible tap targets, and consistent visual language |

## Challenges I solved

### Turning private movement into a live group experience

The app separates personal movement from circle data. A member’s daily step total is synchronized into the circles they belong to, allowing each circle to render its own standings and race track without exposing a user’s entire history.

### Designing the daily race track

The race has no artificial finish line. Everyone starts at zero each day; the person with the untied highest step count holds the leader badge. At the end of the day, the standings become final and can be revisited from the circle.

### Reliable device features need honest states

GPS and pedometer features can fail or be unavailable. I added permission guidance, weak-signal messaging, pause/resume controls, recovery paths, and loading placeholders so the app communicates what is happening instead of leaving the user guessing.

### Keeping shared data secure

Firestore security rules restrict access to authenticated users and circle members. Circle owners have limited management privileges, while members can only access their own profile and membership records. Deleting a circle removes it from every member’s circle list.

### Supporting native and web development

Maps use a platform-specific implementation: native builds use the real map experience, while the web build falls back safely instead of crashing on a native-only dependency.

## Project structure

    src/
      app/          Expo Router screens and navigation
      components/   Reusable UI and feedback states
      domain/       Pure scoring, dates, ranking, and validation rules
      services/     Health-data, permissions, analytics, and monitoring boundaries
      hooks/        Screen-facing state coordination
      lib/          Transitional Firebase repositories and shared utilities
    design-system/ Brand tokens, type scale, spacing, motion, and semantic roles
    components/ui/ Reusable accessible UI primitives for the redesign
    docs/            Canonical scope, architecture, data model, decisions, and test matrix
    firebase/        Firestore rules and indexes
    assets/
      screenshots/  Product screenshots used in this README

## Run locally

### Prerequisites

- Node.js (current LTS recommended)
- Java 21+ for Firebase Emulator Suite tests; the local wrapper uses `.tools/jdk-21*` when available
- Expo Go for UI-only work; use an Expo development build for health-data/native work
- A Firebase project with Authentication and Firestore configured

### Setup

1. Clone this repository.
2. Run `npm ci`.
3. Create a local `.env` file from `.env.example` and provide your own Firebase web configuration and Google OAuth client IDs.
4. Use `npm run emulators:test` to start the local Auth/Firestore emulators and run the Security Rules suite. The repository uses the ignored portable JDK in `.tools` when available.
5. Run `npm run typecheck`, `npm run lint`, `npm test`, and `npm run test:rn`.
6. Use `firebase emulators:start` for interactive local Auth/Firestore work, or publish the rules in [firebase/firestore.rules](firebase/firestore.rules) to the intended Firebase project.
7. Run `npx expo start`.

For GPS and pedometer testing, use a physical device and grant the relevant permissions.
Before an EAS development, preview, or production build, configure registered `ios.bundleIdentifier` and `android.package` values in the app config. Native health modules do not run in Expo Go.

## Security and configuration

- Real environment files are ignored by Git; only [`.env.example`](.env.example) is included.
- This repository does **not** contain service-account keys, database passwords, or server-side secrets.
- Values prefixed with `EXPO_PUBLIC_` are bundled into the client app, so they must never contain private credentials.
- Review and publish [Firestore rules](firebase/firestore.rules) whenever shared-data behavior changes.
- Direct client mutations are transitional; authoritative circle state and score finalization move to Cloud Functions before public launch.
- The visual implementation contract lives in [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md), with reusable primitives in `src/components/ui`.

## What I learned

Stride Circle gave me hands-on experience with the difference between building a screen and building a product: designing data ownership, securing shared features, handling device permissions, responding to real-time state changes, and making mobile interactions understandable without a tutorial.

## Future directions

- Native HealthKit and Health Connect step providers
- Cloud Functions score finalization and weekly recaps
- Cheers, reporting, blocking, and moderator tooling
- TestFlight and Android internal-distribution builds
- Global leaderboard, GPS group activities, and advanced challenges in later editions

## License

This project is shared for portfolio and learning purposes. See [LICENSE](LICENSE).
