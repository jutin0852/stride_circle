# Blue Headband Duck — Rive rig prototype

This is an original layered vector reconstruction of the supplied top-row, fourth duck: the compact duck wearing a white headband and giving a focused expression. The weapon has been deliberately removed and the body is blue.

## Layer hierarchy

```text
duck_root
├─ ground_shadow
├─ leg_left / leg_right
├─ foot_left / foot_right
├─ body
├─ head
├─ headband_band / headband_knot / headband_tail
├─ wing_left / wing_right
└─ face
   ├─ eyebrow_left / eyebrow_right
   ├─ eye_left / eye_right
   ├─ pupil_left / pupil_right
   ├─ beak_upper / beak_lower
   └─ cheek_left / cheek_right
```

`expression_accents` is hidden by default and contains optional tired sweat drops and celebration sparkles.

## Suggested Rive pivots

- Body: `(240, 323)`
- Head: `(240, 228)`
- Headband: `(240, 130)`
- Headband knot/tail: `(126, 127)` and `(111, 137)`
- Wings: `(139, 284)` and `(341, 284)`
- Legs: `(181, 367)` and `(299, 367)`
- Feet: `(173, 406)` and `(307, 406)`
- Eyes/pupils: use the centre of each eye for blinking and gaze
- Beak: use the centre seam for happy or talking expressions

## Animation targets

- Idle: subtle body breathing, headband drift, and occasional blink.
- Walking: alternating legs and feet, opposite wing swings, small body bounce.
- Happy: lift wings, soften brows, brighten cheeks, and widen the beak.
- Tired: lower brows, half-close eyes, reduce bounce, reveal sweat accents.
- Celebration: anticipation squash, upward jump, wings raised, sparkle accents, soft landing, then return to Idle.
