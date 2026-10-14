import { expect, it, vi } from 'vitest';
import { finishRecording, newRecording, pauseRecording, resumeRecording } from '@/lib/activity-recording';
import { readSessionSteps, requestStepAccessIfNeeded } from './session-steps';
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
it('asks for step permission only when a sensor is available and access is undecided', async () => {
  const requestPermission = vi.fn().mockResolvedValue({ granted: true });
  const provider = { isAvailable: vi.fn().mockResolvedValue(true), getPermissionStatus: vi.fn().mockResolvedValue({ granted: false, status: 'not-determined' }), requestPermission } as unknown as HealthDataProvider;
  expect(await requestStepAccessIfNeeded(provider)).toBe(true);
  expect(requestPermission).toHaveBeenCalledOnce();
});
it('does not re-prompt after a permission decision or when the sensor is missing', async () => {
  const requestPermission = vi.fn();
  const decided = { isAvailable: vi.fn().mockResolvedValue(true), getPermissionStatus: vi.fn().mockResolvedValue({ granted: false, status: 'denied' }), requestPermission } as unknown as HealthDataProvider;
  expect(await requestStepAccessIfNeeded(decided)).toBe(false);
  expect(requestPermission).not.toHaveBeenCalled();
  const unavailable = { isAvailable: vi.fn().mockResolvedValue(false), getPermissionStatus: vi.fn(), requestPermission } as unknown as HealthDataProvider;
  expect(await requestStepAccessIfNeeded(unavailable)).toBe(false);
  expect(unavailable.getPermissionStatus).not.toHaveBeenCalled();
});
