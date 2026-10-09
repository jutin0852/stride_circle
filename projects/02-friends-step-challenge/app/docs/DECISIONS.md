# Stride Circle decision log

Status: active launch decisions  
Last reviewed: 2026-10-08

## D-001 — Keep Firebase for the rebuild

Decision: retain Firebase Authentication, Firestore, Cloud Functions 2nd gen, App Check, and the Emulator Suite.

Reason: the current app already invests in Firebase. A Supabase migration would add data migration, auth migration, and operational risk before the social loop is validated.

## D-002 — Steps are the first-edition metric

Decision: build the launch loop around provider-sourced steps. GPS activities are deferred as a reliable launch dependency.

Reason: background step collection and permission recovery are the core reliability problem. Adding routes and live activity tracking before that is stable increases surface area and privacy risk.

## D-003 — Global walking leaderboard is a public Circles discovery surface

Decision: add a public global walking leaderboard inside Discover with `This Week` and `All Time` views. The weekly board uses a shared Monday `00:00 UTC` boundary. Ranks are server-generated integer placements; running is not included in this slice.

Reason: global discovery is now an approved extension of the walking competition loop. Keeping it walking-only avoids mixing activity metrics before running has a separate verified scoring contract.

## D-004 — Circle timezone is authoritative for competition

Decision: each circle stores an IANA competition timezone fixed at creation. A timezone change takes effect from the next competition day.

Reason: members need one shared daily boundary. Personal history may still use the user's local timezone.

## D-005 — Twenty-member maximum

Decision: enforce a hard maximum of 20 members with a transaction, a rule-level guard, and backend validation.

Reason: the first edition is a small-group experience and bounded projections are easier to read, moderate, and operate.

## D-006 — Public circles require safety controls

Decision: public circles are discoverable and open to join, but public discovery does not expose exact member locations. Reporting, blocking, owner controls, and moderator controls are launch requirements.

Reason: the product is available to anyone and includes health-adjacent activity data. Safety cannot be postponed until after discovery is open.

## D-007 — Circle chat stays scoped to the circle

Decision: ship fixed reactions and celebrations alongside one shared, text-only chat room per circle. Do not add direct messaging, open comments, or topic channels in the first edition.

Reason: members asked for lightweight coordination inside the existing social unit. Keeping chat membership-scoped, text-only, and bounded preserves the circle experience while reducing moderation, privacy, notification, and abuse complexity.

## D-008 — Health data wording

Decision: describe scores as “synced from your health data”. Do not claim that the client can perfectly prevent fabricated activity.

Reason: platform providers are trusted sources, but no client-only system guarantees that every step represents physical walking.

## D-009 — Legacy schema is version zero

Decision: do not destructively rewrite the existing Firestore collections. Use converters, new projections, feature flags, controlled backfill, and rollback.

Reason: existing user history is valuable and a destructive migration would remove a safe recovery path.

## D-010 — Cloud Functions own privileged mutations

Decision: direct client mutations are transitional only. Before public launch, circle membership, message writes, finalization, recap generation, notifications, moderation, and account deletion move behind idempotent Cloud Functions 2nd gen.

Reason: authoritative outcomes and cross-document invariants cannot depend on a trusted mobile client.

## D-011 — Lock concept B for Home

Decision: approve B — Better together, with one connected personal-progress/featured-circle panel, compact standings tiles and original playful companion. Preserve the reference and implementation contract in [HOME_B_IMPLEMENTATION_HANDOFF.md](HOME_B_IMPLEMENTATION_HANDOFF.md). This supersedes older Home styling only; it does not approve a new full-app redesign or production changes. Static implementation can precede custom motion after explicit authorization; motion still requires review.

Reason: the user selected B and wants a stable implementation handoff rather than further design generation.

## D-012 — Routine health refresh is invisible on Home

Decision: healthy Home has no Sync button, syncing indicator, provider explanation or routine update timestamp. Connection setup, source explanation, diagnostics and recovery belong in private settings. Home shows only actionable exceptions for unavailable/incomplete data; unknown is never zero. Automatic background delivery is OS-controlled and must be verified separately.

Reason: Home should communicate walking progress and shared circle activity, not internal synchronization work. This changes presentation, not score provenance or the requirement for truthful recovery states.

## D-013 — Add lightweight planning and reflection

Decision: support member-created future circle walk plans with member-only RSVPs and general meetup text; allow the circle owner to set one combined weekly step target. Personal weekly targets and date-based journal notes remain private to the user.

Reason: these features help circles meet and let people reflect on progress without adding direct messages, public activity feeds, exact-location sharing, or a reward economy.
