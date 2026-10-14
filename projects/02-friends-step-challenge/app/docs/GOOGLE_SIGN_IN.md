# Google sign-in

## Implementation

- iOS/Android use `@react-native-google-signin/google-signin` (16.1.5); the ID token is exchanged with the existing Firebase JS Auth service. Email sign-in and existing users are unchanged.
- Web uses Firebase `signInWithPopup`, not the deprecated Expo Google AuthSession provider.
- Only basic Google identity/profile scopes are requested. No offline access, Gmail/Drive/Calendar scopes, or client secrets are included in the app.
- Closing the Google window is cancellation. Busy controls prevent duplicate submissions; failures show a retryable message. Older development clients without the native library still support email sign-in.
- Profile creation retains saved photos/characters. Existing-account credential conflicts ask users to use their original method; there is no automatic account merge.

## Project configuration verified on 2026-10-14

Project: `stride-eecc8`. Google's documented Identity Toolkit API confirmed that Google is enabled and that authorized web domains are `localhost`, `stride-eecc8.firebaseapp.com`, and `stride-eecc8.web.app`.

Public identifiers (these are not secrets):

| Setting | Value |
| --- | --- |
| Web client | `146728739646-679nc8ijdt5uvtdsihkjnd0u2rqa6lrs.apps.googleusercontent.com` |
| iOS client | `146728739646-ae8ssoqf9mqennfnvqtbohopres08u6j.apps.googleusercontent.com` |
| iOS bundle | `com.stridecircle.app` |
| Firebase iOS app | `1:146728739646:ios:d755bccc050c0669f2c26f` |
| Android package | `com.iam_jutin.stridecircle` |
| Firebase Android app | `1:146728739646:android:809e38fbd767ff7bf2c26f` |

The mobile Firebase registrations were created with the existing Firebase CLI login. No existing users, rules, or sign-in providers were changed. The web client was reused.

Local `.env` contains `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` and `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`. Both public variables were also set on GitHub repository `jutin0852/stride_circle`; the existing `ios-unsigned-ipa.yml` workflow injects them into the build environment. EAS builds, if used instead, need the same values. `.env` is ignored and is not uploaded by Git.

`app.config.ts` derives the iOS reversed-client-ID URL scheme and supplies it to the Google config plugin. Expo config introspection confirmed the scheme is present. If the iOS ID is absent, the plugin is omitted and native Google login is unavailable; never ship a Google-enabled iOS build without these values.

The app continues to use Firebase JS Auth; no Firebase native SDK migration or service-account key is needed. Android uses the web client ID at runtime, not an Android client ID environment variable.

## Remaining native acceptance steps

1. Confirm the workflow uses the two public client-ID variables (the existing main-branch GitHub iOS workflow already does).
2. Build/install a new development client. A Metro reload cannot add the native Google module or iOS URL scheme.
3. For Android, register the **actual development APK signing SHA-1** on the Firebase Android app (`firebase apps:android:sha:create <appId> <SHA1> --project stride-eecc8`). Use the actual APK/EAS key, not a guessed/debug fingerprint. Add the Play signing certificate separately before Play release.
4. On iOS, select an account, confirm return to the app, profile creation/preservation, sign-out/re-login, cancellation, and a failed-network retry. Use a dedicated test account for verification writes.
5. On Android, repeat with Play Services and the registered signing certificate.
6. Web can use `localhost`. For a production web origin, add its exact domain in Firebase rather than widening the allowlist unnecessarily.

The free native library currently uses Google's deprecated-but-functional legacy Android SDK; keep a future Credential Manager migration separate from this setup. It does not affect the iOS implementation.

Local tests and config introspection do not prove physical-device OAuth return, Google consent, APK signing, or App Store readiness. No remote build, push, or device login is implied by these checks.

References: [Expo Google authentication](https://docs.expo.dev/guides/google-authentication/), [native library Expo setup](https://react-native-google-signin.github.io/docs/setting-up/expo), [Firebase Google authentication](https://firebase.google.com/docs/auth/web/google-signin).
