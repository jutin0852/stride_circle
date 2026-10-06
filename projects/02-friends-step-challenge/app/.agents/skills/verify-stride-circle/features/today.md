# Today / Home

Route: `/`

Verify:

1. The user sees `Your walking day, together.` and a current `Today’s steps` total.
2. Health data is collected through the configured native provider or guarded fallback; routine synchronization remains background work.
3. An active circle appears under `YOUR FEATURED CIRCLE`; the user can reach its standings.
4. Loading, unavailable, stale, permission, reduced-motion, and narrow-width states remain understandable.
5. Offline or failed sync does not create per-step writes or silently replace a newer total with an older read.

Web can verify layout and Firebase-backed flows, but native health permission, background observation, and device lifecycle behavior require a native development build and physical device.
