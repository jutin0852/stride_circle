# White Duck — Rive rig prototype

This is an original layered SVG reconstruction based on the supplied white-duck reference. It is intentionally a prototype for rigging, not a production mascot export.

## Import and hierarchy

Import `white-duck-rive-rig.svg` into a new Rive artboard. Keep the SVG groups as named layers where the importer preserves them, then use this hierarchy as the target structure:

```text
duck_root
├─ ground_shadow
├─ leg_left
├─ leg_right
├─ foot_left
├─ foot_right
├─ body
├─ head
├─ wing_left
├─ wing_right
└─ face
   ├─ eyebrow_left / eyebrow_right
   ├─ eye_left / eye_right
   ├─ pupil_left / pupil_right
   ├─ cheek_left / cheek_right
   ├─ beak_upper
   └─ beak_lower
```

`expression_accents` is an optional hidden group for tired or celebration details. It can be removed if the first rig should stay minimal.

## Suggested pivots

- `body`: lower centre around `(240, 350)`
- `head`: neck area around `(240, 255)`
- `wing_left`: shoulder around `(145, 318)`
- `wing_right`: shoulder around `(335, 318)`
- `leg_left`: hip around `(190, 405)`
- `leg_right`: hip around `(286, 405)`
- `foot_left`: ankle around `(178, 451)`
- `foot_right`: ankle around `(299, 451)`
- pupils: their ellipse centres for gaze movement
- beak groups: centre of the beak seam for talking or happy expressions

## Animation-ready plan

1. `Idle`: body scale Y 100% → 103% → 100%, head drift ±2 px, occasional eye blink by compressing both eye whites and pupils vertically.
2. `Walking`: alternate leg and foot rotations, opposite wing swings, body bounce, and a small head counter-tilt.
3. `Happy`: raise both wings, lift cheeks, curve the brows, and widen the beak.
4. `Tired`: lower the brows, soften the pupils, add the optional sweat accents, and reduce body bounce.
5. `Celebration`: compress body for anticipation, jump with both wings up, add spark accents, then land with a short squash and return to Idle.

Keep the facial parts separate from body motion so the same expressions can be reused across Idle, Walking, and Celebration.
