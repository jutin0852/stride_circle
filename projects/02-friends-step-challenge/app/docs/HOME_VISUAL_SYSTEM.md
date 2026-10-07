# Home visual system

Home is Stride Circle's visual baseline. New and revised UI should extend this
system rather than introduce a separate look. This guide records the decisions
already visible on Home so the app stays friendly, clear, and deliberately 2D.

## Visual character

- **Bright, active, and social.** White space and sky-blue surfaces keep the
  walking data approachable; teal outlines keep the interface grounded.
- **Purposeful 2D depth.** Important cards and actions use a crisp outline and
  a stronger bottom edge instead of soft shadows or glass effects.
- **One focus per surface.** Cyan is for the primary action/progress state;
  green, yellow, and coral communicate success, milestones, and care states.
- **Friendly confidence.** Nunito Sans uses ExtraBold for the most important
  walking numbers and headings, Bold for labels/actions, and Regular/SemiBold
  for supporting copy.

## Canonical palette

Use `appColors` and `semanticColors` in `src/design-system/tokens.ts`. Do not
copy hex values into screen styles.

| Purpose | Token | Home value |
| --- | --- | --- |
| Screen/card base | `canvas` / `card` | `#FFFFFF` |
| Main content | `ink` | `#173342` |
| Supporting content | `muted` | `#4B606B` |
| Primary action/progress | `blue` / `brandAction` | `#13B5E8` |
| Primary outline/pressed state | `edge` / `brandActionPressed` | `#087CA5` |
| Soft active surface | `ice` / `soft` | `#E8F8FF` |
| Standard outline | `line` / `border` | `#DCE6EB` |
| Strong outline | `panelLine` / `borderStrong` | `#B9E6F5` |

Use the semantic success, warning, and danger pairs for feedback rather than
inventing new status colors. Brand artwork, third-party marks, and geographic
map styling are intentional exceptions.

## Layout and surfaces

- Screen canvas: `canvas`, generous outer padding (normally 20–24 px), and
  a vertical rhythm using the shared spacing tokens.
- Important information card: white `card`, 20–22 px radius, 2 px outline,
  and a 4 px bottom edge. This is the Home hero/circle-card treatment.
- Quiet/informational surface: `soft` or `ice`, with the same outline logic
  when it is interactive or visually important.
- Rows, compact controls, and sheet options may use a lighter 1 px separator
  when the heavier card treatment would be visually noisy.
- Avoid gradients, neutral gray cards, heavy elevation, and arbitrary blue
  surfaces. The interface should feel illustrated and tactile, not glossy.

## Typography

Use `AppText` and `typeScale` where possible. Do not assign `fontFamily` in
individual screens.

| Role | Token / Home use | Weight |
| --- | --- | --- |
| Screen heading | `headline` / `title` | ExtraBold (800) |
| Major walking number | `numeric` / `stat` | ExtraBold (800), tabular nums |
| Card title | `titleSmall` | ExtraBold (800) |
| Action, nav, label | `button` / `label` | Bold (700) |
| Supporting body | `bodySmall` / `caption` | Regular (400) or SemiBold (600) |

Home’s compact labels are 10–12 px, supporting body text is 13–16 px, and
major totals are reserved for the 30–48 px range. Keep these relationships;
do not make every heading a display heading.

## Controls and navigation

- Primary action: cyan fill, teal 2 px outline/4 px bottom edge, dark ink
  icon/text, at least 48 px tall. Pressing lowers the bottom edge and moves
  the control down slightly.
- Secondary action: white fill, standard outline, dark text; use the same
  minimum target and pressed feedback.
- Active choice: `soft`/`ice` fill with a cyan or teal outline. Do not use a
  second unrelated accent color for selection.
- Bottom tabs: canvas background, muted inactive content, teal active content,
  and `ice` active item background. Keep labels bold and compact.

## Migration rules

1. Start with shared semantic tokens and UI primitives before changing a screen.
2. Replace hard-coded screen colors with `semanticColors` or `colors` aliases.
3. Move raw text to `AppText` when touching a screen so Nunito weight mapping
   remains reliable.
4. Apply the strong 2D card/action treatment to primary content and primary
   calls to action—not every list row.
5. Preserve a screen’s information architecture and interaction flow while
   aligning its visual language.
6. Verify Home, History, Circles, Profile, activity, and sign-in after any
   shared-token change.

## Intentional exceptions

- Native maps keep map-specific colors for legibility.
- The Google mark retains Google brand colors.
- Modals use a translucent scrim; use the shared overlay/scrim token.
- A future iOS Liquid Glass tab treatment is an OS-specific navigation variant,
  not a replacement for this app-wide surface system.
