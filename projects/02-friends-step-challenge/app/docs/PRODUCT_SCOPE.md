# Stride Circle launch scope

Status: canonical first-edition brief  
Last reviewed: 2026-10-02

## Product promise

Stride Circle makes walking a recurring social event. People join small circles, compare verified step totals, encourage one another, and return for the next daily or weekly result.

The first edition optimizes for a reliable social loop:

1. Connect health data.
2. Join or create a circle.
3. Walk during the circle's competition day.
4. See standings and a recap.
5. Celebrate progress and return tomorrow.

## Launch commitments

- iPhone and Android support.
- Firebase remains the backend.
- Expo Router and TypeScript remain the mobile foundation.
- Steps are the launch metric.
- Provider-sourced health data is the primary score source.
- Private invite-only circles are hidden from discovery.
- Public circles are discoverable and open to join.
- A circle has at most 20 members.
- Each circle has a fixed competition timezone.
- Daily and weekly standings are scoped to circles.
- Streaks, milestones, weekly recaps, celebrations, and fixed cheers provide lightweight motivation.
- Public circles include reporting, blocking, owner controls, moderator controls, and abuse handling before broad release.

## Explicitly out of scope for first edition

- Global leaderboard.
- Direct messaging, chat, and open comments.
- Public user profiles and public user rankings.
- GPS activities as a required launch feature.
- Manual step entry.
- Levels, paid rewards, complex badges, or an achievement economy.
- Exact member locations or exact distance to a person.

Existing GPS activity code may remain available as legacy or experimental functionality, but it must not be required to understand or complete the step-based experience.

## Circle model

| Concept | Launch behavior |
| --- | --- |
| Visibility | `private` or `public` |
| Join policy | `invite_only` for private; `open` for public; `approval` reserved for a later policy extension |
| Capacity | 20 members maximum, enforced transactionally and by backend rules |
| Roles | `owner`, `moderator`, `member` |
| Competition timezone | Set at creation; changes apply from the next competition day |
| Discovery area | Approximate city, neighborhood, or geospatial cell; never a member's exact location |
| Private access | Invite code; private circles never appear in discovery |
| Public access | Nearby discovery without exact location exposure and immediate joining |

## Scoring rules

- Daily winners are determined by provider-sourced step totals for the circle's competition day.
- Weekly winners are determined by total verified steps during the circle's competition week.
- The global weekly leaderboard uses verified walking steps in a shared Monday `00:00 UTC` week.
- Global rank is an integer placement generated from a server-side projection. The global board is public to signed-in users; it exposes aggregate steps and limited display snapshots only.
- Consistency and streaks are recognized separately from the winner calculation.
- Personal history uses the user's local timezone where appropriate; circle standings use the circle timezone.
- The UI describes totals as “synced from your health data”. It must not promise perfect fraud prevention.
- If a permission is missing, a sync fails, or data is stale, the UI labels the state clearly and offers recovery.

## Social and safety rules

- Cheers use a fixed set of low-risk reactions: Nice work, Keep going, Almost there, Let's walk, and Congrats.
- No open comments or chat in the first edition.
- Members see aggregate circle standings, not another member's health route or raw activity route.
- Users can report a circle, member, cheer, or profile surface.
- Users can block other users; blocked users cannot interact or appear together in relevant surfaces.
- Owners can remove members and appoint moderators.
- Owners and moderators can review reports.
- No private contact details, sensitive health details, or exact location are exposed through public discovery.

## Launch acceptance

The first edition is launch-ready when a new user can understand the product without explanation, create or join the right kind of circle, see accurate daily and weekly standings on both platforms, recover from health permission changes, and use reporting/blocking without exposing routes or private data. Security-rule tests, crash monitoring, separated environments, and a tested rollback procedure are also required.
