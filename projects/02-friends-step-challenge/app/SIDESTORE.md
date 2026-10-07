# iPhone installation and updates

Stride Circle is built as a normal iOS device app, without Expo Go or a development client. The repository workflow creates an unsigned IPA on a GitHub-hosted macOS runner. SideStore then signs that IPA with the Apple Account used on the iPhone.

## First-time setup

1. Install SideStore on the iPhone using the official Windows setup with `iloader`. The initial setup requires the iPhone, a USB cable, a Windows computer, Wi-Fi, and a free Apple Account.
2. Install `LocalDevVPN` from the App Store and connect it whenever SideStore needs to install, update, or refresh an app.
3. Trust the developer app in **Settings → General → VPN & Device Management**.
4. Enable **Settings → Privacy & Security → Developer Mode** if iOS asks for it.
5. Open SideStore, sign in with the same Apple Account used for the initial installation, and refresh SideStore once before installing Stride Circle.

Use the official guide for the current `iloader` and iPhone-specific steps: <https://docs.sidestore.io/docs/installation/>

## App configuration

Before the first GitHub build, add the values from your local `.env` to the repository's **Settings → Secrets and variables → Actions** as repository variables or secrets. Add these names:

- `EXPO_PUBLIC_FIREBASE_API_KEY`
- `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `EXPO_PUBLIC_FIREBASE_PROJECT_ID`
- `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `EXPO_PUBLIC_FIREBASE_APP_ID`
- `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`
- `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`
- `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID`

These values are client configuration and are bundled into the app; they must not contain Firebase service-account keys or other server secrets. The workflow accepts either repository variables or repository secrets. If they are missing, the IPA still builds, but sign-in and shared Firebase data will remain unavailable in the installed app.

## Install the walking app

1. Push the app changes to `main`, or run the **iOS unsigned IPA** workflow manually from the GitHub Actions tab.
2. Download the `StrideCircle-unsigned.ipa` file from the workflow artifact onto the iPhone. The Files app can open the downloaded file.
3. Share the file to SideStore, or open SideStore → **My Apps** → **+** and choose the IPA from Files.
4. Keep LocalDevVPN connected while SideStore installs and signs the app.
5. Open **Stride Circle** from the Home Screen. It is a standalone app and does not need the laptop or an Expo development server to launch.

## Repeatable updates

1. Push new app code to `main`.
2. Wait for the **iOS unsigned IPA** workflow to finish.
3. Download the new IPA from that run and import it into SideStore without deleting the existing Stride Circle app first.
4. SideStore should replace the matching app because the bundle identifier remains `com.stridecircle.app`. The workflow assigns a larger build number to each run, and reinstalling over the existing app preserves its local data where iOS permits it.

Do not change the bundle identifier after the first installation. Changing it makes iOS treat the build as a different app and prevents an in-place update.

## Free-account limits

Apple's Personal Team provisioning is intended for personal device testing. Apple documents a seven-day provisioning period, up to three apps installed per device, and up to ten App IDs per seven-day period. SideStore counts itself as one of the three apps and can refresh the other apps while its local VPN is available.

SideStore's current documentation says that importing an updated IPA without removing the original should retain app data. Keep the same Apple Account and bundle identifier, and do not delete the installed app as part of a normal update.

## Compatibility notes

The current app uses foreground location, Core Motion step counting, Apple Maps through `react-native-maps`, browser-based Google sign-in, Firebase's JavaScript SDK, and AsyncStorage. It does not currently request push notifications, background location, HealthKit, App Groups, associated domains, or other paid-team-only capabilities. The activity recorder therefore requires the app to remain active while a walk is being recorded; it is not a background GPS tracker.

This route is for personal testing and small-scale sharing. It is not an App Store or TestFlight distribution path, and every tester must use their own SideStore setup and free Apple Account.
