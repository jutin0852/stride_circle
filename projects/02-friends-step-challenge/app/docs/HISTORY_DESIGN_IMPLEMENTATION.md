# History: walking habits, made visible

## Direction and scope

Adapt the supplied Streak Society reference into Stride Circle’s walking-only product. The transferable pattern is a warm celebration banner, a tappable monthly calendar, and a dedicated milestone panel. Do not reproduce Duolingo characters, currencies, lives, paid rewards, or punitive reward loss.

History is a **private personal journal**, not another leaderboard. Daily/weekly competition stays inside circles. No global rankings, public profiles, running modes, or new GPS features are introduced here. Existing saved walks remain accessible.

## Screen composition

```text
HistoryRoute — authentication and walk-detail navigation
  HistoryScreen — saved-data subscriptions, month selection, local date
    HistoryView — presentation
      Walking-story header
      StreakBanner — current streak + next milestone + sheet action
      WalkingCalendar — month navigation + selectable days + day summary
      HistoryRecap — last seven calendar days
      SavedWalks — five recent walks, expandable to loaded recent walks
      Privacy / refresh explanation
      MilestonesSheet — celebration hero + reached/upcoming milestones
```

The route contains no Firestore queries, streak calculations, or screen styles. Calendar, date, recap, and milestone logic live in `src/domain/walking-history.ts`; the shared streak engine is in `src/lib/streaks.ts`. Existing Firebase repositories remain in `src/lib` during the architecture migration.

## Reference translated into the app

| Reference | Stride Circle implementation |
| --- | --- |
| Orange Streak Society banner | Peach celebration panel, ink typography, current walking streak, next milestone progress |
| Winged mascot / membership ceremony | Original trophy-and-sparkle composition using existing icon assets; no separate membership concept |
| Monthly streak calendar | Monday-first calendar with connected goal-reaching days, blue protected days, and outlined selection |
| Rewards list with locks | Personal 7-, 30-, 100-, and 365-day streak milestones, clearly reached or still ahead |
| Claim reward | Removed: achievements are recognition, not redeemable prizes |
| Loss of exclusive rewards | Removed: warm encouragement and visibility of the best streak in loaded history |

## Visual system

- Canvas: existing cream; cards: off-white; primary text: dark ink.
- Celebration hero: peach 300 / peach 500. Goal-reaching calendar dates: peach 500; connecting bands: peach 100.
- Streak progress: coral; protected dates: sky; reached milestone cards: soft lime.
- Recap: dark-ink panel with contrasting white totals.
- Typography: existing `AppText` variants; large streak count, clear section titles, tabular calendar numerals.
- Spacing/radii: existing tokens; 24px main panels, 30px sheet corners, generous separation between sections.
- All tappable day cells and controls have at least approximately 44px touch targets at supported widths of 320px and above. Calendar cells are 48px tall.
- At narrow widths, reduce outer gutters rather than shrinking day targets. Main content is bounded on wider displays; text can wrap. Sheet content scrolls independently of its close toolbar.
- No continuous/confetti animation. The milestone modal opens without animation, including for reduced-motion users.

## Data and behavior contract

1. Read personal records only from `users/{uid}/dailySteps` and existing private activities. No schema migration, history deletion, manual steps, or new reward writes.
2. Subscribe to the newest 400 saved step records for the streak overview and seven-day recap. Separately subscribe to the selected month’s date range, so older months remain browsable.
3. Accept valid `YYYY-MM-DD` dates and finite nonnegative saved totals. Ignore malformed records rather than rendering invalid dates.
4. Personal history uses saved local date keys and the phone’s local calendar. This is deliberately separate from circle competition timezones.
5. A goal-reaching completed day advances the streak. Seven successful days earn one automatic protection for the next missed completed day. Another protection requires seven more successful days.
6. Today may extend the streak but never breaks it before midnight. Saved today’s steps are recognized even when the live counter has not loaded.
7. Keep historical protection dates for calendar display and the best streak for milestone recognition, even after the current streak resets.
8. Future days cannot be selected, and navigation cannot advance past the current month. Changing months selects its first day, or today when returning to the current month.
9. Missing record: display a dash and “no steps saved.” A saved zero is displayed as zero. Never infer zero from a failed or pending read.
10. The recap explicitly counts saved days. Totals exclude missing data and dates outside the trailing seven calendar days.
11. Saved activities are filtered by actual `activityType === 'walk'`. Legacy runs are neither deleted nor relabeled as walks. The existing activity query loads the latest 30 activities; the displayed walks are a subset, not an all-time walk archive.
12. Step records update live when Home syncs. Pull-to-refresh restarts subscriptions and retries reads; it does **not** request HealthKit/Health Connect permissions or sync health data itself.
13. Reloading a month, retrying, or changing accounts cannot expose stale records from the prior subscription key.
14. Local-day checks run on foregrounding and once per minute; the default current month follows rollover. Explicitly browsed history remains selected.

## Honest limitations / later backend work

- Historical goal values are not saved today. All goal marks and streaks are recomputed against the **current** goal. The calendar and milestone sheet explain this; changing the goal may change past recognition.
- The newest 400 records are a bounded read, not a durable lifetime streak/achievement ledger. Best streak means **best in this saved-history window**, not a guaranteed all-time record. Protected dates outside that overview cannot be reconstructed in old months.
- Missing saved days can mean either a rest day or a failed sync. This screen cannot distinguish those cases; it does not promise fraud-proof movement verification.
- Before launching permanent achievements, persist per-day goals and server-generated streak/milestone projections, with idempotent backfills and tests. That backend product change is not silently included in a visual redesign.
- Security uses the existing owner-only history/route rules; no rules or production backend deployment is part of this change.

## Complete states

| State | Behavior |
| --- | --- |
| Initial loading | Skeletons; no invented streaks, totals, or empty-history verdict |
| New account / empty month | Empty calendar, dash for selected day, explicit sync guidance, welcoming saved-walk state |
| Saved zero | Visible zero, zero progress, distinct from a missing record |
| Partial goal | Saved total, current goal, and remaining steps |
| Reached goal | Goal label plus connected calendar highlighting |
| Protected day | Blue shield treatment and an explanation; never mislabeled as goal reached |
| History read failure | Localized error and retry; other independent sections remain usable |
| Goal read failure | Show saved steps but suppress calculated streak/milestone claims |
| Walk read failure | Separate retry, without hiding the step calendar |
| Milestones | Scrollable sheet with reached/upcoming status, progress, protection explanation, close/backdrop/back-button handling |

## Verification and preview

Automated checks:

```powershell
npm run typecheck
npm run lint
npm test
npm run test:rn
```

Pure tests cover leap years, month/year boundaries, DST-safe day arithmetic, malformed dates, recap boundaries, milestone thresholds, streak protections, today’s pending goal, and preserved best streaks. Native component tests cover calendar interactions and ready/missing/zero/protected/loading/error/goal-unavailable states.

To inspect the production presentation components without accessing any account:

```powershell
# Terminal 1: use this port for the isolated preview.
npx expo start --localhost --port 8085
# Terminal 2:
node scripts/history-preview-server.mjs
# Open http://127.0.0.1:8090
```

The preview entry is in `scripts`, **not** `src/app`. Its sample data is labeled and never sent to Firebase. Query states: `?state=empty`, `loading`, `error`, or `goal-error`.

With Playwright available locally or through the bundled runtime’s `NODE_PATH`, run `node scripts/check-history-preview.mjs`. It checks 320/390/760px layouts, touch target dimensions, horizontal overflow, date selection, protection explanations, month navigation, milestone scrolling/open/close, and error/empty/loading states. Evidence is written to ignored `.artifacts/history/`.

Device acceptance remains necessary: open History in the installed development client, sync on Home, return to History, browse months, select dates, open and scroll milestones, retry offline reads, and verify VoiceOver/TalkBack, font scaling, safe areas, midnight, and timezone changes. Browser checks do not substitute for those physical-device checks or production Firebase index/rule verification.
