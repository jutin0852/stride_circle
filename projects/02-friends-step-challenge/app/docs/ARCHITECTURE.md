# Stride Circle architecture

Status: target architecture for the launch rebuild  
Last reviewed: 2026-10-02

## Principles

1. Screens coordinate presentation and user actions; they do not own business rules.
2. Domain rules are deterministic and testable without Firebase or React Native.
3. Repositories hide Firestore paths, converters, queries, and mutation details.
4. Health providers are behind one platform-neutral interface.
5. Firestore stores read-optimized projections; raw health data and circle standings are separate concerns.
6. All security-sensitive mutations are moved behind callable or HTTPS Cloud Functions before public launch.
7. Every retryable backend operation is idempotent.
8. Feature flags allow the redesigned experience to coexist with legacy reads during migration.

## Source layout

```text
src/
  app/                    Expo Router routes only

  features/
    auth/
    home/
    circles/
    steps/
    leaderboards/
    recaps/
    profile/
    moderation/

  components/
    ui/
    feedback/
    navigation/

  domain/
    ranking/
    streaks/
    dates/
    scoring/
    validation/

  data/
    firebase/
      repositories/
      converters/
      queries/

  services/
    health-data/
    permissions/
    notifications/
    analytics/
    crash-reporting/

  state/
    session/
    local-ui/

  config/
```

The current repository is partway through this move. `src/domain/circles.ts` is the first extracted domain module and `src/lib/circles.ts` is a transitional repository. New features should follow the target boundaries instead of adding more screen-driven Firestore access.

## Runtime boundaries

### Mobile client

The client owns presentation, local UI state, session state, permission prompts, health-provider reads, optimistic loading states, and retry UX. It may request reads through repositories, but it must not decide authoritative winners or write privileged circle state directly.

### Domain

Domain modules own timezone conversion, daily/weekly keys, ranking, tie handling, streaks, capacity validation, score validation, visibility rules, and cheer limits. They should accept plain values and return plain values.

### Data layer

Repositories own Firestore collection paths, query shapes, transactions, converters, legacy adapters, and projection reads. Firestore document shapes must not leak throughout the feature UI.

### Backend

Cloud Functions 2nd gen own circle creation/joining, invitations, moderation mutations, daily finalization, weekly recap generation, notifications, cleanup, and account deletion. Functions must use deterministic operation identifiers so retries do not duplicate work.

## Backend services

- Firebase Authentication for identity.
- Firestore for versioned source records and read projections.
- Cloud Functions 2nd gen for privileged and scheduled work.
- Firebase App Check together with Authentication and Security Rules.
- Firebase Emulator Suite for local Auth, Firestore, Functions, and Rules tests.
- Crash monitoring and analytics with stable event contracts.

## Environment model

Development, preview, and production must use separate Firebase projects or an explicit equivalent isolation strategy. Public configuration is supplied through EAS environment variables; secrets are never committed in `.env` files. The app must expose the selected environment in development diagnostics so accidental production use is visible.

## Migration boundary

The existing schema is legacy version 0. New records should be versioned or stored in the new collection layout. Converters translate compatible legacy profiles, memberships, steps, and activities. The redesigned experience is released behind a feature flag while old and new projections are compared. Legacy reads are removed only after a controlled beta validates parity and rollback.

## Performance and scale guardrails

- Keep circle documents small and avoid unbounded arrays.
- Keep member documents separate from circle metadata.
- Use projections for standings and recaps rather than reading every raw activity on every screen.
- Avoid a single document that receives high-frequency writes from all members.
- Use transactions for capacity and membership changes.
- Use scheduled jobs for finalization and recap generation, not client timers.
- Add Firestore indexes deliberately and validate them against production-shaped data.
- Instrument sync latency, function failures, read volume, and notification delivery.
