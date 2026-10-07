# Walking activity

Route: `/activity`

Verify:

1. The screen uses walking language: `RECORD WALK`, `Ready to walk?`, `Walk`, and `Start`.
2. Start and stop work with native location permission and a foreground GPS session.
3. A completed walk can be saved and later appears in History.
4. Route data remains private to the owner; circle members receive aggregate activity data only.
5. The web fallback is clearly treated as a preview path and is not used as evidence of native GPS behavior.

The current UI does not present running as a separate activity, although legacy run records remain readable for compatibility.
