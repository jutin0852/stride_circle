import { useMemo } from 'react';

import {
  Leaderboard as PanelLeaderboard,
  type LeaderboardEntry,
  type LeaderboardPodium,
} from 'panelui-native/components/leaderboard';

import { formatSteps, type Friend } from '@/data/circle';
import { getAvatarUrl } from '@/lib/avatar';

export function Leaderboard({
  changes,
  friends,
  podium = 'bars',
}: {
  changes?: Record<string, number>;
  friends: Friend[];
  podium?: LeaderboardPodium;
}) {
  const data = useMemo<LeaderboardEntry[]>(
    () => friends.map((friend, index) => {
      const id = friend.id ?? `${friend.name}-${index}`;
      return {
        // PanelUI renders avatars with React Native Image. Use DiceBear's PNG
        // variant here; the profile editor and inline circle avatars continue
        // to use the existing SVG renderer.
        avatar: friend.avatar ? getAvatarUrl(friend.avatar, 'png') : undefined,
        change: changes?.[id],
        id,
        name: friend.name,
        value: Math.max(0, Math.floor(friend.steps)),
      };
    }),
    [changes, friends],
  );
  const highlightId = data.find((entry, index) => friends[index]?.isYou)?.id;

  return (
    <PanelLeaderboard
      data={data}
      emptyText="No walkers have logged steps yet"
      formatValue={formatSteps}
      highlightId={highlightId}
      podium={podium}
      podiumHeight={152}
      unit="steps"
    />
  );
}
