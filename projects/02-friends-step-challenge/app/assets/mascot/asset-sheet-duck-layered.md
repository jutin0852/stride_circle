# Duck sheet reconstruction

Source: Cute Duck Rive Animation Asset Sheet.png supplied by the user. This SVG is a manual vector reconstruction of the basic white duck, using a neutral stance for rigging. It is not an automatic extraction of the raster sheet. Clothing, accessories and alternate full-character poses are not included yet.

The SVG contains named vector groups for head, body, face, eyes, pupils, wings, legs and shoes. The reference has solid black dot eyes, so there are no white eyeball shapes in this design. Optional brows, cheeks, lower bill, open mouth, smiling eyes and sleepy eyes start at opacity zero.

Screen-left and screen-right naming is used. Set pivots in Rive after import: body (300,480), head (300,290), wings (199,333)/(401,333), hips (245,482)/(355,482), ankles (234,543)/(366,543), eyes (249,200)/(351,200), beak (300,242). SVG names and groups do not automatically supply Rive bones or pivots.

Suggested expressions: Happy = hide dot eyes, reveal closed-eye curves and cheeks; reveal open mouth and move upper bill slightly upward. Tired = hide dot eyes and reveal sleepy-eye curves. Verify draw order and head/body overlaps during rigging; large rotations may reveal seams.

Remaining work: visual approval, Rive import inspection, pivots, optional bones, timelines, state machine and playback verification.
