# Home B — Better together: motion review brief

Status: concept B approved; motion prototype pending visual approval.
Updated: 2026-10-05.

## User decision: background health refresh

Remove the routine Sync button, syncing indicator, provider explanation and last-updated line from the healthy Home view. Automatic health refresh belongs behind the experience. OS background scheduling remains best-effort; this decision does not promise continuous delivery or change scoring requirements.

Keep health setup, source explanation, refresh diagnostics and recovery in private Settings / Health connection. Show an actionable Home exception only when access needs attention or today's total is unavailable/incomplete. Unknown is not zero; cached data must not be represented as a confirmed current total. Never celebrate unavailable or stale data.

## Preserve approved concept B

Today’s walking progress, visible streak, one featured circle with switcher, circle standings and competition timezone, compact social update and fixed cheer. Home / Circles / History navigation. Original compact pebble companion, tactile controls, solid branded cards and generous white space. Walking only; no new reward economy, global rankings, chat or lesson path.

## Proposed timing targets

| Event | Choreography | Target | Reduced motion |
| --- | --- | --- | --- |
| First Home greeting | Content immediately visible; companion greets once | 600 ms | Static welcome |
| Button press | Face depresses 2 logical pixels, restrained spring release | 80 ms / ~160 ms | Fill/border feedback |
| Confirmed step arrival | Ring and number update together | 450–650 ms | Immediate final values |
| Confirmed goal crossing | Ring completes, grounded companion hop, small burst, persistent goal label | 1.2–1.6 s | Static celebration and label |
| Streak acknowledgement | Brief flame emphasis | 400 ms | New value and label |
| Confirmed cheer | One pop and persistent sent state | 350–500 ms | Sent label |
| Circle switch | Stable placement, content crossfade | 180 ms | Immediate replacement |
| Optional milestone | Badge reveal, optional dismissible detail sheet | 800–1,200 ms | Static badge |

Durations are design proposals, not platform mandates. System navigation keeps native timing. No idle bouncing, guilt reactions, or routine celebration replay. Deduplicate by user/day/event; combine simultaneous achievements. Keep animation independent of scoring. Screen readers announce meaningful final changes once, not animation frames. Sounds off by default; optional haptics are supplementary.

## Cross-platform prototype

Create a separate Open Design artifact `home-b-motion.html`; preserve `index.html` and earlier explorations. Do not change the production app before human motion approval.

- iPhone: approximate native glass navigation and system sheets; progress/circle cards remain solid. Plan genuine native implementation, older-OS fallback, reduced transparency and increased contrast.
- Android: Material tonal navigation, appropriate elevation/sheets and Back conventions; do not imitate iOS glass. Predictive Back requires native implementation/testing.
- Shared: identity, companion art, functionality, content hierarchy and meaningful motion.
- Reviewer-only controls outside phone UI: platform, confirmed step arrival, goal replay, sample reset, unavailable access, stale/offline, dark appearance, larger text, reduced motion.
- Fictional sample data only. Browser effects/gestures/haptics are not proof of native functionality.

## Review acceptance

1. Default Home contains no routine health-sync controls or status.
2. Confirmed automatic progress arrival is understandable without a Sync action.
3. Goal celebration is nonblocking, deduplicated and has a reduced-motion equivalent.
4. Cheer states distinguish pending, confirmed and failed; duplicate sending is prevented.
5. Unavailable steps are not zero; stale values have an exceptional incomplete-data explanation.
6. Profile reaches a private health-connection settings/recovery surface.
7. iPhone and Android retain the same content with distinct platform navigation styling.
8. Narrow screens, large text, light/dark and accessible focus remain usable.
9. Preserve the original approved prototype and await human motion approval.

Native device verification, real health-background behavior and production implementation remain separate subsequent work.
