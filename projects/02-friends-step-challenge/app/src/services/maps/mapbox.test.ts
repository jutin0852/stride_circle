import { afterEach, expect, it, vi } from 'vitest';
import { matchWalkingRoute, parseWalkingDirections, staticWalkMapUrl, walkingDirections } from './mapbox';
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
it('parses walking geometry with longitude-first coordinates', () => {
  expect(parseWalkingDirections({ code: 'Ok', routes: [{ distance: 1000, duration: 800, geometry: { coordinates: [[3, 6], [3.1, 6.1]] } }] })).toEqual({ coordinates: [{ latitude: 6, longitude: 3 }, { latitude: 6.1, longitude: 3.1 }], distanceMeters: 1000, estimatedDurationSeconds: 800 });
});
it('rejects malformed and unavailable directions', () => {
  expect(() => parseWalkingDirections({ code: 'NoRoute' })).toThrow();
  expect(() => parseWalkingDirections({ code: 'Ok', routes: [{ distance: 1, duration: 1, geometry: { coordinates: [[900, 1], [1, 1]] } }] })).toThrow();
});
it('rejects missing credentials and invalid waypoints without a request', async () => {
  vi.stubEnv('EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN', ''); const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
  await expect(walkingDirections([{ latitude: 0, longitude: 0 }])).rejects.toThrow();
  await expect(walkingDirections([{ latitude: 0, longitude: 0 }, { latitude: 1, longitude: 1 }])).rejects.toThrow();
  expect(fetch).not.toHaveBeenCalled(); expect(staticWalkMapUrl([])).toBeNull();
});
it('matching failure preserves the original route reference', async () => {
  vi.stubEnv('EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN', 'pk.test'); vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
  const route = [{ latitude: 0, longitude: 0 }, { latitude: 0.001, longitude: 0 }];
  expect(await matchWalkingRoute(route)).toBe(route);
});
it('directions sends intermediate waypoints in order', async () => {
  vi.stubEnv('EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN', 'pk.test');
  const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ code: 'Ok', routes: [{ distance: 100, duration: 80, geometry: { coordinates: [[0, 0], [0.001, 0]] } }] }) }); vi.stubGlobal('fetch', fetch);
  await walkingDirections([{ latitude: 1, longitude: 2 }, { latitude: 3, longitude: 4 }, { latitude: 5, longitude: 6 }]);
  expect(fetch.mock.calls[0][0]).toContain('/walking/2,1;4,3;6,5?');
});
it('matches long tracks in API-sized overlapping chunks without altering raw input', async () => {
  vi.stubEnv('EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN', 'pk.test');
  const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ code: 'Ok', matchings: [{ geometry: { coordinates: [[0, 0], [0.001, 0]] } }] }) });
  vi.stubGlobal('fetch', fetch);
  const route = Array.from({ length: 101 }, (_, i) => ({ latitude: i * 0.00001, longitude: 0 }));
  const original = JSON.stringify(route);
  const matched = await matchWalkingRoute(route);
  expect(fetch).toHaveBeenCalledTimes(2); expect(matched).toHaveLength(4);
  expect(JSON.stringify(route)).toBe(original);
  expect(matched[2].segmentStart).toBe(true);
});
