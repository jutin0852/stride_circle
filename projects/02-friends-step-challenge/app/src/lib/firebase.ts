import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp } from 'firebase/app';
import * as FirebaseAuth from 'firebase/auth';
import {
  connectAuthEmulator,
  type Auth,
  getAuth,
  initializeAuth,
  type Persistence,
} from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore, type Firestore } from 'firebase/firestore';

import { getFirebaseEmulatorConfig } from '@/lib/firebase-emulator-config';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

export const firebaseIsConfigured = Object.values(firebaseConfig).every(Boolean);

type ReactNativeAuthModule = typeof FirebaseAuth & {
  getReactNativePersistence: (storage: typeof AsyncStorage) => Persistence;
};

const app = firebaseIsConfigured
  ? getApps().length > 0
    ? getApp()
    : initializeApp(firebaseConfig)
  : null;

function createAuth(): Auth | null {
  if (!app) return null;

  if (process.env.EXPO_OS === 'web') return getAuth(app);

  try {
    return initializeAuth(app, {
      // Firebase exposes this function through its React Native build. Its
      // browser-oriented TypeScript entrypoint does not include the type.
      persistence: (FirebaseAuth as ReactNativeAuthModule).getReactNativePersistence(AsyncStorage),
    });
  } catch (error) {
    const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : '';
    if (code === 'auth/already-initialized') return getAuth(app);
    throw error;
  }
}

export const auth = createAuth();
export const database: Firestore | null = app ? getFirestore(app) : null;

const firebaseEmulatorConfig = getFirebaseEmulatorConfig({
  development: process.env.NODE_ENV === 'development',
  enabled: process.env.EXPO_PUBLIC_FIREBASE_USE_EMULATORS,
  host: process.env.EXPO_PUBLIC_FIREBASE_EMULATOR_HOST,
  projectId: firebaseConfig.projectId,
});

if (firebaseEmulatorConfig) {
  if (auth) {
    connectAuthEmulator(
      auth,
      `http://${firebaseEmulatorConfig.host}:${firebaseEmulatorConfig.authPort}`,
      { disableWarnings: true },
    );
  }
  if (database) {
    connectFirestoreEmulator(
      database,
      firebaseEmulatorConfig.host,
      firebaseEmulatorConfig.firestorePort,
    );
  }
}

export function requireFirebase<T>(service: T | null, name: string): T {
  if (!service) {
    throw new Error(`Firebase is not configured. Add the ${name} settings to your .env file.`);
  }

  return service;
}
