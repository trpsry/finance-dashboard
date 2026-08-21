// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { usePullToRefresh } from './usePullToRefresh.js';

function Harness({ disabled = false, onRefresh }) {
  const pull = usePullToRefresh({ disabled, onRefresh });
  return (
    <div>
      <span data-testid="status">{pull.status}</span>
      <span data-testid="distance">{Math.round(pull.distance)}</span>
    </div>
  );
}

function touchEvent(type, clientY, target = document.body) {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'touches', {
    value: type === 'touchend' ? [] : [{ clientY }],
  });
  Object.defineProperty(event, 'changedTouches', {
    value: [{ clientY }],
  });
  Object.defineProperty(event, 'target', { value: target });
  return event;
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('usePullToRefresh', () => {
  it('refreshes only after a top-of-page pull crosses the threshold', async () => {
    const onRefresh = vi.fn(async () => undefined);
    vi.spyOn(window, 'scrollY', 'get').mockReturnValue(0);

    render(<Harness onRefresh={onRefresh} />);

    await act(async () => {
      window.dispatchEvent(touchEvent('touchstart', 0));
      window.dispatchEvent(touchEvent('touchmove', 220));
      window.dispatchEvent(touchEvent('touchend', 220));
    });

    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('status').textContent).toBe('complete');
  });

  it('does not begin when disabled or when the touch starts on a form control', async () => {
    const onRefresh = vi.fn(async () => undefined);
    const input = document.createElement('input');
    document.body.appendChild(input);
    vi.spyOn(window, 'scrollY', 'get').mockReturnValue(0);

    render(<Harness disabled onRefresh={onRefresh} />);

    await act(async () => {
      window.dispatchEvent(touchEvent('touchstart', 0, input));
      window.dispatchEvent(touchEvent('touchmove', 240, input));
      window.dispatchEvent(touchEvent('touchend', 240, input));
    });

    expect(onRefresh).not.toHaveBeenCalled();
    expect(screen.getByTestId('status').textContent).toBe('idle');
  });
});
