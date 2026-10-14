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

## Current implementation

- Email/password and Google create Firebase Auth users.
- On the first successful login, the app creates or updates a Firestore profile document.
- Circles, daily standings, personal steps/history, saved walks, streaks, milestones, and fixed cheers are implemented with Firestore-backed reads and writes.
- HealthKit, Health Connect, and the guarded iOS pedometer fallback are selected through the health-data provider boundary; health behavior still requires a native development build and physical-device verification.
- Initial 2nd gen Cloud Functions exist for selected circle operations and scheduled daily/weekly projections, but direct client circle mutations remain transitional and are not all routed through Functions yet.
- Native Google login uses the Google Sign-In library and requires a rebuilt development client, not Expo Go. Web uses Firebase's popup flow and authorized domains.

For the authoritative implementation snapshot and remaining gaps, see [docs/CURRENT_STATE.md](docs/CURRENT_STATE.md), [docs/FEATURE_MAP.md](docs/FEATURE_MAP.md), and [docs/PRODUCT_SCOPE.md](docs/PRODUCT_SCOPE.md).
