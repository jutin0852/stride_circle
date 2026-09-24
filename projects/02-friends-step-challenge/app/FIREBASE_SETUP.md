# Connect Firebase

The app is ready for Firebase Authentication and a minimal Firestore profile.
Nothing is connected until you complete these console steps.

1. Create a Firebase project on the Spark (no-cost) plan.
2. In **Authentication → Sign-in method**, enable **Email/Password** and **Google**.
3. In **Firestore Database**, create a database in production mode.
4. Replace the Firestore rules with the contents of [firebase/firestore.rules](firebase/firestore.rules), then publish them. These rules let each signed-in person access only their own `users/{uid}` profile document; future circles and step data need their own rules.
5. In **Project settings → Your apps**, register a web app and copy its Firebase configuration values into a new `.env` file based on `.env.example`.
6. In Google Cloud Console, create OAuth client IDs for web, Android, and iOS. Put the IDs in `.env` as the `EXPO_PUBLIC_GOOGLE_*_CLIENT_ID` values. Configure the development build/production redirect for the `stride-circle` scheme before testing Google sign-in.
7. Restart Expo after editing `.env`.

The Firebase configuration values and OAuth client IDs identify this client app; do not put service-account keys, database passwords, or any server-only secret in `.env` with the `EXPO_PUBLIC_` prefix.

## Current scope

- Email/password and Google create Firebase Auth users.
- On the first successful login, the app creates one private Firestore profile document.
- The step leaderboard, circles, and history remain local mock data for the next feature.
- Google OAuth needs a development build or published native app, not Expo Go, because Google needs to redirect back into the app's custom scheme.
