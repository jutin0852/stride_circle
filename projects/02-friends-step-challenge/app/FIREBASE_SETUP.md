# Configure Firebase

The current app uses Firebase Authentication and Cloud Firestore for profiles, circles, daily steps, saved walks, cheers, and related projections. A local `.env` is required for the client to connect to a Firebase project; the file is ignored and must never be committed.

1. Create a Firebase project on the Spark (no-cost) plan.
2. In **Authentication → Sign-in method**, enable **Email/Password** and **Google**.
3. In **Firestore Database**, create a database in production mode.
4. Replace the Firestore rules with the contents of [firebase/firestore.rules](firebase/firestore.rules), then publish them. The rules cover authenticated profiles, private/public circle access, memberships, daily steps, private activities, cheers, blocks, reports, and server-generated score/recap projections.
5. In **Project settings → Your apps**, register a web app and copy its Firebase configuration values into a new `.env` file based on `.env.example`.
6. Configure Google sign-in as described in [docs/GOOGLE_SIGN_IN.md](docs/GOOGLE_SIGN_IN.md). Native iOS needs the web and iOS OAuth client IDs; native Android needs the web ID and a package/signing-SHA-1 registration. Supply IDs to local Metro and the build environment, then rebuild the development client for the Google native module and iOS return scheme.
7. Restart Expo after editing `.env`.

The Firebase configuration values and OAuth client IDs identify this client app; do not put service-account keys, database passwords, or any server-only secret in `.env` with the `EXPO_PUBLIC_` prefix.

## Profile pictures

Edit Profile can crop a library photo and upload it when Save is tapped, while keeping character selection as an alternative. Profile photos are visible to other members where avatars appear. Images are limited to JPG, PNG or WebP, up to 5 MB, and only the owner can upload or delete their images. Replacements use a new object, preserving the previous picture if saving fails; old app-managed uploads are removed after a successful replacement.

Profile photos use **ImageKit through the portable media gateway**, not Firebase Storage. Do not provision a Firebase Storage bucket or enable Blaze for this feature. Firebase remains responsible for authentication and profile data. See [docs/MEDIA_STORAGE.md](docs/MEDIA_STORAGE.md) for server secrets, deployment and provider migration. The existing image-picker dependency is reused; no new mobile package is required. Older development clients without that module must be rebuilt.

Media gateway security tests: `node --test tests/media-storage.test.cjs`, using isolated fakes (no cloud writes). Device acceptance: select/cancel a photo, save, reopen Profile, inspect Home and another circle member's view, replace the photo, switch back to a character, and retry once offline. Emulator tests must use an isolated test gateway, never real provider secrets. Automated tests do not prove the native picker or deployed provider behavior.

## Current implementation

- Email/password and Google create Firebase Auth users.
- On the first successful login, the app creates or updates a Firestore profile document.
- Circles, daily standings, personal steps/history, saved walks, streaks, milestones, and fixed cheers are implemented with Firestore-backed reads and writes.
- HealthKit, Health Connect, and the guarded iOS pedometer fallback are selected through the health-data provider boundary; health behavior still requires a native development build and physical-device verification.
- Initial 2nd gen Cloud Functions exist for selected circle operations and scheduled daily/weekly projections, but direct client circle mutations remain transitional and are not all routed through Functions yet.
- Native Google login uses the Google Sign-In library and requires a rebuilt development client, not Expo Go. Web uses Firebase's popup flow and authorized domains.

For the authoritative implementation snapshot and remaining gaps, see [docs/CURRENT_STATE.md](docs/CURRENT_STATE.md), [docs/FEATURE_MAP.md](docs/FEATURE_MAP.md), and [docs/PRODUCT_SCOPE.md](docs/PRODUCT_SCOPE.md).
