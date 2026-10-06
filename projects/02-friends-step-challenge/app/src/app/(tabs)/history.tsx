import { router } from 'expo-router';

import { useAuth } from '@/auth/auth-provider';
import { HistoryScreen } from '@/features/history/history-screen';

export default function HistoryRoute() {
  const { user } = useAuth();
  return <HistoryScreen userId={user?.uid} onOpenWalk={(activityId) => router.push({ pathname: '/activity/[activityId]', params: { activityId } })} />;
}
