# Stride Circle design system

Status: launch design foundation  
Last reviewed: 2026-10-02

This is the implementation contract for the Stride Circle redesign. The screenshot reference establishes the visual language; the launch brief remains authoritative for product behavior, privacy, and scope.

## Home approval update — 2026-10-05

For Home, the user-approved **B — Better together** direction in [HOME_B_IMPLEMENTATION_HANDOFF.md](HOME_B_IMPLEMENTATION_HANDOFF.md) supersedes this document's older cream/lime palette and Home composition. Routine health sync controls/status are removed from healthy Home; private settings holds connection details and recovery. Preserve exceptions for unavailable/incomplete data. Other screens are not automatically redesigned by this decision. Custom motion remains proposed, pending review.

## North star

Make walking feel like a shared daily event.

Every screen should make at least one of these answers obvious:

1. How am I doing today?
2. Who am I walking with?
3. What can I do next?

The core loop is:

```text
Sync steps → see circle progress → choose to walk → compete or cheer → celebrate → return tomorrow
```

## Product guardrails

- The first edition is steps-first and circle-scoped.
- Global rankings, public user profiles, direct messaging, open comments, GPS routes, and paid rewards are deferred.
- Public circles are discoverable, broad-area only, and capped at 20 members.
- Private circles are invite-only and never appear in discovery.
- Health totals are described as synced from Apple Health or Health Connect.
- Cheers are fixed, labeled reactions rather than chat.
- The interface must not expose exact member locations or health details to other members.

## Visual personality

Stride Circle is warm, optimistic, and editorial. It should feel more like a friendly neighborhood walking club than a medical dashboard or a competitive sports tracker.

Use:

- Warm cream canvas and card surfaces.
- Deep teal-black ink for strong hierarchy.
- Lime for the primary invitation to act.
- Coral, lavender, sky, and peach as celebratory supporting colors.
- Rounded cards with restrained borders and soft elevation.
- Inclusive, illustrated avatars and landscape scenes.
- Large numeric moments for steps, rank, streaks, and milestones.

Avoid:

- Blue-only SaaS styling.
- Dense dashboards with many competing metrics.
- Tiny uppercase labels as the primary communication method.
- Visual noise that makes the leaderboard feel punitive.
- Exact maps or visual location pins in public discovery.

## Token source of truth

The code source is [`src/design-system/tokens.ts`](../src/design-system/tokens.ts). The existing [`src/theme.ts`](../src/theme.ts) exports compatibility aliases while screens migrate to the new system.

### Color roles

| Role | Token | Use |
| --- | --- | --- |
| Canvas | `semanticColors.canvas` | Main screen background |
| Card | `semanticColors.card` | Standard content surfaces |
| Soft | `semanticColors.soft` | Secondary panels and progress tracks |
| Primary content | `semanticColors.contentPrimary` | Headings, totals, primary labels |
| Secondary content | `semanticColors.contentSecondary` | Supporting copy and metadata |
| Brand action | `semanticColors.brandAction` | Primary lime CTA and progress fill |
| Brand dark | `semanticColors.brandDark` | Selected tabs and high-contrast controls |
| Success | `semanticColors.successSurface` / `successContent` | Goal completion, verified sync |
| Warning | `semanticColors.warningSurface` / `warningContent` | Stale data, pending permission |
| Danger | `semanticColors.dangerSurface` / `dangerContent` | Errors, destructive actions, reports |
| Information | `semanticColors.infoSurface` / `infoContent` | Health-data and privacy explanations |

Do not use raw hex values in feature screens. Add a new semantic role when a state cannot be expressed by the existing roles.

### Spacing

Use the 4-point base scale from `spacing`:

```text
xs 4 · sm 8 · md 12 · lg 16 · xl 20 · xxl 24 · xxxl 32 · huge 40 · section 48
```

Default screen content padding is `spacing.xxl`. Compact layouts may use `spacing.lg`. Section separation should be `spacing.xxxl` or `spacing.section`, not arbitrary margins.

### Shape

- `radii.xs`: small controls and icon containers.
- `radii.sm`: inputs and compact controls.
- `radii.md`: buttons and medium cards.
- `radii.lg`: standard cards.
- `radii.xl`: hero cards and major surfaces.
- `radii.sheet`: bottom sheets and celebration panels.
- `radii.pill`: badges, segmented controls, and progress bars.

### Typography

Use `AppText` and the `typeScale` variants rather than local font sizes.

| Variant | Intended use |
| --- | --- |
| `display` | Main step total or milestone number |
| `displaySmall` | Secondary numeric hero |
| `headline` | Screen title |
| `title` | Card or section title |
| `titleSmall` | Compact section heading |
| `body` | Primary explanatory copy |
| `bodySmall` | Supporting copy and card metadata |
| `label` | Buttons, tabs, badges, short labels |
| `eyebrow` | Optional context label; never the only explanation |
| `button` | Button labels |
| `numeric` | Inline step, rank, or score values |

Numeric values use tabular numerals and should remain readable when formatted with thousands separators.

### Elevation and motion

- Use `elevation.card` for raised content that needs separation from the cream canvas.
- Use `elevation.floating` for menus, sheets, and temporary overlays.
- Prefer borders over shadows for ordinary cards.
- Use `motion.fast` for press feedback, `motion.standard` for state changes, and `motion.expressive` only for celebrations.
- Respect reduced-motion settings. Celebration confetti, scaling, and entrance movement must have a non-animated equivalent.

## Reusable primitives

The first primitive layer lives in [`src/components/ui`](../src/components/ui):

- `AppText` — typed variants and semantic content tones.
- `Surface` — card, raised, soft, brand, and outline surfaces.
- `Button` — primary, secondary, tertiary, and danger actions with loading state.
- `IconButton` — icon-only controls with a minimum 44px target.
- `Badge` — neutral, brand, success, warning, danger, and info status labels.
- `ProgressBar` — accessible step-goal and completion progress.
- `SegmentedControl` — daily/weekly and discover/my-circles/invites switching.
- `SectionHeader` — consistent section title and optional action layout.
- `StateCard` — empty, info, warning, error, and success recovery states.
- `Divider` — semantic visual separation without repeated one-off styles.

Example:

```tsx
<Surface variant="card">
  <AppText variant="eyebrow" tone="secondary">TODAY&apos;S STEPS</AppText>
  <AppText variant="display" selectable>{steps.toLocaleString()}</AppText>
  <ProgressBar accessibilityLabel="Daily step goal progress" max={goal} value={steps} />
  <Button onPress={openCircle} trailing={<ChevronIcon />}>Walk for your circle</Button>
</Surface>
```

Feature components may compose primitives, but should not redefine button, card, type, or status behavior locally.

## Screen composition

### Today

Hierarchy:

1. Greeting, date, notification, and profile affordance.
2. Large personal step total.
3. Daily-goal progress and sync source/status.
4. Selected circle context and current competitive position.
5. One primary action: walk for the circle or recover step access.

The primary action must change with the real state: permission request, sync recovery, offline queue, or circle progress. Do not show a dead “Start walk” control when GPS tracking is not active in the launch edition.

### Circles

Use a segmented control for `Discover`, `My Circles`, and `Invites`.

Discovery cards show the circle name, broad area, public status, member count as `X / 20`, and an immediate `Join` action for open circles. Private circles never appear here.

### Circle leaderboard

Always show the circle name and scope. The daily/weekly control changes the projection, not the product identity.

Use a podium for the top three, then a calm ranked list. Highlight the current user without shaming lower positions. Show verified/synced step language and provide fixed cheers rather than comments.

### Celebration

Celebration surfaces reinforce behavior after a goal, daily win, weekly recap, milestone, or streak event. They should be dismissible, screen-reader understandable, and actionable without requiring a second navigation decision.

## State rules

Every feature screen needs these states before it is considered complete:

| State | Required behavior |
| --- | --- |
| Loading | Preserve layout shape with skeletons; do not shift the primary action unexpectedly |
| Empty | Explain what is missing and give one useful next action |
| Error | Say what failed, preserve user input, and offer retry or recovery |
| Permission denied | Explain why access helps and provide a settings recovery path |
| Offline | Show last-known values with a stale label and queue/retry language |
| Success | Confirm the result immediately and connect it to the social loop |
| Disabled | Explain why the action cannot run; never rely on opacity alone |
| Full circle | Explain the 20-member limit and offer discovery/invite alternatives |
| Blocked/reported | Confirm the safety action without exposing private moderation details |

## Accessibility contract

- Every actionable control has a text label or an accessible label.
- Icon-only controls use `IconButton` and must describe their action.
- Interactive targets are at least 44px; primary controls use the comfortable 52px target.
- Do not communicate rank, sync status, or errors by color alone.
- Support Dynamic Type and avoid fixed-height containers around multi-line copy.
- Use `accessibilityRole`, `accessibilityState`, and `accessibilityValue` for buttons, tabs, progress, and selected states.
- Keep contrast strong on cream surfaces and test lime controls with dark text.
- Reduced motion must preserve meaning, not remove completion feedback.

## Content rules

Prefer direct, human language:

- `Synced from Apple Health` rather than `Data imported`.
- `Your circle is full` rather than `Limit exceeded`.
- `You are 3rd · 1,320 steps to 2nd` rather than a generic rank number.
- `Private circles are invite-only` rather than a technical join-policy label.
- `Nice work` and `Keep going` rather than open-ended social comments.

Avoid claims of perfect fraud prevention, guaranteed background sync, exact distance to people, or medical outcomes.

## Migration rules

1. New screens import from `@/components/ui` and `@/design-system/tokens`.
2. Existing screens may continue using `@/theme` during migration.
3. Replace local colors and repeated button/card styles as a screen is redesigned.
4. Keep data access and domain rules outside the UI primitives.
5. Add a React Native smoke test for each new interactive primitive or critical screen state.
6. Validate on a narrow phone, a large phone, Dynamic Type, dark system appearance if supported, offline mode, and denied health permission.

## Definition of design-system readiness

The system is ready to drive the full redesign when:

- The Today, Circles, leaderboard, and celebration screens can be composed entirely from tokens and primitives.
- No new feature screen introduces raw hex colors or arbitrary spacing without a documented semantic reason.
- Loading, empty, error, permission, offline, and success states share the same vocabulary and visual hierarchy.
- Component behavior is covered by unit or React Native smoke tests.
- The visual system preserves the social walking loop and does not introduce deferred launch features.
