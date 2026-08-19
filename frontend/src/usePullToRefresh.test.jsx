// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { pullStatusLabel, usePullToRefresh } from './usePullToRefresh.js';

function Harness({ refresh }) {
  const pull = usePullToRefresh({ onRefresh: refresh });
  return <output>{pullStatusLabel[pull.status]}</output>;
}

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

it('refreshes after a pull from the top and reports success', async () => {
  const refresh = vi.fn().mockResolvedValue(true);
  render(<Harness refresh={refresh} />);
  fireEvent.touchStart(document, { touches: [{ clientX: 10, clientY: 5 }] });
  fireEvent.touchMove(document, { touches: [{ clientX: 10, clientY: 155 }] });
  expect(screen.getByText('ปล่อยเพื่อรีเฟรช')).toBeTruthy();
  await act(async () => fireEvent.touchEnd(document));
  expect(refresh).toHaveBeenCalledOnce();
  expect(screen.getByText('อัปเดตข้อมูลแล้ว')).toBeTruthy();
});

it('does not activate when the page is scrolled or the gesture begins in a field', () => {
  const refresh = vi.fn();
  Object.defineProperty(window, 'scrollY', { value: 20, configurable: true });
  const { container } = render(<><input /><Harness refresh={refresh} /></>);
  fireEvent.touchStart(container.querySelector('input'), { touches: [{ clientX: 0, clientY: 0 }] });
  fireEvent.touchMove(document, { touches: [{ clientX: 0, clientY: 160 }] });
  fireEvent.touchEnd(document);
  expect(refresh).not.toHaveBeenCalled();
  Object.defineProperty(window, 'scrollY', { value: 0, configurable: true });
});
