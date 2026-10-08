import { expect, it, vi } from 'vitest';
import { finishRecording, newRecording, pauseRecording, resumeRecording } from '@/lib/activity-recording';
import { readSessionSteps } from './session-steps';
import type { HealthDataProvider } from '@/services/health-data/types';
it('counts sensor steps in each active interval; excludes steps walked during manual pause', async () => {
  const session = finishRecording(resumeRecording(pauseRecording(newRecording('id', 'user', 'walk', 1000), 2000, 'manual'), 5000), 8000);
  const read = vi.fn().mockResolvedValueOnce(20).mockResolvedValueOnce(35);
  const provider = { isAvailable: async () => true, getPermissionStatus: async () => ({ granted: true }), getDailySteps: read } as unknown as HealthDataProvider;
  expect(await readSessionSteps(session, provider)).toBe(55);
  expect(read.mock.calls.map(([range]) => [range.start.getTime(), range.end.getTime()])).toEqual([[1000, 2000], [5000, 8000]]);
});
it('returns unavailable rather than inventing steps when the sensor is absent', async () => {
  const provider = { isAvailable: async () => false } as HealthDataProvider;
  expect(await readSessionSteps(newRecording('id', 'user', 'walk', 1000), provider)).toBeNull();
});
