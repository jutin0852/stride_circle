# Authentication

Route: `/sign-in`

Verify:

1. The user sees `Welcome back`, `Email address`, `Password`, and `Sign in`.
2. Valid email/password credentials open the authenticated app.
3. `Create your account` opens registration with `Your name`, email, and password fields.
4. Authenticated profile data is created or updated in Firestore without exposing another user’s profile.
5. Sign-out from Profile returns to the sign-in route.

Prerequisites: Firebase configuration and a dedicated test account or emulator data. Google sign-in additionally requires the platform setup in `FIREBASE_SETUP.md`.
