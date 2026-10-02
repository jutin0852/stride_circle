# iOS development build with a free Apple Account

This project includes a GitHub Actions workflow for building an unsigned iOS development client. It is intended for personal sideloading with a free Apple Account, so a paid Apple Developer membership is not required.

## What this gives you

- A native iOS development client containing `expo-dev-client` and the project’s native modules.
- Metro/Fast Refresh from the Windows development machine.
- A repeatable build artifact that can be installed with a personal sideloading tool.

## Prerequisites

- A GitHub repository containing this project.
- A normal Apple Account.
- AltServer/AltStore or another personal sideloading tool installed from its official source.
- Developer Mode enabled on the iPhone.
- The iPhone and Windows computer available to refresh the app periodically.

Free Apple Account provisioning is for personal testing. Apple limits the provisioning lifetime and app/device count, so the app must be refreshed or reinstalled periodically. It is not a TestFlight or App Store distribution path.

## Build

1. Push this project to a GitHub repository.
2. Open the repository’s **Actions** tab.
3. Run **Build iOS development client for free sideloading** manually.
4. Download the `stride-circle-development-unsigned` artifact from the completed workflow.
5. Install the `.ipa` through the personal sideloading tool.

The workflow generates the iOS native project on a macOS runner, installs CocoaPods dependencies, compiles a Debug app, and packages it as an IPA. It does not store Apple credentials in the repository.

## Connect to Metro

From the app directory on Windows, run:

```powershell
npx expo start --dev-client --lan
```

Open Stride Circle from the iPhone Home Screen and connect it to the displayed development server.

## Native-health limitation

The build includes the HealthKit native module, but free signing can restrict sensitive entitlements. If the HealthKit permission sheet does not appear or HealthKit access fails, the build can still be used for UI and application-flow testing, but real HealthKit validation will require Apple-authorized signing.

