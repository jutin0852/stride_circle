# Home v3 implementation

The OpenDesign `home-b-motion-refined-v3.html` is the current visual reference for Home. It supersedes the initial B handoff's bar, connected panel, and standings tiles with v3's compact ring, separate progress/circle surfaces, and aligned standings rows. The earlier documents and reference remain historical evidence.

## Production components

- `src/app/(tabs)/index.tsx` routes to `features/home/home-screen.tsx`.
- `HomeScreen` coordinates the existing health, goal, streak, circle, and score subscriptions.
- `HomeView` owns presentation and private health/circle sheets. It has no Firebase access and also powers the isolated test preview.
- Scoped colors support light/dark; layout supports narrow widths, wrapping, text scaling, and safe areas.
- `WalkingCompanion` is the original B SVG, with static helpful/happy poses and a grounded greeting/goal hop.

## Behavior

Normal Home has no routine Sync/status/provider row. Unknown totals are em dashes, confirmed zero is a valid starting day, and cached totals display an incomplete-data notice. Goal achievements require a confirmed total and loaded goal. An initial completed goal is static; only a live crossing can play the locally deduplicated animation. Progress count and ring share one 550ms timeline. Reduced motion renders final values with no greeting, hop, particles, cheer scaling or circle fade. Existing OS health scheduling is unchanged.

Circle standings retain their actual tied ranks and preview the leaders plus the current user. They read circle-day scores rather than substituting personal local-day totals. Score synchronization reads the provider from the circle's midnight independently of the personal day, including DST boundaries. Countdown uses the circle's IANA timezone. Missing scores remain unranked. Cache scope changes on user/day/circle changes.

The social moment says a member is making strides using a real recorded score. It does not fabricate a goal-achievement event or infer another member's personal goal. Nice work uses the existing immutable Firestore cheer schema/rules, with a deterministic sender/recipient/circle-day ID, transaction-based duplicate prevention, pending/error recovery, and server-confirmed sent feedback. Outbound blocked users are hidden; existing rules also reject interaction when the recipient has blocked the sender. Mutual blocking across all surfaces, rate limiting and backend projections remain launch work.

Home/Circles/History are visible tabs. Profile and the legacy walking activity routes remain accessible from the header's private sheet; saved history is preserved. Native platform navigation is retained. No new Liquid Glass dependency or unverified iOS-specific effect is introduced in branded cards.

## Verification

- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run test:rn`
- `node scripts/check-home-preview.mjs`

The preview uses the actual production presentation component with clearly marked fictional data and no Firebase writes. Start Metro on 8085, then `node scripts/home-preview-server.mjs`; it serves at `http://127.0.0.1:8091`. Browser checks exercise narrow/tablet widths, long names, private sheets, circle selection, cheer confirmation, goal state, dark mode, and reduced motion. It is not a device/health-provider test.

Still requires real iPhone/Android validation: HealthKit/Health Connect permissions and background delivery, native font scaling and VoiceOver/TalkBack focus, OS Back behavior, signed health entitlements, and live Firebase transaction/rule deployment. The current provider and legacy score path are retained; this UI work does not complete the server-authoritative launch architecture.
