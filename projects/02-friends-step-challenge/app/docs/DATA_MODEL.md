# Stride Circle launch data model

Status: target versioned model  
Last reviewed: 2026-10-02

## Identity and private data

```text
users/{userId}
users/{userId}/settings/{document}
users/{userId}/devices/{deviceId}
users/{userId}/dailySteps/{dateKey}
users/{userId}/weeklyRecaps/{weekKey}
users/{userId}/activities/{activityId}
users/{userId}/circleMemberships/{circleId}
```

`users/{userId}/activities` remains private. A route or GPS trace must never be copied into a circle document or a member-visible projection.

Suggested private step document fields:

```text
dateKey, localDate, timezone, stepCount, source, syncedAt,
syncState, providerRecordVersion, schemaVersion
```

`source` is a provider label such as HealthKit or Health Connect. It is not a promise that the data is fraud-proof.

## Circles and membership

```text
circles/{circleId}
circles/{circleId}/members/{userId}
circles/{circleId}/days/{dateKey}
circles/{circleId}/days/{dateKey}/scores/{userId}
circles/{circleId}/weeklyRecaps/{weekKey}
circles/{circleId}/cheers/{cheerId}
circles/{circleId}/reports/{reportId}
```

Circle fields:

```text
schemaVersion
name
description
ownerId
activityType              // walk at launch; run is legacy/deferred
visibility                // private | public
joinPolicy                // invite_only | open | approval
inviteCode                // private only; null for public
competitionTimeZone       // IANA timezone, fixed for competition boundaries
discoverableArea          // approximate label/geospatial cell; never exact member location
memberCount               // projection, bounded by 20
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
schemaVersion
```

## Safety data

Reports should include the reporter, target type/id, reason, status, timestamps, and moderation resolution. They must be immutable to the reported user. Blocks should be represented in a user-scoped collection or a dedicated relationship collection so blocked interactions can be filtered consistently.

Cheer fields should include sender, recipient, fixed cheer type, circle, competition day, and creation time. Backend limits should prevent spam and duplicate reactions.

## Access rules

- Unauthenticated users cannot read or write app data.
- Private circles are never listable and are readable only through membership-aware paths.
- Public discovery returns safe circle summaries, not member locations.
- A member can read allowed aggregate standings but not another member's raw health data or route.
- Only owners can delete circles.
- Owners and moderators can moderate; ordinary members cannot assign roles or resolve reports.
- Clients cannot write authoritative winner, rank, or finalized fields.
- Account deletion removes or anonymizes data according to the retention policy.

## Legacy compatibility

Legacy documents may omit `schemaVersion`, visibility, join policy, timezone, member count, or role. Converters should provide safe read defaults while migration jobs backfill the new fields. New security-sensitive writes should require the new fields after the migration gate is enabled.
