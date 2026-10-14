import { Image, StyleSheet, View } from 'react-native';
import Svg, { Polyline } from 'react-native-svg';
import { AppText } from '@/components/ui';
import { useAppColors } from '@/design-system/use-app-theme';
import { formatWalkPace, formatWalkTime, routeBounds, type shareableWalk } from '@/domain/walk';
import { splitRoute } from '@/lib/route';

export type SharedWalk = ReturnType<typeof shareableWalk>;
/** Only accepts the allowlisted, privacy-filtered object. No access to raw coordinates. */
export function WalkShareCard({ walk, story = true, mapUri, photoUri, routeEmptyMessage, onMapReady, onMapError, onPhotoReady, onPhotoError }: { walk: SharedWalk; story?: boolean; mapUri?: string | null; photoUri?: string | null; routeEmptyMessage: string; onMapReady?: () => void; onMapError?: () => void; onPhotoReady?: () => void; onPhotoError?: () => void }) {
  const colors = useAppColors();
  const routeSegments = splitRoute(walk.route).filter(segment => segment.length > 1);
  const bounds = routeBounds(routeSegments.flat());
  const longitudeScale = Math.cos((bounds ? (bounds.north + bounds.south) / 2 : 0) * Math.PI / 180);
  const scale = bounds ? Math.max((bounds.east - bounds.west) * longitudeScale, bounds.north - bounds.south, 0.0001) : 1;
  const photoText = photoUri ? { color: '#FFFFFF' } : undefined;
  return <View style={[styles.card, { aspectRatio: story ? 9 / 16 : 1, padding: story ? 20 : 12, backgroundColor: colors.background, borderColor: colors.border }]}>
    {photoUri ? <><Image testID="walk-share-photo" accessible={false} source={{ uri: photoUri }} resizeMode="cover" style={StyleSheet.absoluteFill} onLoad={onPhotoReady} onError={onPhotoError} /><View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.48)' }]} /></> : null}
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}><AppText maxFontSizeMultiplier={1} variant="label" style={[{ color: colors.accent, fontSize: 11, lineHeight: 15 }, photoText]}>STRIDE CIRCLE</AppText><AppText maxFontSizeMultiplier={1} variant="caption" style={[{ fontSize: 10, lineHeight: 15 }, photoText]}>{walk.dateKey}</AppText></View>
    <AppText maxFontSizeMultiplier={1} variant="headline" numberOfLines={2} style={[{ fontSize: 22, lineHeight: 26 }, photoText]}>{walk.title}</AppText>
    <View style={[styles.map, { backgroundColor: photoUri ? 'transparent' : colors.soft }]}>
      {!photoUri && mapUri ? <Image source={{ uri: mapUri }} resizeMode="contain" style={StyleSheet.absoluteFill} onLoad={onMapReady} onError={onMapError} /> : bounds && routeSegments.length ? <Svg testID="walk-share-route" viewBox="0 0 300 300" width="100%" height="100%">{routeSegments.map((segment, index) => {
        const points = segment.map(p => `${150 + (p.longitude - (bounds.east + bounds.west) / 2) * longitudeScale / scale * 240},${150 - (p.latitude - (bounds.north + bounds.south) / 2) / scale * 240}`).join(' ');
        return <ViewlessRoute key={index} points={points} photo={Boolean(photoUri)} color={colors.accent} />;
      })}</Svg> : !photoUri ? <AppText maxFontSizeMultiplier={1} variant="caption" style={{ paddingHorizontal: 12, textAlign: 'center' }}>{routeEmptyMessage}</AppText> : null}
    </View>
    <View style={styles.stats}>
      <ShareStat photo={Boolean(photoUri)} story={story} label="Distance" value={`${(walk.distanceMeters / 1000).toFixed(2)} km`} />
      <ShareStat photo={Boolean(photoUri)} story={story} label="Active time" value={formatWalkTime(walk.durationSeconds)} />
      <ShareStat photo={Boolean(photoUri)} story={story} label="Steps" value={walk.steps === null ? '—' : walk.steps.toLocaleString()} />
      {story ? <ShareStat photo={Boolean(photoUri)} story label="Pace" value={formatWalkPace(walk.averagePaceSecondsPerKm)} /> : null}
    </View>
  </View>;
}
function ViewlessRoute({ points, photo, color }: { points: string; photo: boolean; color: string }) {
  return <>{photo ? <Polyline points={points} fill="none" stroke="rgba(0,0,0,0.6)" strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" /> : null}<Polyline points={points} fill="none" stroke={photo ? '#FFFFFF' : color} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" /></>;
}
function ShareStat({ label, value, story, photo }: { label: string; value: string; story: boolean; photo: boolean }) { return <View style={{ width: story ? '46%' : '30%' }}><AppText maxFontSizeMultiplier={1} variant="label" style={{ fontSize: 14, lineHeight: 18, ...(photo ? { color: '#FFFFFF' } : {}) }}>{value}</AppText><AppText maxFontSizeMultiplier={1} variant="caption" style={{ fontSize: 10, lineHeight: 14, ...(photo ? { color: '#FFFFFF' } : {}) }}>{label}</AppText></View>; }
const styles = StyleSheet.create({ card: { width: '100%', gap: 8, borderWidth: 2, borderBottomWidth: 4, borderRadius: 8, overflow: 'hidden' }, map: { flex: 1, minHeight: 60, alignItems: 'center', justifyContent: 'center' }, stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 } });
