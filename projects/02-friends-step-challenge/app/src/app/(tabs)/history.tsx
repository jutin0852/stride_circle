import { router } from 'expo-router';

import { useAuth } from '@/auth/auth-provider';
import { HistoryScreen } from '@/features/history/history-screen';

export default function HistoryRoute() {
  const { user } = useAuth();
  return <HistoryScreen userId={user?.uid} onOpenWalk={(id) => router.push({ pathname: '/walk/[id]', params: { id } })} />;
}
