# Stride Circle decision log

Status: active launch decisions  
Last reviewed: 2026-10-02

## D-001 — Keep Firebase for the rebuild

Decision: retain Firebase Authentication, Firestore, Cloud Functions 2nd gen, App Check, and the Emulator Suite.

Reason: the current app already invests in Firebase. A Supabase migration would add data migration, auth migration, and operational risk before the social loop is validated.

## D-002 — Steps are the first-edition metric

Decision: build the launch loop around provider-sourced steps. GPS activities are deferred as a reliable launch dependency.

Reason: background step collection and permission recovery are the core reliability problem. Adding routes and live activity tracking before that is stable increases surface area and privacy risk.

## D-003 — No global leaderboard in edition one

Decision: competition is inside circles only.

Reason: circles are the intended social unit. A global ranking can be added later after retention, fairness, safety, and abuse patterns are understood.

## D-004 — Circle timezone is authoritative for competition

Decision: each circle stores an IANA competition timezone fixed at creation. A timezone change takes effect from the next competition day.

Reason: members need one shared daily boundary. Personal history may still use the user's local timezone.

## D-005 — Twenty-member maximum

Decision: enforce a hard maximum of 20 members with a transaction, a rule-level guard, and backend validation.

Reason: the first edition is a small-group experience and bounded projections are easier to read, moderate, and operate.

## D-006 — Public circles require safety controls

Decision: public circles are discoverable and open to join, but public discovery does not expose exact member locations. Reporting, blocking, owner controls, and moderator controls are launch requirements.

Reason: the product is available to anyone and includes health-adjacent activity data. Safety cannot be postponed until after discovery is open.

## D-007 — Cheers instead of chat

Decision: ship fixed reactions and celebrations, not direct messaging, open comments, or chat.

Reason: this preserves social reinforcement while reducing moderation, privacy, notification, and abuse complexity.

## D-008 — Health data wording

Decision: describe scores as “synced from your health data”. Do not claim that the client can perfectly prevent fabricated activity.

Reason: platform providers are trusted sources, but no client-only system guarantees that every step represents physical walking.

## D-009 — Legacy schema is version zero

Decision: do not destructively rewrite the existing Firestore collections. Use converters, new projections, feature flags, controlled backfill, and rollback.

Reason: existing user history is valuable and a destructive migration would remove a safe recovery path.

## D-010 — Cloud Functions own privileged mutations

Decision: direct client mutations are transitional only. Before public launch, circle membership, finalization, recap generation, notifications, moderation, and account deletion move behind idempotent Cloud Functions 2nd gen.

Reason: authoritative outcomes and cross-document invariants cannot depend on a trusted mobile client.
