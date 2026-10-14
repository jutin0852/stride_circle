# App motion coverage

This inventory describes the implemented motion pass, not a request to animate every element. Existing layouts, data calculations, routes, privacy rules and designs remain authoritative.

| Surface | Motion |
| --- | --- |
| Bottom navigation and segmented selectors | Sliding active highlight; native navigation remains immediate. |
| Shared buttons, icon buttons, Home sheet actions and floating circle chat entry | Short, interruptible content press spring; stable hit areas and no pressed border/layout jump. |
| Home steps and goal ring | Existing live-update animation, shortened to 220 ms; cached totals remain quiet. Existing live goal/cheer feedback retained. |
| Create/join circle and walk share sheets | Coordinated sheet/backdrop transitions, handle-only dismissal and cancellation safeguards. |
| Finish/discard walk confirmation | Existing shared sheet transition; no gesture-driven destructive action. |
| History milestones | Shared sheet motion and handle dismissal; animated next-milestone progress. |
| Walking controls | Press feedback and Pause/Resume content transitions; actions are not delayed. |
| Chat messages | New-message fade/lift; historical and paginated messages do not replay. |
| Circle and global podiums | Existing PanelUI growth animation and its reduced-motion support; no additional row-reordering animation. |
| Group, History weekly target and selected-day progress | Transform-driven fill updates from current progress, clamped to the goal. |
| History dates | Press response and selected-day detail transition; single existing selection border retained. |
| Weekly chart | Existing PanelUI UI-thread bar reveal, tuned to 220 ms; axis settling 180 ms. The library respects reduced motion. |
| Discover search | Short field entrance/exit, immediate filtering, focus and blur behavior. |
| Root navigation | Native platform transitions, disabled when Reduce Motion is enabled. |

## Deliberately quiet

- Search result filtering, text entry, error messages, accessibility announcements and live GPS samples must remain immediate.
- Map routes use actual recorded points; no invented movement or decorative tracking trail.
- Settings selection and list navigation keep instant state/opacity feedback; no staggered delays or scroll-triggered reveals.
- Loading indicators keep their native/library behavior. Do not add perpetual decorative loops.
- `CelebrationSheet` and `ActivitySummarySheet` are unreferenced legacy exports, not active screens; they were not migrated just to create unseen animations.
- No mascot asset/runtime, new dependency, demonstration screen or backend change is part of this pass.

## Verification

Automated checks cover state changes, disabled controls, immediate actions, sheet reopening/cancellation and reduced motion. Native touch feel, keyboard timing, graphics performance and platform navigation still require an iOS/Android device check; Jest or web tests cannot prove those.
