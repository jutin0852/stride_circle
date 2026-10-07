import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SvgUri } from 'react-native-svg';

import { getAvatarUrl, type AvatarChoice } from '@/lib/avatar';
import { colors } from '@/theme';

export function DicebearAvatar({ choice, fallback, size = 44 }: { choice: AvatarChoice; fallback: string; size?: number }) {
  const [failed, setFailed] = useState(false);

  return (
    <View style={[styles.frame, { borderRadius: size / 2, height: size, width: size }]}>
      {failed ? <Text style={[styles.fallback, { fontSize: size * 0.3 }]}>{fallback}</Text> : <SvgUri height={size} onError={() => setFailed(true)} uri={getAvatarUrl(choice)} width={size} />}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { alignItems: 'center', backgroundColor: colors.soft, justifyContent: 'center', overflow: 'hidden' },
  fallback: { color: colors.accentPressed, fontWeight: '800' },
});
