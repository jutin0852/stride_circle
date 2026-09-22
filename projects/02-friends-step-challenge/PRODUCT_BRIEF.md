# Friends Step Challenge App — Product Brief

## Working description

A private mobile app where friends compare daily step counts, see who leads each day, revisit past daily results, and receive personal and group weekly recaps.

## Product purpose

Help friends become more consistent with walking by making progress visible inside a small private group.

This is not primarily a fitness tracker. It is a social-accountability product built around steps.

## Target users

Small groups of friends who want to motivate each other to walk more without using a public, athlete-focused fitness platform.

## Core promise

> Open the app and immediately see how you are doing today alongside your friends—and keep a record of how everyone showed up over time.

## Core experience

1. A user signs up.
2. They create a private circle or join one through an invite.
3. The app reads their daily steps from their phone’s health or pedometer system.
4. Everyone in the circle sees a live leaderboard for today.
5. At the end of the day, that day’s results remain saved permanently.
6. Users can revisit any previous day to see totals and the day’s leader.
7. At the end of the week, each person receives a recap; the circle receives a group recap.

## MVP features

- Sign up and profile
- Create and join private friend circles
- Invite links or codes
- Daily step count
- Live daily circle leaderboard
- Daily history by date
- Circle member list
- Personal streak
- Personal weekly recap: total steps, daily average, highest-step day, best daily rank, and consistency
- Group weekly recap: total group steps, weekly leader, daily winners, and a group highlight
- Small reactions or encouragement on activities and recaps
- Permission and privacy settings

## Privacy principles

- Circles are private.
- Only people in a circle can see one another’s step totals.
- The app does not share live location.
- The app does not share walking routes.
- The app does not have a public social feed.

## Explicit non-features for version one

- GPS route maps
- Distance as the main metric
- Public profiles or followers
- Payments
- Health advice or calorie recommendations
- Professional running analytics
- An AI fitness coach
- Teams, tournaments, badges, or complex challenges

## Technical direction

- Cross-platform mobile app
- React Native, Expo, and TypeScript
- Supabase for authentication, circles, activity data, and summaries
- Phone health or pedometer integration for steps
- Android-first testing while retaining iPhone support in the design

## First-version success criteria

The first version is successful if a private circle can:

- Join successfully
- See accurate daily step totals
- Compare today’s standings
- Revisit previous days
- Receive a useful weekly recap

## Next planning artifact

Create the product flow and screen map: first launch, joining a circle, today’s leaderboard, historical results, weekly recap, and inviting a friend.
