import { Image, StyleSheet, View } from 'react-native';
import Svg, { Polyline } from 'react-native-svg';
import { AppText } from '@/components/ui';
import { useAppColors } from '@/design-system/use-app-theme';
import { formatWalkPace, formatWalkTime, routeBounds, type shareableWalk } from '@/domain/walk';
import { splitRoute } from '@/lib/route';

export type SharedWalk = ReturnType<typeof shareableWalk>;
/** Only accepts the allowlisted, privacy-filtered object. No access to raw coordinates. */
export function WalkShareCard({ walk, story = true, mapUri, onMapReady, onMapError }: { walk: SharedWalk; story?: boolean; mapUri?: string | null; onMapReady?: () => void; onMapError?: () => void }) {
  const colors = useAppColors();
  const bounds = routeBounds(walk.route);
  const longitudeScale = Math.cos((bounds ? (bounds.north + bounds.south) / 2 : 0) * Math.PI / 180);
  const scale = bounds ? Math.max((bounds.east - bounds.west) * longitudeScale, bounds.north - bounds.south, 0.0001) : 1;
  return <View style={[styles.card, { aspectRatio: story ? 9 / 16 : 1, padding: story ? 20 : 12, backgroundColor: colors.background, borderColor: colors.border }]}>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}><AppText maxFontSizeMultiplier={1} variant="label" style={{ color: colors.accent, fontSize: 11, lineHeight: 15 }}>STRIDE CIRCLE</AppText><AppText maxFontSizeMultiplier={1} variant="caption" style={{ fontSize: 10, lineHeight: 15 }}>{walk.dateKey}</AppText></View>
    <AppText maxFontSizeMultiplier={1} variant="headline" numberOfLines={2} style={{ fontSize: 22, lineHeight: 26 }}>{walk.title}</AppText>
    <View style={[styles.map, { backgroundColor: colors.soft }]}>
      {mapUri ? <Image source={{ uri: mapUri }} resizeMode="contain" style={StyleSheet.absoluteFill} onLoad={onMapReady} onError={onMapError} /> : bounds && walk.route.length > 1 ? <Svg viewBox="0 0 300 300" width="100%" height="100%">{splitRoute(walk.route).map((segment, index) => <Polyline key={index} points={segment.map(p => `${150 + (p.longitude - (bounds.east + bounds.west) / 2) * longitudeScale / scale * 240},${150 - (p.latitude - (bounds.north + bounds.south) / 2) / scale * 240}`).join(' ')} fill="none" stroke={colors.accent} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />)}</Svg> : <AppText maxFontSizeMultiplier={1} variant="label">Route hidden for privacy</AppText>}
    </View>
    <View style={styles.stats}>
      <ShareStat story={story} label="Distance" value={`${(walk.distanceMeters / 1000).toFixed(2)} km`} />
      <ShareStat story={story} label="Active time" value={formatWalkTime(walk.durationSeconds)} />
      <ShareStat story={story} label="Steps" value={walk.steps === null ? '—' : walk.steps.toLocaleString()} />
      {story ? <ShareStat story label="Pace" value={formatWalkPace(walk.averagePaceSecondsPerKm)} /> : null}
    </View>
  </View>;
}
function ShareStat({ label, value, story }: { label: string; value: string; story: boolean }) { return <View style={{ width: story ? '46%' : '30%' }}><AppText maxFontSizeMultiplier={1} variant="label" style={{ fontSize: 14, lineHeight: 18 }}>{value}</AppText><AppText maxFontSizeMultiplier={1} variant="caption" style={{ fontSize: 10, lineHeight: 14 }}>{label}</AppText></View>; }
const styles = StyleSheet.create({ card: { width: '100%', gap: 8, borderWidth: 2, borderBottomWidth: 4, borderRadius: 8 }, map: { flex: 1, minHeight: 60, alignItems: 'center', justifyContent: 'center' }, stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 } });
