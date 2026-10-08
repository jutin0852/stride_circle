import { validCoordinate } from '@/domain/walk';
import { simplifyRoute, splitRoute, type RoutePoint } from '@/lib/route';

export function mapboxToken() {
  const token = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN?.trim();
  return token?.startsWith('pk.') ? token : null;
}
export class MapServiceError extends Error {
  constructor(public code: 'configuration' | 'network' | 'route' | 'waypoints') { super(code); }
}
async function request(path: string, parameters: Record<string, string>) {
  const token = mapboxToken();
  if (!token) throw new MapServiceError('configuration');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(`https://api.mapbox.com/${path}?${new URLSearchParams({ ...parameters, access_token: token })}`, { signal: controller.signal });
    if (!response.ok) throw new MapServiceError('network');
    return await response.json() as unknown;
  } catch (error) { if (error instanceof MapServiceError) throw error; throw new MapServiceError('network'); }
  finally { clearTimeout(timeout); }
}
type MapResponse = { code?: string; routes?: { geometry?: { coordinates?: number[][] }; distance?: number; duration?: number }[]; matchings?: { geometry?: { coordinates?: number[][] } }[] };
function coordinates(value: number[][] | undefined): RoutePoint[] {
  if (!value) throw new MapServiceError('route');
  const result = value.map(p => ({ longitude: p[0], latitude: p[1] }));
  if (result.length < 2 || !result.every(validCoordinate)) throw new MapServiceError('route');
  return result;
}
export function parseWalkingDirections(value: unknown) {
  const data = value as MapResponse;
  const route = data?.routes?.[0];
  if (data?.code !== 'Ok' || !route || !Number.isFinite(route.distance) || route.distance! < 0 || !Number.isFinite(route.duration) || route.duration! < 0) throw new MapServiceError('route');
  return { coordinates: coordinates(route.geometry?.coordinates), distanceMeters: route.distance!, estimatedDurationSeconds: route.duration! };
}
export async function walkingDirections(waypoints: RoutePoint[]) {
  if (waypoints.length < 2 || waypoints.length > 25 || !waypoints.every(validCoordinate)) throw new MapServiceError('waypoints');
  return parseWalkingDirections(await request(`directions/v5/mapbox/walking/${waypoints.map(p => `${p.longitude},${p.latitude}`).join(';')}`, { geometries: 'geojson', overview: 'full', steps: 'false' }));
}
/** Opt-in only. Never send raw accuracy metadata; never bridge paused segments. */
export async function matchWalkingRoute(route: RoutePoint[]): Promise<RoutePoint[]> {
  if (!mapboxToken() || route.length < 2) return route;
  try {
    const segments = splitRoute(route);
    const results: RoutePoint[] = [];
    for (const segment of segments) {
      if (segment.length < 2) { results.push(...segment); continue; }
      for (let offset = 0; offset < segment.length - 1; offset += 99) {
        const chunk = segment.slice(offset, offset + 100);
        const data = await request(`matching/v5/mapbox/walking/${chunk.map(p => `${p.longitude},${p.latitude}`).join(';')}`, { geometries: 'geojson', overview: 'full', tidy: 'true' }) as MapResponse;
        if (data.code !== 'Ok' || !data.matchings?.length) return route;
        for (const match of data.matchings) {
          const points = coordinates(match.geometry?.coordinates);
          results.push(...points.map((p, i) => i === 0 ? { ...p, segmentStart: true } : p));
        }
      }
    }
    return simplifyRoute(results, 1500);
  } catch { return route; }
}

/** Input must already be privacy safe. Called only on an explicit share action. */
export function staticWalkMapUrl(route: RoutePoint[], dark = false) {
  const token = mapboxToken();
  if (!token || !route.length) return null;
  const overlay = encodeURIComponent(JSON.stringify({ type: 'FeatureCollection', features: splitRoute(route).filter(s => s.length > 1).map(s => ({ type: 'Feature', properties: { stroke: '#4BB5D0', 'stroke-width': 5 }, geometry: { type: 'LineString', coordinates: s.map(p => [p.longitude, p.latitude]) } })) }));
  const url = `https://api.mapbox.com/styles/v1/mapbox/${dark ? 'dark-v11' : 'light-v11'}/static/geojson(${overlay})/auto/600x600@2x?padding=60&access_token=${encodeURIComponent(token)}`;
  return url.length < 8000 ? url : null;
}
