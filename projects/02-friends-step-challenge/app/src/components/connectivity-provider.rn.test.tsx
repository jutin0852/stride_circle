import { act, render } from '@testing-library/react-native';

import { ConnectivityProvider, OFFLINE_DELAY_MS } from './connectivity-provider';
import { OfflineBanner } from './offline-banner';

type Snapshot = { metadata: { fromCache: boolean } };
const mockListeners: ((snapshot: Snapshot) => void)[] = [];

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('@/lib/firebase', () => ({ database: {} }));
jest.mock('firebase/firestore', () => ({
  doc: () => ({}),
  onSnapshot: (_reference: unknown, _options: unknown, next: (snapshot: Snapshot) => void) => {
    mockListeners.push(next);
    return () => undefined;
  },
}));

const BANNER_TEXT = /You’re offline/;

async function renderBanner() {
  return await render(<ConnectivityProvider userId="walker-1"><OfflineBanner bottom={80} /></ConnectivityProvider>);
}

beforeEach(() => {
  jest.useFakeTimers();
  mockListeners.length = 0;
});

afterEach(() => jest.useRealTimers());

describe('offline banner', () => {
  it('stays hidden while the server answers', async () => {
    const screen = await renderBanner();
    await act(async () => { mockListeners[0]({ metadata: { fromCache: false } }); });
    await act(async () => { jest.advanceTimersByTime(OFFLINE_DELAY_MS * 2); });

    expect(screen.queryByText(BANNER_TEXT)).toBeNull();
  });

  it('appears only after cache-only data persists, and clears when the server returns', async () => {
    const screen = await renderBanner();
    await act(async () => { mockListeners[0]({ metadata: { fromCache: false } }); });

    await act(async () => { mockListeners[0]({ metadata: { fromCache: true } }); });
    await act(async () => { jest.advanceTimersByTime(OFFLINE_DELAY_MS - 1); });
    expect(screen.queryByText(BANNER_TEXT)).toBeNull();

    await act(async () => { jest.advanceTimersByTime(1); });
    expect(screen.getByText(BANNER_TEXT)).toBeTruthy();

    await act(async () => { mockListeners[0]({ metadata: { fromCache: false } }); });
    expect(screen.queryByText(BANNER_TEXT)).toBeNull();
  });

  it('treats no server answer at all as offline', async () => {
    const screen = await renderBanner();
    await act(async () => { jest.advanceTimersByTime(OFFLINE_DELAY_MS); });

    expect(screen.getByText(BANNER_TEXT)).toBeTruthy();
  });
});
