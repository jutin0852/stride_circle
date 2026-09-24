# Stride Circle — Product Checklist

This is the working source of truth for the app. Check an item only after it works on a real phone and its error state has been considered.

## Product promise

Stride Circle helps friends move together. It tracks daily steps and recorded walks/runs, then turns that movement into gentle social accountability through circles, history, challenges, and celebrations.

## Built and verified in the current app

- [x] Email/password sign-up and sign-in
- [x] Google sign-in flow
- [x] Persistent Firebase authentication on app reload
- [x] Firebase Firestore connection and production security rules
- [x] iPhone pedometer step tracking
- [x] Saved personal daily step history
- [x] Create and join walking or running circles
- [x] Multiple-circle support
- [x] Circle invite codes and native share sheet
- [x] Walking-circle daily leaderboard
- [x] Current-leader treatment
- [x] GPS walk/run recording with map, route, distance, duration, pace, pause, resume, and finish
- [x] Saved recorded activity history
- [x] Activity totals contribute to matching circles
- [x] Home, Circles, Activity, History, and Me tabs
- [x] iPhone safe-area handling for notch, Dynamic Island, and home indicator
- [x] Consistent tab icon system and multicolor Google mark
- [x] Skeleton loading states for data-loading screens

## Current product polish

- [x] Sign in is the first authentication screen
- [x] Profile does not expose email, duplicate circle data, or privacy copy
- [x] Home uses time-aware greetings and removes redundant live/update copy
- [x] Home shows a target icon and streak fire icon
- [x] Activity controls use run/walk-specific icons and a refined Start control
- [ ] Test every screen on the iPhone after each major visual change
- [ ] Replace remaining text-symbol navigation controls with icons where appropriate
- [ ] Add an app icon and splash screen
- [ ] Review larger touch targets, text scaling, and screen-reader labels

## Personal movement experience

- [ ] Let a user set a personal daily step goal
- [ ] Show clear goal progress on Home
- [ ] Support a custom goal and sensible presets
- [ ] Define a small minimum daily movement threshold for streak eligibility
- [ ] Build personal streak logic
- [ ] Add one optional streak-protection/rest-day rule
- [ ] Add personal milestones: first walk, first run, 7-day streak, total steps, total distance
- [ ] Add a completed-activity summary screen
- [ ] Show an activity's recorded route in History
- [ ] Let users delete an incorrectly recorded activity
- [ ] Improve GPS permission, accuracy, and recovery states

## Circle experience

- [ ] Give running circles a distance/pace/activity leaderboard
- [ ] Let users choose an earlier day to view circle standings
- [ ] Add weekly and monthly circle standings
- [ ] Add circle activity history
- [ ] Add circle settings: rename, leave, and ownership controls
- [ ] Define whether a member can join a race after it starts
- [ ] Define tie-breaking rules and activity-validation rules
- [ ] Add lightweight cheers/reactions before considering direct messaging

## Challenges and gamification

- [ ] Create a timed circle challenge
- [ ] Create a first-to-target race: steps or distance
- [ ] Create a shared team goal: all members contribute to one target
- [ ] Build the shared visual race track with member avatars and checkpoints
- [ ] Show live rank changes: passed someone, near finish, circle needs help
- [ ] Add a race finish/winner screen and completed-race history
- [ ] Add 2–3 optional daily quests
- [ ] Add weekly personal and circle recap cards
- [ ] Add a small achievements shelf with meaningful badges only
- [ ] Add celebration moments for milestones, goals, and race finishes
- [ ] Add an opt-out path for competitive features

## Notifications and retention

- [ ] Ask for notification permission at a useful moment, not on first launch
- [ ] Let users select reminder time and quiet hours
- [ ] Goal reminder: only when the user is close enough for a realistic finish
- [ ] Streak reminder: gentle, never shame-based
- [ ] Circle prompt: a friend joined, circle is close to a goal, or a race is ending
- [ ] Weekly recap notification
- [ ] Notification preferences screen
- [ ] Measure notification opens and subsequent movement before increasing volume

## Avatars and profile media — waiting for approval

- [ ] Approve an illustration direction for default member avatars
- [ ] Generate and approve a small avatar collection
- [ ] Assign a deterministic default avatar to every new account
- [ ] Save the selected avatar URL as the Firebase profile photo
- [ ] Add Firebase Storage and rules for user-uploaded photos
- [ ] Let users replace their default avatar with a phone photo
- [ ] Display profile images consistently in Home, Circles, standings, and Profile

## Quality, safety, and release readiness

- [ ] Test with at least two real accounts in one walking circle
- [ ] Test with at least two real accounts in one running circle
- [ ] Test invite, join, leave, and ownership edge cases
- [ ] Test no-network, denied permission, and Firebase error states
- [ ] Test on iPhone and Android
- [ ] Audit Firestore and Storage rules for every collection/path
- [ ] Add a privacy policy and Terms screen before public release
- [ ] Add crash/error monitoring before a wider beta
- [ ] Prepare Expo development and production builds

## Product metrics to learn from

- [ ] Track activation: account created -> steps enabled -> joins/creates first circle
- [ ] Track daily active movers, not just daily app opens
- [ ] Track 1-day, 7-day, and 30-day retention
- [ ] Track circle creation, invites sent, invites accepted, and active circles
- [ ] Track goal completion, streak continuation, race participation, and challenge completion
- [ ] Test one engagement change at a time before keeping it

## Recommended next sequence

1. Approve and implement the avatar direction.
2. Personal goal setting and accurate goal progress.
3. Personal streak logic and weekly recap.
4. Running-circle leaderboard.
5. First timed circle race with a visual track.
6. Notifications only after the core loops above are proven useful.
