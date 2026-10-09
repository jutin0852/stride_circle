import { createContext, use, useEffect, useState, type PropsWithChildren } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';

import { auth, firebaseIsConfigured } from '@/lib/firebase';
import { restoreBackgroundRecording, stopBackgroundRecordingOnSignOut } from '@/lib/background-activity';
import { walkingReminders } from '@/services/notifications/walking-reminders';

type AuthContextValue = {
  isConfigured: boolean;
  isLoading: boolean;
  user: User | null;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(firebaseIsConfigured);

  useEffect(() => {
    if (!auth) return;

    return onAuthStateChanged(auth, (nextUser) => {
      void walkingReminders.activate(nextUser?.uid ?? null).catch(() => {});
      if (!nextUser) void stopBackgroundRecordingOnSignOut().catch(() => {});
      else if (process.env.EXPO_OS !== 'web') void restoreBackgroundRecording(nextUser.uid).catch(() => {});
      setUser(nextUser);
      setIsLoading(false);
    });
  }, []);

  return <AuthContext value={{ isConfigured: firebaseIsConfigured, isLoading, user }}>{children}</AuthContext>;
}

export function useAuth() {
  const context = use(AuthContext);

  if (!context) throw new Error('useAuth must be used inside AuthProvider.');

  return context;
}
