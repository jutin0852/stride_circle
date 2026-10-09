import { Redirect } from 'expo-router';
import { useAuth } from '@/auth/auth-provider';
import { WalkingReminderScreen } from '@/features/notifications/walking-reminder-screen';

export default function WalkingRemindersRoute() {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (!user) return <Redirect href="/sign-in" />;
  return <WalkingReminderScreen key={user.uid} userId={user.uid} />;
}
