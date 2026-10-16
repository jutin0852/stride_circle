import { act, renderHook } from '@testing-library/react-native';

import { useForegroundLocation } from './use-foreground-location';

const mockLocation = {
  getCurrentPositionAsync: jest.fn(),
  getForegroundPermissionsAsync: jest.fn(),
  getLastKnownPositionAsync: jest.fn(),
  hasServicesEnabledAsync: jest.fn(),
  requestForegroundPermissionsAsync: jest.fn(),
};

jest.mock('expo-location', () => ({
  Accuracy: { High: 4 },
  getCurrentPositionAsync: (...args: unknown[]) => mockLocation.getCurrentPositionAsync(...args),
  getForegroundPermissionsAsync: (...args: unknown[]) => mockLocation.getForegroundPermissionsAsync(...args),
  getLastKnownPositionAsync: (...args: unknown[]) => mockLocation.getLastKnownPositionAsync(...args),
  hasServicesEnabledAsync: (...args: unknown[]) => mockLocation.hasServicesEnabledAsync(...args),
  requestForegroundPermissionsAsync: (...args: unknown[]) => mockLocation.requestForegroundPermissionsAsync(...args),
}));

const position = (latitude: number) => ({ coords: { latitude, longitude: 3.4 } });

async function flush() {
  await act(async () => {
    jest.runOnlyPendingTimers();
    for (let index = 0; index < 10; index += 1) await Promise.resolve();
  });
}

beforeEach(() => {
  jest.useFakeTimers();
  mockLocation.hasServicesEnabledAsync.mockReset().mockResolvedValue(true);
  mockLocation.getForegroundPermissionsAsync.mockReset().mockResolvedValue({ canAskAgain: true, granted: true });
  mockLocation.requestForegroundPermissionsAsync.mockReset().mockResolvedValue({ canAskAgain: true, granted: true });
  mockLocation.getLastKnownPositionAsync.mockReset().mockResolvedValue(position(6.5));
  mockLocation.getCurrentPositionAsync.mockReset().mockResolvedValue(position(6.6));
});

afterEach(() => jest.useRealTimers());

describe('useForegroundLocation', () => {
  it('prefetches the last known position for a background screen without prompting', async () => {
    mockLocation.getForegroundPermissionsAsync.mockResolvedValue({ canAskAgain: true, granted: false });
    const { result } = await renderHook(() => useForegroundLocation(true, false));
    await flush();

    expect(mockLocation.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
    expect(result.current.status).toBe('denied');
  });

  it('is ready from the last known position and stays ready across tab switches', async () => {
    const { rerender, result } = await renderHook(({ active }: { active: boolean }) => useForegroundLocation(true, active), { initialProps: { active: true } });
    await flush();
    expect(result.current.status).toBe('ready');
    expect(result.current.point).toEqual({ latitude: 6.6, longitude: 3.4 });

    const statuses: string[] = [];
    await rerender({ active: false });
    statuses.push(result.current.status);
    await rerender({ active: true });
    statuses.push(result.current.status);
    await flush();
    statuses.push(result.current.status);

    expect(statuses).toEqual(['ready', 'ready', 'ready']);
    // Returning within the refresh window reuses the known position.
    expect(mockLocation.getCurrentPositionAsync).toHaveBeenCalledTimes(1);
  });

  it('keeps the known position when a later GPS refresh fails', async () => {
    const { result } = await renderHook(() => useForegroundLocation(true, true));
    await flush();
    mockLocation.getLastKnownPositionAsync.mockResolvedValue(null);
    mockLocation.getCurrentPositionAsync.mockRejectedValue(new Error('timeout'));

    let refreshed: unknown;
    await act(async () => { refreshed = await result.current.refresh(false); });

    expect(refreshed).toEqual({ latitude: 6.6, longitude: 3.4 });
    expect(result.current.status).toBe('ready');
  });
});
