# Stride Circle launch data model

Status: target versioned model  
Last reviewed: 2026-10-08

## Identity and private data

```text
users/{userId}
users/{userId}/settings/{document}
users/{userId}/devices/{deviceId}
users/{userId}/dailySteps/{dateKey}
users/{userId}/weeklyRecaps/{weekKey}
users/{userId}/activities/{activityId}
users/{userId}/circleMemberships/{circleId}
users/{userId}/walkingJournal/{dateKey}
```

`users/{userId}/activities` remains private. A route or GPS trace must never be copied into a circle document or a member-visible projection.

Suggested private step document fields:

```text
dateKey, localDate, timezone, stepCount, source, syncedAt,
syncState, providerRecordVersion, schemaVersion
```

`source` is a provider label such as HealthKit or Health Connect. It is not a promise that the data is fraud-proof.

The user profile stores `dailyStepGoal` and `weeklyStepGoal`. The weekly target is private and follows the user's local Monday-to-Sunday calendar. Journal documents contain `dateKey`, `note`, `createdAt`, `updatedAt`, and `schemaVersion`; only the owning user may read or write them.

## Global leaderboard projections

```text
globalLeaderboards/{boardId}
globalLeaderboards/{boardId}/entries/{userId}
```

At launch, `boardId` is either `walk_week_{mondayUtcDateKey}` or `walk_all_time`. The board document stores the period metadata and generation timestamp. Entry fields are:

```text
userId
displayName              // limited public display snapshot
avatarSeed
avatarStyle
activityType             // walk at launch
periodKey
verifiedSteps
rank                     // server-generated integer placement
updatedAt
schemaVersion
```

Clients may read global projections but cannot create, update, or delete board documents or entries. The scheduled backend job derives them from provider-sourced daily step records. The projection is intentionally separate from private user history so the mobile client never scans every user's raw steps.

## Circles and membership

```text
circles/{circleId}
circles/{circleId}/members/{userId}
circles/{circleId}/days/{dateKey}
circles/{circleId}/days/{dateKey}/scores/{userId}
circles/{circleId}/weeklyRecaps/{weekKey}
circles/{circleId}/cheers/{cheerId}
circles/{circleId}/messages/{messageId}
circles/{circleId}/walkPlans/{walkId}
circles/{circleId}/walkPlans/{walkId}/rsvps/{userId}
circles/{circleId}/reports/{reportId}
```

Circle fields:

```text
schemaVersion
name
description
ownerId
activityType              // walk at launch; legacy run values are read as walk
visibility                // private | public
joinPolicy                // invite_only | open | approval
inviteCode                // private only; null for public
competitionTimeZone       // IANA timezone, fixed for competition boundaries
discoverableArea          // approximate label/geospatial cell; never exact member location
memberCount               // projection, bounded by 20
weeklyStepGoal            // optional combined member steps for the competition week
createdAt
updatedAt
```

Member fields:

```text
userId
displayName               // limited display surface, not a public profile
avatarSeed
avatarStyle
role                      // owner | moderator | member
joinedAt
```

Daily score fields:

```text
userId
dateKey                   // circle timezone date key
verifiedSteps
source
syncState
rank
isWinner
finalizedAt
schemaVersion
```

Circle message fields:

```text
authorId
authorName               // display snapshot from the circle member record
authorAvatarSeed         // display snapshot for the member avatar
authorAvatarStyle        // display snapshot for the member avatar
body                     // text-only message, maximum 500 characters
circleId
clientMessageId          // idempotent client-created document id
createdAt                // server timestamp
schemaVersion
```

Messages are scoped to one circle and do not contain health, GPS, or private profile data. The first implementation keeps messages immutable after creation and exposes the latest page plus older pages through a repository boundary.

The score projection is derived from private user step records. It is not a place where clients can choose their own winner, rank, or verified total.

Weekly recap fields:

```text
weekKey
totalVerifiedSteps
winnerUserId
participationCount
streakHighlights
milestones
generatedAt
topWalkers                // up to three display snapshots with rank and verifiedSteps
schemaVersion
```

Circle walk plans store a title, start timestamp, creator display snapshot, optional details, optional general meetup label, and scheduled/cancelled status. Each member's RSVP is a separate document keyed by their user id. Plans contain no GPS coordinates or route geometry.

## Usernames, people, invitations, and friends

```text
usernames/{handle}                         { uid, createdAt }
publicProfiles/{userId}                    { username, displayName, displayNameLower, avatarSeed, avatarStyle, discoverable, usernameChangedAt?, updatedAt, schemaVersion, userId }
circleInvites/{circleId}_{inviteeId}       { circleId, circleName, inviterId, inviterDisplayName, inviteeId, createdAt, expiresAt, schemaVersion }
friendRequests/{fromId}_{toId}             { fromId, toId, fromDisplayName, createdAt, schemaVersion }
users/{userId}/friends/{friendId}          { friendId, createdAt, schemaVersion }
```

- A handle is unique because creating an existing `usernames/{handle}` document is denied. The claim, the profile projection, and (when changing) the deletion of the old claim are one batch; Rules read the batch with `getAfter`. Handles match `^[a-z][a-z0-9_.]{2,19}$`, with no `..`, no trailing dot, and a reserved list (kept in sync between `src/domain/usernames.ts` and the Rules). A handle can change once every 30 days.
- `publicProfiles` is the only profile data other users can read: display name, username, and character. Its display name must equal the private `users/{uid}` name. `list` is allowed only for `discoverable == true` documents with `limit <= 20`; `get` works for any signed-in user (exact username lookup). Existing users have no document until they pick a username.
- Invitations are created by circle owners/moderators only, for people who are not members, are not in `removedMembers`, are not blocked in either direction (Rules read both block lists), and only while the circle has room. They expire after about 14 days. Accepting is the invitee's own join through the existing member/count Rules (20-member cap, `removedMembers`, name matching), followed by deleting the invitation; the client also refuses an expired invitation or one from someone the invitee blocked. An invitation is consent UX, not a security boundary: the circle id is the invite code. Declining or cancelling deletes the document.
- Friend requests are refused when either person blocked the other. The recipient accepts by creating both `friends` documents and deleting the request in one batch; Rules require the request to exist, to be deleted in that batch, and neither person to block the other. The 100-friend limit is a client query limit, not a Rules check. Either person can end a friendship by deleting both sides. Blocking someone removes any friendship and requests with them (best effort, client-side).

## Safety data

```text
users/{userId}/blocks/{blockedUserId}
circles/{circleId}/reports/{reporterId}_{targetType}_{targetId}
```

Block documents are user-owned and contain `blockedUserId`, a display-name snapshot, `createdAt`, and `schemaVersion`. The user can delete their own block to unblock. The client hides blocked people from circle chat, standings, and recap names; blocking does not delete circle messages or prevent other circle members from reading the shared chat collection.

Report documents contain `circleId`, `reporterId`, `targetType`, `targetId`, authoritative `targetLabel` and optional message preview, a fixed `reason`, bounded `details`, `status` (`open | resolved | dismissed`), `createdAt`, and `schemaVersion`. Moderator review adds `resolvedBy`, `resolvedAt`, `updatedAt`, and a bounded resolution label. The document ID limits each reporter to one report per target. Read/resolve access is role-based: current circle owners/moderators can access every report in that circle, including reports involving themselves; ordinary reporters and reported members cannot. A signed-in nonmember may report a public open circle, but cannot read its safety inbox or report its members/messages.

Cheer fields should include sender, recipient, fixed cheer type, circle, competition day, and creation time. Backend limits should prevent spam and duplicate reactions.

## Access rules

- Unauthenticated users cannot read or write app data.
- Private circles are never listable and are readable only through membership-aware paths.
- Public discovery returns safe circle summaries, not member locations.
- A member can read allowed aggregate standings but not another member's raw health data or route.
- A current member can read messages for their circle and create only messages authored by their own member record.
- Message documents cannot be updated or deleted by the client in the first edition.
- Only owners can delete circles.
- Only the owner can assign/demote moderators; owners and moderators can read/resolve circle reports; ordinary members cannot assign roles or resolve reports.
- Clients cannot write authoritative winner, rank, or finalized fields.
- Account deletion removes or anonymizes data according to the retention policy.

## Legacy compatibility

Legacy documents may omit `schemaVersion`, visibility, join policy, timezone, member count, or role. Converters should provide safe read defaults while migration jobs backfill the new fields. New security-sensitive writes should require the new fields after the migration gate is enabled.
