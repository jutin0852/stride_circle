# Stride Circle Design Guide

**Status:** Selected starting direction — living document
**Version:** 0.1
**Last updated:** 2026-10-03
**Primary design reference:** Penpot working file and research boards
**Reference frame:** Mobile, approximately 390 × 844

This document is the working source of truth for the Stride Circle visual system. Update it whenever a design decision changes in Penpot or in the product. Keep the Penpot file and this guide aligned before a decision is treated as final.

## How to use this guide

- Check this guide before introducing a new color, component, layout pattern, or interaction state.
- Prefer the semantic tokens in this document over raw hex values in screens or components.
- Record meaningful changes in the decision log at the bottom of the file.
- Use Penpot to explore alternatives; use this document to capture the selected direction and the reason for it.
- Treat research screenshots as references for patterns, not as assets to copy directly.
- Apply the selected system first to Home, Active Walk, Friend Challenge, and Walk Completion before expanding the UI kit.

## Product and emotional intent

Stride Circle helps people walk consistently with a small, private circle of friends. The app should make progress visible and social without turning an everyday walk into a high-pressure fitness competition.

The visual system should feel:

- Warm and welcoming
- Playful but calm
- Outdoorsy without looking rugged or extreme
- Social, private, and encouraging
- Broadly appealing across genders and ages
- Easy to understand during a short, distracted mobile session

The product promise is: **move together, keep each other going.**

## Solo-first foundation

The social world is an invitation, not a requirement. Someone should be able to use Stride Circle on their own, without a circle, without talking to anyone, and still receive a complete and motivating walking experience.

The app must always support:

- Tracking daily steps and walking activity
- Seeing personal progress clearly
- Completing solo walking quests and milestones
- Building consistency through streaks or chains without shame
- Receiving Duolingo-inspired progress feedback, celebrations, and gentle recovery prompts
- Reviewing history and weekly progress
- Choosing to discover or join social activity later

### Three layers of participation

1. **Personal layer:** Steps, walks, quests, milestones, streaks, history, and personal rewards. This is the dependable foundation for everyone.
2. **Circle layer:** Private friends, shared challenges, rankings, reactions, and group recaps. This adds accountability and connection.
3. **World layer:** Nearby characters, public circles, meetups, destinations, and live activity. This adds discovery and a reason to explore.

People can move between these layers at their own pace. A user who only wants personal progress should never see an empty or broken experience because they have not joined a circle.

### Solo user loop

```text
Open the app
        ↓
See today’s steps and personal goal
        ↓
Choose a walk, quest, or milestone
        ↓
Walk and watch progress build
        ↓
Receive a small celebration or useful feedback
        ↓
See the next personal reason to return
```

Social discovery can appear as an optional next step, but it should not interrupt or overshadow this loop.

## Product north star: a world built around walking

The bigger idea is that walking becomes the activity people use to enter a social game world. People do not open the app only to inspect steps; they open it because walking gives them something to do with other people.

Walking can become a way to:

- Complete personal and group challenges
- Find friends or nearby walkers with shared interests, when discovery is explicitly enabled
- Create private circles and keep up with friends’ steps and distance
- Discover places to walk toward and meet at
- Join scheduled walks or informal meetups
- See a friend’s shared walking activity and celebrate it
- Unlock playful progress, events, and shared memories by spending time outside

The product should feel like **a game you play by walking**, not a game that asks people to become athletes. The social layer gives walking meaning; the game layer gives people a reason to return; the physical world gives the game somewhere to happen.

### The long-term loop

```text
Discover a reason to walk
        ↓
Choose a challenge, place, or person
        ↓
Walk and make progress
        ↓
Connect, meet, react, or contribute to the circle
        ↓
Celebrate what happened
        ↓
Return for the next walk
```

### Product directions to explore

#### 1. Personal play

- Daily walking quests with flexible completion windows
- Consistency chains that reward returning, not perfection
- Personal milestones and progress rings
- Gentle recovery quests after a missed day
- Optional badges that reflect meaningful behaviors, such as walking with a friend or exploring a new place

#### 2. Private social play

- Friend circles with shared weekly goals
- Challenges that reward the group reaching a combined target
- Friendly leaderboards that can be turned off or softened
- Cheers, reactions, and lightweight encouragement
- Shared walk recaps that show how the circle moved together

#### 3. Place-based play

- Challenges to walk toward a landmark, park, café, event, or agreed meeting point
- “Meet here after your walk” invitations with a clear time and place
- Group routes or suggested walking areas, when map features are in scope
- Local walking events that users can join without exposing their exact location
- Discoverable places that are useful because they give a walk a destination

#### 4. The wider walking community

- Opt-in discovery of people or groups nearby who want similar kinds of walks
- Interest-based circles, such as evening walks, campus walks, photography walks, or quiet walks
- Public or semi-public events that are separate from private friend circles
- Profiles that communicate walking interests without exposing sensitive activity by default

This is a direction to explore, not a commitment to public social networking. Private circles remain the safest and clearest foundation.

### Character identity and the living map

For the larger walking game, every person should have a visible in-world identity:

- A display name or pseudonym chosen by the user
- A personal character assigned or selected during onboarding
- Optional character customization unlocked through participation
- A character style that is expressive without requiring a real photo, legal name, or gender assumption

The character is not just a mascot. It is the user’s social presence in the walking world. It lets people recognize one another, react, join activities, and feel represented while preserving the option to stay pseudonymous.

#### The map as a social world

The map should feel like a playful, living view of the real world rather than a technical GPS screen. It can show:

- The user’s own character and current walk state
- Friends who have chosen to share their activity
- Private-circle activity and planned meetups
- Public circles, events, and destinations nearby
- Clusters of activity rather than a noisy field of exact pins

The map should communicate “what is happening around me?” without turning people into objects being tracked. Familiar geography provides context; characters, activity bubbles, route traces, and meetup markers provide the game layer.

#### Presence moments

The Snapchat-like idea can become a set of lightweight, consent-based moments:

- **Walking with…** — two mutually visible people are walking in the same area during overlapping active sessions.
- **Nearby circle** — an opted-in public circle or event is available in the user’s area.
- **Meet up here** — a friend or circle shares a public meeting point and time.
- **Passing by** — two opted-in friends briefly cross paths and can send a wave or reaction.
- **Join the walk** — a user can request or accept an invitation to participate.

These moments should be short-lived and contextual. They should not create a permanent record of where someone has been.

#### Visibility modes

The social map needs a simple visibility model that users can understand before they start walking:

1. **Private** — only the user sees their own character and activity.
2. **My circles** — approved circle members can see the shared activity that the user chooses to expose.
3. **Nearby discovery** — opted-in users can appear as approximate nearby presence while actively walking.
4. **Public event or circle** — the user chooses to appear at a specific public activity or meeting point.

Visibility should be independent from the user’s display name and character. Someone can use a recognizable character while keeping precise location private.

#### First design explorations

Prototype these before building a complete map system:

- Character selection and pseudonym setup
- A quiet map with the user’s character and no nearby activity
- A friend appearing as an approximate nearby presence
- A “Walking with…” shared moment for two mutually visible friends
- A public circle or event card near the user
- A meetup invitation with a public place and time
- A visibility and pause-sharing control that is easy to reach from the map
- A post-walk recap showing who joined, reacted, or completed the same activity

#### Guardrails for the experience

- Precise live location is off by default.
- Nearby people use approximate zones or clusters unless the user makes a more specific choice.
- “Walking with…” requires mutual visibility; one person should not be able to identify an unconsenting nearby user.
- Active presence expires when the walk ends or sharing is paused.
- Never expose home, work, routine, or historical route patterns by default.
- Meeting suggestions should favor public places and explicit invitations.
- Block, report, hide, and leave controls should be available without searching through settings.

### Quiet safety infrastructure

The product should feel open, lively, and social. Safety should support that feeling quietly instead of becoming the story of the product.

The larger vision can include live location, public profiles, nearby-person discovery, public circles, and events. Those features still need simple controls underneath them:

- Make visibility understandable at the moment people enter a social space.
- Let users pause, hide, block, report, or leave without hunting through settings.
- Prefer public meeting places and explicit invitations for meetups.
- Avoid turning a person’s home, work, routine, or historical route into a public object.
- Let presence expire when the walk or event ends.

These are experience foundations, not warning screens. They should make the world feel comfortable to use without making it feel cautious or administrative.

### MVP relationship

The current MVP remains the focused foundation:

- Solo daily step tracking and walking progress
- Personal milestones, consistency progress, and weekly recap
- Private circles and invitations
- A live daily circle leaderboard
- Activity history
- Reactions and encouragement inside the circle
- Privacy controls for circle activity

Character identity is now a strong north-star direction: each user should be able to represent themselves with a pseudonym and an in-world character. Whether the full character and living-map experience enters the first implementation pass is a sequencing decision; it is not a reason to design the core system in a way that prevents it later.

The larger walking-world idea should influence the tone, language, and extensibility of the design system now, but global discovery, meetups, public profiles, live location, and complex location-based games should remain future exploration until we define their safety, product, and technical boundaries.

### Design implications

- Make the social relationship visible without turning every screen into a feed.
- Treat a challenge as an invitation to participate, not a test the user can fail publicly.
- Give places and destinations warmth and personality if they enter the product.
- Keep personal progress and group progress visually distinct.
- Let users choose between private, circle, event, and broader community contexts.
- Make “who can see this?” understandable at the moment an activity is shared.
- Celebrate connection as much as performance: joining, encouraging, meeting, and returning are all progress.

### Making the world fun and interactive

The app should feel like a place people enter, not a dashboard they inspect. The main design problem is to make the world visibly alive and give people small, satisfying ways to participate.

#### The engagement loop

```text
See something happening
        ↓
Tap into it
        ↓
Join, wave, cheer, walk, or meet
        ↓
See an immediate response
        ↓
Unlock progress or a new reason to return
```

#### UI elements that make the world feel alive

- **Living map:** Character markers, activity clusters, meetup pins, public-circle markers, and soft route trails make movement visible.
- **Character bubbles:** Tapping a nearby character opens a small card with a pseudonym, current activity, challenge, and simple actions such as wave, cheer, join, or invite.
- **What’s happening now:** A horizontal set of cards surfaces nearby circles, active challenges, meetups, and friends who are walking.
- **Meetup pins:** A place marker can show the meeting time, people going, remaining spots, and a single **Join** action.
- **Circle islands:** Public circles can feel like destinations or small activity hubs on the map rather than plain list rows.
- **Walk-together moments:** When people join the same walk, their characters move as a small group and the interface acknowledges the connection.
- **Reactions in the world:** Waving, cheering, footprints, small bursts, and floating reaction bubbles let people interact without needing a full conversation.
- **Quest paths:** Challenges can be represented as paths with checkpoints, destinations, and group milestones instead of only percentages and numbers.
- **Unlockable character details:** Walking can unlock outfits, colors, accessories, trails, emotes, and map decorations. Rewards should express participation, not increase someone’s power over others.
- **Completion scenes:** Finishing a walk can show the character arriving, meeting the group, reaching a place, or adding a small mark to the shared world.

#### Interaction rules

- Every social object should have a clear action: **Join**, **Wave**, **Cheer**, **Invite**, **Meet**, or **Explore**.
- Prefer one-tap interactions for lightweight participation.
- Use bottom sheets, floating cards, and map callouts so the user can act without losing the world view.
- Give every action a visible response: a character animation, a route change, a reaction, a progress update, or a new map state.
- Make the next interesting thing easy to discover without making the screen noisy.
- Let the user watch the world quietly; participation should be invited, not forced.

#### Motion and feedback ideas

- Characters gently bob or move when active.
- A route draws itself as a walk begins.
- A new nearby circle appears with a soft pulse rather than a disruptive alert.
- Joining a meetup creates a small group formation on the map.
- A cheer travels briefly from one character to another.
- A completed quest fills a path checkpoint and reveals the next one.
- A character celebrates at the end of a walk with a short, skippable moment.

Motion should remain brief, understandable, and optional for users who prefer reduced motion. Do not use animation as the only way to communicate a state.

#### The first fun prototype sequence

1. Open the app into a living home/map surface.
2. See the user’s character and a few nearby activity cards.
3. Tap a public circle or friend who is walking.
4. Join a challenge or send a wave.
5. Start walking and see the character and quest path change.
6. Meet or complete the activity.
7. See the group response, reward, and next invitation.

Avoid making the first prototype a full social network. The goal is to prove that a simple walk can create a satisfying chain of discovery, participation, connection, and return.

## Design principles

1. **Make walking feel playful, not demanding.** Progress should invite the next walk rather than create guilt.
2. **Make the next action obvious.** Each screen should have one clear primary action.
3. **Keep competition private and friendly.** Emphasize shared progress, personal bests, and encouragement over public status.
4. **Celebrate progress immediately.** Small, purposeful feedback should make completion feel worthwhile.
5. **Never shame a missed walk.** Recovery states use warmth and practical next steps, never failure language or error styling.
6. **Use familiar mobile patterns.** Keep navigation, cards, buttons, progress, and lists recognizable.
7. **Separate personal progress from friend progress.** Users should quickly understand what belongs to them and what belongs to the group.
8. **Keep motion purposeful and brief.** Animation should clarify a state change or reward an action, not compete with the task.
9. **Make calm the default.** Reserve stronger color and celebration for moments that genuinely benefit from emphasis.
10. **Design for accessibility from the start.** Color, type, labels, icons, and structure should work together.

## Color system

These are semantic color tokens. The role matters more than the name of the raw color. Do not introduce a new color for a one-off screen treatment without recording the reason here.

| Token | Value | Primary use | Guardrail |
|---|---|---|---|
| `color.background` | `#F8F6F0` | Screen backgrounds | The default canvas; keep most of the screen quiet and warm. |
| `color.surface` | `#FFFFFF` | Cards, sheets, navigation | Use for readable content surfaces and grouped information. |
| `color.brand` | `#59B7E8` | Illustrations and decorative accents | Do not use for small body text or essential text/icon contrast. |
| `color.brand-subtle` | `#E7F7FF` | Selected cards and gentle highlights | Use to support interaction without making the whole UI blue. |
| `color.action` | `#176E95` | Primary buttons, links, selected icons, meaningful progress | The consistent action color across the product. |
| `color.text-primary` | `#16324F` | Headings, numbers, body text | Default readable text color on light surfaces. |
| `color.text-secondary` | `#52677A` | Captions and supporting information | Never use as the only indication of a required state. |
| `color.border` | `#DCE4E8` | Card borders, separators, quiet outlines | Keep borders subordinate to content. |
| `color.accent-coral` | `#FF866F` | Friend reactions and celebration details | Use in small purposeful moments, not as a primary action color. |
| `color.accent-coral-subtle` | `#FFF0EB` | Warm encouragement cards | Good for supportive empty and recovery states. |
| `color.accent-yellow` | `#F7C95A` | Milestones, badges, reward accents | Use sparingly so rewards retain meaning. |
| `color.accent-yellow-subtle` | `#FFF5D8` | Milestone surfaces | Pair with navy text and an icon or label. |
| `color.success` | `#22775F` | Confirmed completion and saved activity | Pair with an icon or explicit label; never rely on green alone. |
| `color.error` | `#B42318` | Genuine errors and destructive actions | Not for missed walks or ordinary low progress. |
| `color.error-surface` | `#FFF0EE` | Error-message backgrounds | Include an explanation and recovery action. |

### Color balance

- Warm white and white should occupy most of each screen.
- Sky blue establishes identity and adds lightness.
- Action blue guides interaction and communicates meaningful progress.
- Peach and yellow appear as small, purposeful moments of warmth.
- Navy text provides hierarchy without making every heading oversized or heavy.
- Avoid uniformly blue screens, large navy backgrounds, neon treatments, and excessive gradients.

### Color behavior

- Primary button: `color.action` background with white text.
- Secondary button: `color.surface` background with `color.action` text and border.
- Quiet text action: `color.action` text on a light surface.
- Selected navigation: `color.action` icon and label, with optional `color.brand-subtle` highlight.
- Unselected navigation: `color.text-secondary`.
- Disabled control: a muted neutral treatment that is visibly unavailable without looking like an error.
- Focus indicator: a visible `color.action` outline separated from the control.
- Success and error states always include text, iconography, or structure in addition to color.

## Typography

The typeface is not final yet. Choose a friendly, highly readable sans-serif during the visual-direction pass. Avoid a novelty typeface that makes everyday utility screens feel childish.

Use this as the starting mobile type scale in Penpot; adjust only after checking real content and accessibility:

| Role | Starting size / line height | Weight | Use |
|---|---:|---:|---|
| Display metric | 32 / 38 | Semibold | Steps, distance, or a primary completion number. |
| Page title | 28 / 34 | Semibold | One main title per screen. |
| Section heading | 22 / 28 | Semibold | Card and section titles. |
| Body | 16 / 22 | Regular | Main explanatory and social copy. |
| Label | 14 / 18 | Medium | Buttons, tabs, metadata, and compact controls. |
| Caption | 12 / 16 | Medium | Supporting context; never use for essential information alone. |

Typography rules:

- Use hierarchy through size, weight, spacing, and placement rather than oversized headings everywhere.
- Keep numbers prominent when they are the user’s reason for opening the screen.
- Prefer sentence case for labels and actions.
- Keep supportive copy short, specific, and human.
- Check long names, large step counts, and localized text in the actual layout.

## Layout, shape, and depth

- Design mobile-first around the 390 × 844 reference frame.
- Use comfortable spacing and a consistent 4-point base rhythm: 4, 8, 12, 16, 20, 24, 32.
- Prefer rounded cards with a restrained radius; the interface should feel friendly, not inflated.
- Use white cards to group information on warm-white backgrounds.
- Keep shadows minimal and soft. Borders and surface contrast should do most of the grouping work.
- Use simple line icons with consistent stroke weight.
- Leave enough breathing room around progress numbers, buttons, and friend rows for quick scanning and touch access.
- Keep decorative illustrations subordinate to the user’s next action.

## Progress, maps, and charts

- Use `color.action` for essential progress strokes and route lines.
- Use `color.brand` and `color.brand-subtle` for supporting fills and decoration.
- Keep maps muted so the route and location marker stand out.
- Outline routes and markers when needed for contrast.
- Show numbers, labels, and icons alongside color.
- Separate personal progress from friend or group progress in both layout and labeling.
- Distinguish chart series using labels, patterns, marker shapes, or placement as well as color.
- Progress should communicate encouragement, not surveillance or pressure.

## Screen recipes

These are the first four screens to bring into the selected visual direction.

### Home

**Composition:** Warm-white background, white personal-progress card, blue progress indicator, pale-sky friend-challenge card, and one action-blue **Start a walk** button.

**Warmth cue:** Add a small illustration or peach encouragement detail without competing with the primary action.

**Must communicate:** Today’s personal progress, the relevant friend activity, and the next useful action.

**Avoid:** A dense dashboard, several equally strong buttons, or a large blue hero area.

### Active Walk

**Composition:** Subdued map, clearly visible blue route, white metrics panel, large readable numbers, and an action-blue pause control.

**Warmth cue:** Keep decoration minimal while the user is moving. Clarity and safety matter more than celebration.

**Must communicate:** Current activity state, primary metric, route/location context, and the pause or finish action.

**Avoid:** Dense analytics, tiny map controls, or color-coded metrics without labels.

### Friend Challenge

**Composition:** Pale-sky group-progress panel, white friend rows, pale-sky highlight for the current user, and coral cheers or reactions.

**Warmth cue:** Emphasize connection and shared momentum, not a harsh race.

**Must communicate:** Challenge goal, timeframe, each friend’s progress, the user’s position, and an easy way to encourage someone.

**Avoid:** Public-feed patterns, aggressive ranking language, or making the user feel like they are losing because someone else is ahead.

### Walk Completion

**Composition:** Warm-white background, white summary card, small yellow milestone illustration, coral celebration detail, and one clear next action.

**Warmth cue:** Reward the completed action immediately with a brief, purposeful moment.

**Must communicate:** What was completed, the meaningful result, any personal or group progress change, and where to go next.

**Avoid:** Blocking the useful summary behind an animation or making a small walk feel like a major athletic achievement.

## Supporting states

### Empty and missed-walk states

Use a warm neutral or `color.accent-coral-subtle` surface with supportive language and a practical next step. A missed walk is a recovery moment, not an error.

Good direction:

> Yesterday did not happen. Today is still open.

Avoid red styling, shame-based copy, lost-streak dramatization, and empty screens that provide no next action.

### Error states

Use `color.error` and `color.error-surface` only for genuine failures or destructive actions. Every error needs:

- A recognizable icon or structural cue
- A short explanation of what happened
- A clear recovery action
- Enough contrast and readable text

## Components and interaction patterns

### Buttons

Define reusable variants rather than styling each screen independently:

- Primary
- Secondary
- Quiet text action
- Disabled
- Destructive, only where a real destructive action exists
- Focused and pressed states

Button labels should describe the result: **Start a walk**, **Join challenge**, **Pause walk**, **View rankings**.

### Cards

Start with these semantic card types:

- Personal progress card
- Friend challenge card
- Activity metrics card
- Completion summary card
- Encouragement card
- Empty/recovery card
- Error card

Cards should support scanning: title, key value or status, supporting context, then the next action.

### Navigation

Selected items use `color.action` and may use a pale-sky surface highlight. Unselected items use `color.text-secondary`. Keep labels visible where the destination is not self-evident from the icon.

### Reactions and celebration

Use coral for friend reactions and small celebration details. Use yellow for milestone moments. Both should remain accents, not replace the action system.

## Gamification direction

Explore gamification as encouragement layered onto walking, not as a separate game that dominates the app.

Explore:

- Daily walking quests
- Weekly friend challenges
- Personal progress rings
- Milestones
- Consistency chains or streaks
- Badges
- Friend reactions
- Completion celebrations
- Character customization and expressive emotes
- An optional walking companion beyond the user’s own character

Every user should have a character as their in-world identity. Keep that separate from the question of whether the app also has a mascot or companion. Compare:

1. A simple character selected during onboarding
2. A character that evolves through walking
3. A character with optional accessories, emotes, and trails

Evaluate whether a separate companion feels warm and motivating or childish and distracting. It should never be required to understand progress or complete a walk.

## Accessibility and usability checklist

- Normal text meets at least 4.5:1 contrast.
- Large text and essential graphical controls meet their applicable 3:1 requirement.
- White on `color.action` is approximately 5.67:1.
- Navy on `color.background` is approximately 12.12:1.
- Use navy text on light sky, peach, and yellow surfaces.
- Avoid white body text on `color.brand`.
- Verify every foreground/background pair, including pressed, disabled, selected, success, and error states.
- Never communicate success, error, ranking, or selection through color alone.
- Keep touch targets comfortable and provide clear pressed/focused states.
- Test with long names, large values, empty data, and missed activity.
- Check perceived warmth and ease of use with a mixed group of intended users before finalizing.

## Penpot working method

For each research or design page:

- Keep references on the left.
- Put observations, decisions, and open questions on the right.
- Use consistent labels and color coding.
- Mark ideas as `Keep`, `Explore`, or `Reject`.
- Do not polish all screens before selecting the visual direction.
- Build the UI kit after the core direction is selected.
- Compare the four core screens side by side before extending the system.

When reviewing references, capture:

- What the user is trying to do
- The established pattern
- What feels familiar
- What feels confusing
- The emotional effect
- How the pattern could become more fun for walking with friends

## Implementation handoff

When this direction moves into the app:

- Create semantic color tokens and use them throughout screens and components.
- Do not scatter raw hex values through screen styles.
- Keep screen-level styles aligned with the roles in this guide.
- Document any intentional exception in the decision log.
- Update the existing theme before building the polished four-screen pass; the current `app/src/theme.ts` still contains the earlier blue/gray theme and is not yet aligned with this guide.
- Keep design-only decisions separate from product-scope decisions. If a screen requires a feature that is not in the product brief, record that as an open product decision before implementing it.

## Next design checkpoint: one complete walking quest

Locked-screen recording is a product requirement: an explicitly started walk must continue recording while the phone is locked, until the user pauses or finishes. Explain background-location access before requesting it, and never present a foreground-only fallback as locked-screen support.

The recording and step-persistence repairs are documented in [PRE_BUILD_REVIEW.md](PRE_BUILD_REVIEW.md), with 66 automated regression tests covering the foundation, native background recorder, and Android map fallback. Native recording now uses a background location task and durable local session storage; it requires a rebuilt app and background permission. Browser recording remains foreground-only. Real-device and live Firebase checks remain pending, and Android daily steps still count accumulated session steps rather than complete all-day steps.

Penpot is out of the current workflow: implement the agreed core walking journey directly in the app and update this guide with decisions. The first quest rewards are XP, walking-journal collectibles, and earnable character accessories. Shared circle rewards come later; no separate coin economy is planned for the first slice.

Review date: 2026-10-03. This assessment uses the current source code and saved screenshots in `app/assets/screenshots`; it does not establish live device behavior or the current contents of Penpot.

### What the app already provides

- Home with daily steps, an editable daily goal, progress, a personal streak, and a goal-completion celebration
- Walk/run recording with a map, pause/resume, completion summary, and saving
- Private circle creation/joining, dated standings, and a character-based daily race track
- Personal activity history and a basic last-seven-days step summary
- Profile character selection using several different avatar styles

### Gaps between implementation and the vision

- Home does not yet offer a walking quest or a direct start-walk action once step tracking is enabled.
- The activity recorder now defaults to walking, but its visual language has not yet been brought into the selected design system.
- Character choices exist, but they do not yet form a consistent character family with world presence, motion, or unlockable customization.
- The implemented theme still uses the earlier white/blue/gray palette.
- Nearby discovery, public circles, meetups, social presence, quests, and cosmetic rewards are design concepts rather than implemented experiences.
- The original `PRODUCT_BRIEF.md` describes an earlier scope and backend; it needs reconciliation with the evolving design direction before the next implementation phase.

### Recommended Penpot pass

Design one connected prototype that answers: **What makes someone want to take their next walk?**

1. Home for someone with no circle: character, daily steps, consistency progress, one quest, and a clear start action.
2. Quest detail: the target, what counts toward it, the reward, and how to start.
3. Active Walk: progress toward that quest alongside the existing recording controls.
4. Pause/resume state: preserve both activity and quest context.
5. Walk Completion: activity summary and clearly differentiated quest completion or partial progress.
6. Return Home: show what changed and the next reason to return.
7. Circle extension: show the same activity contributing to a shared challenge, with an encouragement action.
8. World exploration: a sample nearby circle or meetup with a character callout and join action.

Use one consistent character treatment and the selected palette across the sequence. Include a quiet world state with no nearby activity and a supportive return-after-missing-a-day state. Sample nearby activity is prototype content until live discovery is implemented.

Decide whether a quest counts all daily steps, steps after joining, or a recorded walking session before polishing its UI. Quest progress and daily-goal progress should be labeled clearly when their rules differ.

### Reference patterns to examine

Duolingo's [official product tour](https://blog.duolingo.com/duolingo-101-how-to-learn-a-language-on-duolingo/) describes progress paths, streaks, milestones, rewards, and optional social participation. Its [Friends Quests explanation](https://blog.duolingo.com/friends-quests/) provides a reference for cooperating toward a shared target and encouraging a partner.

These are focused reference checks. A completed screenshot-by-screenshot Duolingo study has not been verified in this repository. Capture relevant reference screens and annotate the walking adaptation alongside them in Penpot.

The checkpoint is ready for implementation planning when the solo journey is understandable, the character and reward system feels consistent, and the circle/world extensions add a clear reason to participate.

## Open decisions

- Final typeface and exact type scale
- Icon set and stroke treatment
- Whether a separate optional companion exists beyond the user’s own character
- How much GPS/map behavior remains in the first release versus progress-only tracking
- Exact challenge and ranking rules
- The appropriate depth of badges, streaks, and milestones
- Motion timing for progress, pause/resume, and completion celebration
- Which visibility modes belong in the first social-map prototype
- Whether the living map is the primary home surface or a dedicated world tab
- The first set of public objects to show: circles, meetups, quests, or all three
- How much character customization is available at onboarding versus unlocked over time

## Decision log

| Date | Decision | Reason / consequence |
|---|---|---|
| 2026-10-03 | Selected the warm, playful, calm, outdoorsy direction. | Gives the app emotional warmth without making casual walking feel competitive or childish. |
| 2026-10-03 | Sky blue is the brand color; action blue guides interaction. | Keeps identity light while preserving readable, dependable controls. |
| 2026-10-03 | Peach and yellow are restrained accents. | Makes reactions and milestones feel special instead of turning every screen into a reward state. |
| 2026-10-03 | The first application pass covers Home, Active Walk, Friend Challenge, and Walk Completion. | These screens establish the core visual language before the rest of the product is expanded. |
| 2026-10-03 | Added the long-term vision of walking as a social game world. | The design should make room for challenges, circles, destinations, meetups, and opt-in community discovery while keeping the current MVP private and focused. |
| 2026-10-03 | Every user should have a pseudonymous identity and personal character in the larger walking world. | Characters make social presence legible and expressive without requiring real names or photos; live proximity remains mutual and opt-in. |
| 2026-10-03 | Shifted the emphasis from privacy-aware product language to an engagement-first living world. | The map, characters, circles, meetups, reactions, and quests should make participation feel visibly alive; safety controls remain quiet infrastructure. |
| 2026-10-03 | The app must work fully for people who walk alone or do not want to interact. | Personal steps, quests, milestones, streaks, history, and Duolingo-inspired feedback are the foundation; social and world layers are optional ways to deepen participation. |
