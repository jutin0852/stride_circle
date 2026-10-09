# Walking reminders

The first notification slice is an optional daily walking reminder, not remote chat alerts. Open **Profile → Walking reminders** or **Home settings → Walking reminders**. Reminders default to off with a suggested time of 18:00. Users can choose a preset or enter a 24-hour time, enable the switch, and save. The OS permission prompt appears only on this explicit opt-in. Saving while disabled never asks for permission.

## Implementation

- `src/domain/walking-reminders.ts`: time validation and safe preference parsing.
- `src/services/notifications/walking-reminder-service.ts`: serialized scheduling, reconciliation, and account changes.
- `src/services/notifications/notification-device.native.ts`: guarded Expo Notifications adapter, Android channel, daily local trigger, test notification, and tap handling.
- `src/services/notifications/notification-device.ts`: web fallback.
- `src/features/notifications/`: settings screen, presentation, and authenticated tap/lifecycle handling.

Preferences are stored in AsyncStorage per account on this device. There are no Firestore writes, push tokens, backend functions, polling, or background tracking for reminders. One recurring OS notification follows the device's daily hour/minute. Changing its time cancels the old schedule. Disabling cancels both the daily reminder and any pending test. Sign-out cancels this feature's schedules before signing out; another account starts with its own preference. Signing back in restores the original account's choice if notifications remain allowed.

The service reconciles on authentication and when the app returns to the foreground, including permission changes. It never cancels unrelated notifications. Tapping an owned reminder opens Home after authentication/navigation are ready. These are gentle routine reminders, not conditional “goal incomplete” alerts: a reminder can still arrive after a user has reached their goal.

## Native requirements and limits

`expo-notifications` is installed at the Expo SDK 57-compatible version and its config plugin is in `app.config.ts`. An existing development client without this native module must be rebuilt. The adapter keeps older clients usable and displays an unavailable state on the reminder settings page. Web does not schedule notifications.

Local reminders do not use APNs/FCM credentials or an EAS push project ID. `plugins/with-local-notifications.js` runs after Expo's notification plugin and removes its default `aps-environment` entitlement, so this local-only feature does not introduce a remote-push signing requirement in the free-sideload iOS workflow. Remote circle chat notifications would be a separate implementation requiring signing/push credentials and backend delivery; remove/revisit this local-only plugin when adding remote push. This change neither builds nor deploys the application.

Focus/Do Not Disturb, Android channel settings, OS battery restrictions, and notification permission can affect delivery. Settings use the phone's local time; timezone changes, restart behavior and DST transitions must be checked on physical devices. Changes made in system settings while the app is closed are reconciled the next time it becomes active.

## Device acceptance checks

1. Open the page in the updated iOS and Android development builds. Confirm it starts disabled and never prompts at launch.
2. Enable and save a near-future time; allow permission. Confirm only one daily reminder is scheduled, including after relaunch.
3. Send the five-second test in the foreground and with the phone locked. Tap it and confirm Home opens.
4. Change the time, then disable. Confirm the previous schedule and pending tests are cancelled.
5. Deny/revoke permission. Confirm settings recovery is available and reminders restore after permission is allowed and the app is reopened.
6. Sign out, then sign into another account. Confirm no previous-account schedule remains; sign back into the original account to check restoration.
7. Check midnight, timezone changes/DST, phone restart, Focus mode, and Android notification-channel settings.

Unit/component tests prove validation, deduplication, account cancellation, permission handling, schedule rollback, and UI controls. They do not prove native notification delivery.
