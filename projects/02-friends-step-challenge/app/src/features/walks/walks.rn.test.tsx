import { Alert, View as MockView } from 'react-native';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { useActivityTracking } from '@/hooks/use-activity-tracking';
import { activityFromSession, getWalk, saveLocalWalk } from '@/services/walks/repository';
import { finishRecording, newRecording } from '@/lib/activity-recording';
import { shareableWalk } from '@/domain/walk';
import { WalkRecorder } from './walk-recorder';
import { WalkDetail } from './walk-detail';
import { WalkPlanner } from './walk-planner';
import { WalkShareCard } from './share-card';

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('expo-router', () => ({ router: { back: jest.fn(), replace: jest.fn(), push: jest.fn() }, useLocalSearchParams: () => ({ id: 'walk' }) }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));
jest.mock('@/auth/auth-provider', () => ({ useAuth: () => ({ user: { uid: 'user' } }) }));
jest.mock('@/components/activity-map', () => ({ ActivityMap: () => <MockView accessibilityLabel="Walk map" /> }));
jest.mock('@/hooks/use-activity-tracking', () => ({ useActivityTracking: jest.fn() }));
jest.mock('@/hooks/use-walks', () => ({ useWalks: () => ({ routes: [], activities: [], loading: false, error: false, refresh: jest.fn() }) }));
jest.mock('@/lib/background-activity', () => ({ getBackgroundRecording: () => ({ session: null, issue: null }) }));
jest.mock('@/services/walks/repository', () => ({
  ...jest.requireActual('@/services/walks/repository'),
  getWalk: jest.fn(), saveLocalWalk: jest.fn().mockResolvedValue(undefined), syncPendingWalks: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('@react-native-async-storage/async-storage', () => ({ getItem: jest.fn(), setItem: jest.fn() }));
jest.mock('firebase/firestore', () => ({}));
jest.mock('@/lib/firebase', () => ({ database: {}, requireFirebase: jest.fn() }));
jest.mock('@/services/maps/mapbox', () => ({ mapboxToken: () => null, staticWalkMapUrl: () => null, matchWalkingRoute: jest.fn() }));
jest.mock('@/services/walks/share', () => ({ shareWalkImage: jest.fn() }));

const finished = finishRecording({ ...newRecording('walk', 'user', 'walk', 1000), steps: 120 }, 11000);
const tracking = () => (useActivityTracking as jest.Mock).getMockImplementation()!();
beforeEach(() => {
  jest.clearAllMocks();
  (useActivityTracking as jest.Mock).mockReturnValue({ status: 'idle', isPreparing: false, isRestoring: false, steps: null,
    route: [], elapsedMs: 0, distanceMeters: 0, gpsSignal: 'idle', start: jest.fn(), pause: jest.fn(), resume: jest.fn(), reset: jest.fn(),
    finish: jest.fn().mockResolvedValue({ session: finished }), requestStepAccess: jest.fn(), retryStop: jest.fn() });
  (getWalk as jest.Mock).mockResolvedValue(activityFromSession(finished));
});
it('starts a walk without representing missing sensor steps as zero', async () => {
  const screen = await render(<WalkRecorder />);
  expect(screen.getByLabelText('Steps: Unavailable')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Start Walk' }));
  expect(tracking().start).toHaveBeenCalledTimes(1);
});
it('explains denied location access and exposes Settings', async () => {
  (useActivityTracking as jest.Mock).mockReturnValue({ ...tracking(), status: 'denied' });
  const screen = await render(<WalkRecorder />);
  expect(screen.getByText(/Location access is denied/)).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Open Settings' })).toBeTruthy();
});
it('disables starting while restoring or preparing', async () => {
  (useActivityTracking as jest.Mock).mockReturnValue({ ...tracking(), isPreparing: true });
  const screen = await render(<WalkRecorder />);
  expect(screen.getByRole('button', { name: 'Start Walk' }).props.accessibilityState.disabled).toBe(true);
});
it('requires confirmation to finish and saves before navigating', async () => {
  (useActivityTracking as jest.Mock).mockReturnValue({ ...tracking(), status: 'tracking' });
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  const screen = await render(<WalkRecorder />);
  await fireEvent.press(screen.getByRole('button', { name: 'Finish' }));
  expect(saveLocalWalk).not.toHaveBeenCalled();
  await act(async () => { alert.mock.calls[0][2]![1].onPress!(); });
  await waitFor(() => expect(router.replace).toHaveBeenCalledWith({ pathname: '/walk/[id]', params: { id: 'walk' } }));
  expect(saveLocalWalk).toHaveBeenCalledWith(expect.objectContaining({ steps: 120, rawCoordinates: [] }));
  alert.mockRestore();
});
it('shows completed statistics and handles an empty route', async () => {
  const screen = await render(<WalkDetail />);
  await waitFor(() => expect(screen.getByLabelText('Steps: 120')).toBeTruthy());
  expect(screen.getByLabelText('Distance: 0.00 km')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Share walk' })).toBeTruthy();
});
it('offers saved routes and clear missing-token handling in the planner', async () => {
  const screen = await render(<WalkPlanner />);
  expect(screen.getByText(/Mapbox is not configured/)).toBeTruthy();
  expect(screen.getByText('No saved routes yet.')).toBeTruthy();
});
it('does not render a private route on a fully masked share card', async () => {
  const walk = activityFromSession(finished);
  const screen = await render(<WalkShareCard walk={shareableWalk(walk)} />);
  expect(screen.getByText('Route hidden for privacy')).toBeTruthy();
});
