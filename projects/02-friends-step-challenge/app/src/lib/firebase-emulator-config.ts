export type FirebaseEmulatorConfig = {
  authPort: number;
  firestorePort: number;
  host: string;
};

export function getFirebaseEmulatorConfig(input: {
  development: boolean;
  enabled: string | undefined;
  host: string | undefined;
  projectId: string | undefined;
}): FirebaseEmulatorConfig | null {
  if (!input.development || input.enabled !== 'true') return null;

  if (!input.projectId?.trim().startsWith('demo-')) {
    throw new Error('Firebase emulators require a demo-* project ID to prevent live-project access.');
  }

  const host = input.host?.trim();
  if (!host || host.includes('://') || host.includes('/')) {
    throw new Error('Set EXPO_PUBLIC_FIREBASE_EMULATOR_HOST to a hostname or IP address.');
  }

  return { authPort: 9099, firestorePort: 8080, host };
}
