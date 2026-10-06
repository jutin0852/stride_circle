# Concept B — Better together: approved Home handoff

Approved direction locked: 2026-10-05 (Africa/Lagos).
Status: design/planning handoff only; production implementation not authorized by this document.

## Superseded Home reference

The user subsequently authorized implementing OpenDesign Home v3. [HOME_V3_IMPLEMENTATION.md](HOME_V3_IMPLEMENTATION.md) is the current implementation handoff. This document preserves the earlier B decisions; its bar, connected panel, tile layout and pending-prototype status no longer describe the latest Home design. Product scope and privacy requirements remain applicable.

## Authority and preserved reference

The user approved composition B, then approved removing routine health-sync UI from Home. Preserve B rather than generate another visual direction.

- Frozen reference: [Home concepts snapshot](references/home-concepts-approved-b-2026-10-05.html). Select **B — Better together** if another concept is displayed.
- Snapshot SHA-256: `AA137E6ABF4CC86B1982A97F21D613CCBB36213E84606D511764722857792489`.
- Original Open Design project: `6d597f00-2b86-4029-af03-f5a15ed8a21d`, artifact `index.html`.
- Snapshot retains A/C and its old sync row as historical evidence. Those are NOT approved implementation requirements. This handoff overrides that row and sample-data behavior.
- [PRODUCT_SCOPE.md](PRODUCT_SCOPE.md) remains authoritative for launch behavior, privacy and scoring. This handoff supersedes the older cream/lime design-system styling **for Home only**; it does not silently redesign every screen.
- [HOME_B_MOTION_BRIEF.md](HOME_B_MOTION_BRIEF.md) holds proposed motion. The interrupted motion draft has not been delivered or visually approved. Static Home can be implemented first after an explicit implementation request; custom motion needs a separate review gate.

## Locked composition

Screen promise: **Your walking day, together.**

1. Lightweight header: private profile entry, greeting and visible streak.
2. Heading followed by ONE connected day panel.
3. Panel top: today's personal step total, goal, small original pebble companion, tactile horizontal progress bar, percentage and remaining steps. Preserve the bar; do not replace it with a ring just because a generic motion example mentions one.
4. Panel bottom: featured circle name, membership count, accessible switcher, current-user rank, competition deadline/timezone, three compact standings tiles and full-width View circle action. Personal progress and circle must feel connected, not like separate dashboards.
5. Compact circle social moment with a fixed cheer.
6. Labeled Home / Circles / History navigation. Profile/settings are accessible through the header. Preserve legacy walking/history access through appropriate routes; do not delete saved activity data to match the three-tab design.

Default Home has NO Sync button, syncing indicator, health-source explanation or last-updated line. Move setup, provider wording, connection diagnostics and manual recovery to private Settings / Health connection. Automatic refresh remains best-effort and OS-controlled, not guaranteed continuous.

The snapshot's reviewer controls, phone hardware frame, concept selector, fictional totals, static countdown and Sample data labels belong to the design reference, not production Home. Do not copy its web implementation into Expo or hardcode its rankings.

## Visual specifications extracted from B

These are reference values in logical layout units, to translate into reusable native tokens and verify visually.

| Role | Reference |
| --- | --- |
| Canvas / solid card | `#FFFFFF` |
| Primary ink / secondary text | `#173342` / `#4B606B` |
| Bright blue / darker tactile edge | `#13B5E8` / `#087CA5` |
| Ice-blue hero / user emphasis | `#E8F8FF` |
| Success green / darker success | `#66CE31` / `#317F1B` |
| Supporting yellow / coral | `#FFD34E` / `#F77768` |
| Neutral border | `#DCE6EB` |
| Day-panel border / bottom edge | `#B9E6F5` / `#E0F1F6` |
| Day panel | 24 radius, 2 border, 16 inner horizontal spacing, 5 bottom-edge depth |
| Hero cap | 22 top radii, 12 vertical spacing, 84-wide companion |
| Screen inset / spacing scale | 20 horizontal; 4, 8, 12, 16, 24, 32, 48 |
| Headline / circle title | 24 / 20, bold rounded hierarchy |
| Steps / body / secondary | ~48–52 / 16 / 12–14; tabular step numerals |
| Progress bar | 20 high, 4 inner inset, 12 outer radius |
| Standings | Three equal tiles, 8 gaps, 36 avatars, 16 step values; current user clearly highlighted |
| Primary action / icon button | 12 radius, 2 border, 3–4 bottom-edge depth; >=48 touch target preferred |

Typography: rounded expressive headings/numerals, readable platform body/control text. The reference uses a browser font fallback stack, not a bundled production typeface. Choose and verify a licensed, actually available font before claiming exact fidelity; respect text scaling. Small reference captions should enlarge where needed for accessibility. Dark-mode colors require reviewed semantic equivalents, not automatic inversion.

Art: original blue pebble, yellow shoes, coral cheeks, dark facial features, pale highlight and grounded shadow. The original vector is embedded in the frozen HTML's `companion()` function. Extract as a separate asset during implementation; preserve original proportions and do not reuse Duolingo characters. Final mascot branding is not locked by approving this exploratory companion.

## Reusable components and data boundary

Suggested components: `HomeHeader`, `WalkingDayPanel`, `PersonalStepProgress`, `WalkingCompanion`, `FeaturedCircleSummary`, `StandingTile`, `CircleSwitcher`, `CircleSocialMoment`, `CheerButton`, `HealthAttentionNotice` and `HealthConnectionSettings`.

Route stays in `src/app/(tabs)/index.tsx`; presentation/coordinating logic can move into `src/features/home/` and shared UI outside routes. Inspect and adapt existing components/hooks before duplicating them. Current relevant hooks include daily goal, daily step record, current circle, circle daily steps, personal streak and goal celebration. Firebase remains behind repositories/services; no screen-owned ranking or membership mutations.

Home data contract must distinguish:

- Personal local-day steps/goal, confirmed/unavailable/stale status and cached date.
- Circle-day score projection, authoritative rank/tie behavior, member count and IANA timezone. Do not substitute personal totals when the circle day differs.
- Featured circle choice, visible permitted member summaries and social events. Respect blocking/moderation filters.
- Cheer idle/pending/sent/failed status; backend confirmation and duplicate-send prevention.
- Confirmed celebration event identity and acknowledgement. Unavailable or stale data never triggers an achievement.

Reference rankings and totals are fictional. Render meaningful standings from backend ordering; choose a documented top-two-plus-you preview if the current user is outside the leaders, retaining true ranks. This preview selection policy is a proposed implementation default, not an already implemented rule. Never fabricate rank, deadline or streak.

## Required states and recovery

| State | Home behavior / action |
| --- | --- |
| First load | Neutral placeholders where values are unknown; no fake zero or routine sync panel |
| Healthy | Confirmed progress and circle context; background work invisible |
| Goal reached | Persistent achievement label; motion proposal is separate |
| No circle | Keep personal progress; one clear create/join action opening Circles |
| Only one circle | Hide unnecessary switcher; preserve full-circle action |
| Circle loading/failure | Localized placeholder or retry without blanking personal progress |
| Health permission missing | Quiet actionable access notice leading to connection settings; unknown totals/rank are em dashes |
| Stale/offline | Keep valid cached values with exceptional “Today’s total may be incomplete” notice; distinguish previous-date data from today's total |
| Cheer pending/failed | Prevent duplicate taps; show pending then confirmed, or recoverable retry; no false sent state |
| Circle removal/account change | Clear inaccessible circle/cache, offer another circle; never leak previous-session data |

Settings explains “synced from your health data,” last success/source, permission recovery and retry. Do not shame users or promise fraud prevention. Keep reporting/blocking accessible through real circle surfaces, not new public profile/contact details.

## Platform and accessibility contract

- Shared: content hierarchy, solid branded cards, tactile controls, companion and core behavior.
- iPhone: evaluate genuine native navigation/sheets and selective supported glass; older-OS opaque fallback, safe areas and back gestures. Glass is not a score-card treatment.
- Android: tonal navigation/elevation, appropriate sheets and Back behavior; no imitation iOS glass. Verify predictive Back in the native app.
- Native navigation API compatibility must be checked against installed Expo SDK 57 documentation before implementation. Dependency additions need compatibility checks and a new development build where native binaries change.
- Label controls, preserve focus after switches/sheets, support VoiceOver/TalkBack and large text. Do not rely on color alone. Permit standings to reflow at narrow widths/large text instead of truncating meaningful values.
- Respect reduced motion, reduced transparency and increased contrast; sounds off by default, haptics supplementary. Custom timings follow the motion brief; system navigation keeps platform timing.

## Ordered implementation checklist — after authorization

- [ ] **Slice 1: static Home fidelity.** Add scoped B tokens/components and original art; remove routine sync chrome in the new presentation; use explicitly marked fixtures only in development review. Review on iPhone and Android before changing every screen.
- [ ] **Slice 2: real data.** Wire personal local-day and circle-timezone projections, featured-circle selection, loading/empty/stale/permission states and private connection settings. Do not treat hiding sync UI as completing background health integration.
- [ ] **Slice 3: interactions/navigation.** Real circle navigation/switching and fixed cheers with pending/error states; preserve legacy routes and private history. Review the three-tab migration rather than silently deleting functionality.
- [ ] **Slice 4: platform shell.** Validate native navigation/sheets, light/dark variants, small screens and accessibility. Avoid a framework/backend migration.
- [ ] **Slice 5: approved motion.** Review progress-bar update, companion greeting, confirmed goal sequence, cheer and reduced-motion equivalent before shipping. Deduplicate by user/day/event and combine simultaneous celebrations.
- [ ] **Slice 6: verification/handoff.** Run lint, typecheck, affected unit/component tests and physical-device checks. Keep beta/rollback boundaries and unresolved health signing/background constraints documented.

## Acceptance tests

- Default Home visually matches B's connected panel, three standings tiles and compact companion; no routine sync controls/status.
- New users understand today's progress, circle and next action without explanation.
- Real totals/ranks/date boundaries are correct; unknown is never zero, previous-day cache is never today's confirmed score.
- Users can switch circles, open the real circle, send one confirmed cheer and recover from failure.
- Health access can be connected/recovered from private settings without exposing health details to circle members.
- Small screen (320 logical width), large text, light/dark, screen-reader focus and reduced motion remain usable on both platforms.
- Background delivery is tested on actual iPhone/Android builds, including restart, offline, revoked permissions and midnight rollover; no browser prototype is claimed to prove this.
- Approved static Home reviewed before motion; proposed motion reviewed before release. No production Sample data or reviewer controls.

Known gaps: no completed motion prototype, no new production implementation, no native-device verification from this handoff. Existing Home currently falls back to `savedSteps ?? 0` when tracking is unavailable; implementation must audit that behavior rather than carrying it into B. Existing navigation has five tabs; the approved three-tab design requires a deliberate route-preserving migration.
