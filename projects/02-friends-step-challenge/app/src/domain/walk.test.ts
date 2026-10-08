import { describe, expect, it } from 'vitest';
import { averagePace, defaultRoutePrivacy, distanceBetween, estimatedSteps, formatWalkPace, privacyRoute, routeBounds, routeDistance, shareableWalk, type WalkActivity } from './walk';
import { finishRecording, newRecording, pauseRecording, readRecording, recordLocations, recordingElapsed, resumeRecording } from '@/lib/activity-recording';
const point = (latitude: number) => ({ latitude, longitude: 0 });
const trace = Array.from({ length: 21 }, (_, i) => point(i * 0.0005));
const sample = (latitude: number, timestamp: number, accuracy = 5) => ({ timestamp, coords: { ...point(latitude), accuracy } });

describe('walk geography and privacy', () => {
  it('accumulates route segments instead of start to end distance', () => {
    expect(routeDistance([point(0), point(0.001), point(0)])).toBeCloseTo(222.39, 1);
    expect(routeDistance([point(0), { ...point(1), segmentStart: true }])).toBe(0);
  });
  it('handles zero distance, nonfinite pace, and minute carry', () => {
    expect(averagePace(300, 0)).toBeNull(); expect(averagePace(300, 10)).toBeNull();
    expect(averagePace(600, 1000)).toBe(600);
    expect(formatWalkPace(Infinity)).toBe('—'); expect(formatWalkPace(719.8)).toBe('12:00 /km');
  });
  it('clips both ends without mutating the owner trace', () => {
    const original = JSON.stringify(trace);
    const safe = privacyRoute(trace, defaultRoutePrivacy);
    expect(distanceBetween(safe[0], trace[0])).toBeGreaterThanOrEqual(200);
    expect(distanceBetween(safe.at(-1)!, trace.at(-1)!)).toBeGreaterThanOrEqual(200);
    expect(JSON.stringify(trace)).toBe(original);
    expect(safe[0].segmentStart).toBe(true);
  });
  it('hides all short walks and respects entire-map privacy', () => {
    expect(privacyRoute(trace.slice(0, 5), defaultRoutePrivacy)).toEqual([]);
    expect(privacyRoute(trace, { ...defaultRoutePrivacy, hideMap: true })).toEqual([]);
  });
  it('hides loop endpoints and revisits within a home zone', () => {
    const loop = [...trace, ...trace.toReversed()];
    const safe = privacyRoute(loop, defaultRoutePrivacy);
    expect(safe.every(p => distanceBetween(p, loop[0]) >= 200)).toBe(true);
  });
  it('constructs a social allowlist without raw points or private endpoints', () => {
    const activity = { id: 'walk', title: 'Morning walk', dateKey: '2026-10-08', steps: 1000, distanceMeters: 1100, durationSeconds: 600,
      averagePaceSecondsPerKm: 600, rawCoordinates: trace, displayCoordinates: trace, privacy: defaultRoutePrivacy,
      userId: 'private-owner', startCoordinate: trace[0], endCoordinate: trace.at(-1) } as unknown as WalkActivity;
    const shared = shareableWalk(activity);
    expect(shared).not.toHaveProperty('rawCoordinates'); expect(shared).not.toHaveProperty('startCoordinate'); expect(shared).not.toHaveProperty('userId');
    expect(shared.route[0]).not.toEqual(trace[0]);
  });
  it('handles no route and a single coordinate', () => {
    expect(routeBounds([])).toBeNull(); expect(routeBounds([point(1)])).toEqual({ north: 1, south: 1, east: 0, west: 0 });
    expect(estimatedSteps(750)).toBe(1000);
  });
});
describe('durable recorder model', () => {
  it('excludes pause time and persists step query intervals across midnight', () => {
    const midnight = Date.parse('2026-10-09T00:00:00Z');
    let session = newRecording('walk', 'user', 'walk', midnight - 10000);
    session = pauseRecording(session, midnight, 'manual');
    expect(recordingElapsed(session, midnight + 100000)).toBe(10000);
    session = resumeRecording(session, midnight + 5000);
    session = finishRecording(session, midnight + 15000);
    expect(session.elapsedMs).toBe(20000);
    expect(session.stepIntervals).toEqual([{ start: midnight - 10000, end: midnight }, { start: midnight + 5000, end: midnight + 15000 }]);
    expect(session.firstStartedAt).toBe(midnight - 10000);
  });
  it('stores original accuracy metadata while filtering jumps and inaccurate fixes from the display trace', () => {
    let session = newRecording('walk', 'user', 'walk', 1000);
    session = recordLocations(session, [sample(0, 1000), sample(0.00005, 6000), sample(1, 11000), sample(0.0001, 16000, 200)]);
    expect(session.rawCoordinates).toHaveLength(4);
    expect(session.route).toHaveLength(2); expect(session.distanceMeters).toBeCloseTo(5.56, 1);
    expect(session.rawCoordinates!.at(-1)!.accuracy).toBe(200);
  });
  it('ignores paused samples and duplicate delivery', () => {
    const session = recordLocations(newRecording('walk', 'user', 'walk', 1000), [sample(0, 1000)]);
    expect(recordLocations(session, [sample(0, 1000)]).rawCoordinates).toHaveLength(1);
    const paused = pauseRecording(session, 2000, 'manual');
    expect(recordLocations(paused, [sample(0.1, 3000)])).toBe(paused);
  });
  it('restores raw GPS and active intervals but clears the previous live fix', () => {
    const session = recordLocations(newRecording('walk', 'user', 'walk', 1000), [sample(0, 1000)]);
    const restored = readRecording(JSON.stringify(session));
    expect(restored?.rawCoordinates).toEqual(session.rawCoordinates);
    expect(restored?.stepIntervals).toEqual(session.stepIntervals); expect(restored?.previous).toBeNull();
    expect(readRecording('{broken')).toBeNull();
  });
});
