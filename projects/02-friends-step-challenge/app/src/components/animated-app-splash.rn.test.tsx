import { act, render } from '@testing-library/react-native';

import { AnimatedAppSplash } from './animated-app-splash';

afterEach(() => { jest.useRealTimers(); });

it('hands off quickly when Reduce Motion is enabled', async () => {
  jest.useFakeTimers();
  const onFinished = jest.fn();
  const screen = await render(<AnimatedAppSplash onFinished={onFinished} reducedMotion />);

  expect(screen.getByLabelText('Stride Circle loading')).toBeTruthy();
  expect(onFinished).not.toHaveBeenCalled();

  await act(async () => { jest.advanceTimersByTime(180); });
  expect(onFinished).toHaveBeenCalledTimes(1);
});
