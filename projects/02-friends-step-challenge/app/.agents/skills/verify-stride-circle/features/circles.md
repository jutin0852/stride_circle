# Circles

Routes: `/circle` and `/circle/[circleId]`

Verify:

1. `Circles` shows the user’s circles and the create/join entry points.
2. A private circle is invite-only; a public circle is discoverable and follows its join policy.
3. Membership never exceeds 20 people.
4. Circle standings show daily and weekly scope with the selected competition day.
5. Circle timezone and score projections produce deterministic standings for the same underlying data.
6. Owner/member permissions are enforced for membership actions; reports and blocks do not reveal private activity or exact locations.

Current implementation has initial callable circle operations, but some circle mutations still use transitional client-side repository paths. Treat backend enforcement as a launch validation item.
