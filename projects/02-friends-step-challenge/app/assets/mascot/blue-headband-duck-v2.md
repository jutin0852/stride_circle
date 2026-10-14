# Blue duck revision 2

Editable SVG: blue-headband-duck-v2.svg. Flat blue fill, continuous squat silhouette, white tied headband, half-lidded U-shaped eyes, small oval bill, and empty relaxed wings. No background or ground shadow.

The generated visual shown in chat is an appearance study, not the SVG itself. The SVG is a separate manual reconstruction and is not yet imported or rigged in Rive.

Groups use screen-left and screen-right naming. Body owns head and wings. Head owns face and headband. Each eye owns its pupil and upper-lid/brow stroke, allowing a whole-eye blink. Head fill overlaps the torso without a horizontal outline seam. Large head rotations may expose the overlap; use small tilts until a deformation rig is tested.

Suggested artboard-coordinate pivots: root (300,480); body (300,460); head (321,199); left wing (202,373); right wing (431,370); eye-left (305,229); eye-right (397,228); beak (350,280). These are setup instructions, not embedded Rive pivots or bones.

The walking_parts group is intentionally transparent in the reference pose. Reveal it when building the walking rig. Legs own feet. Keep it behind the body. Rig hip pivots at (233,464) and (377,464), ankles at (225,511) and (386,511). Movement and deformation still need visual testing.

Image-generation appearance prompt: extract the fourth top-row duck, preserve its squat continuous silhouette, tied white headband, half-lidded eyes and small oval beak, recolor body sky blue, remove the knife and handle, restore empty relaxed wings, isolate on transparency with flat black outlines. Created using the built-in image tool; SVG authored separately.
