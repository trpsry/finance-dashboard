// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import App from './App.jsx';

const payload = {
  next5Months: [{ key: 'jun', label: 'มิ.ย. 69' }],
  incomes: { jun: 18000 },
  extras: [],
  debtShopeePay: [],
  debtShopeecrAsh: [],
  debtKasikorn: [],
  categories: [
    { categoryKey: 'shopeePay', label: 'ShopeePay', color: '#ff9f1c', active: true, sortOrder: 10 },
    { categoryKey: 'shopeeEasy', label: 'ShopeeEasy', color: '#ffc878', active: true, sortOrder: 20 },
    { categoryKey: 'other', label: 'อื่นๆ', color: '#c9a8ff', active: true, sortOrder: 30 },
  ],
  fixedExpenses: [],
  settings: { estimatedIncome: 18000 },
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  if (typeof window.localStorage?.clear === 'function') window.localStorage.clear();
});

describe('optimistic mutations', () => {
  it('shows a new expense immediately and rolls it back when GAS fails', async () => {
    let rejectSave;
    const pendingSave = new Promise((resolve, reject) => {
      rejectSave = reject;
    });

    vi.stubGlobal('fetch', vi.fn((url, init = {}) => {
      if (init.method === 'POST') return pendingSave;
      return Promise.resolve({
        ok: true,
        json: async () => ({ ok: true, data: payload }),
      });
    }));

    render(<App />);
    await screen.findByText('18,000');
    fireEvent.click(screen.getByRole('button', { name: 'บันทึก' }));
    fireEvent.change(screen.getByLabelText('จำนวนเงิน'), { target: { value: '123' } });
    fireEvent.click(screen.getByRole('button', { name: 'บันทึกรายจ่าย' }));
    fireEvent.click(screen.getByRole('tab', { name: 'ล่าสุด' }));

    expect(screen.getByText('123 บาท')).toBeTruthy();

    await act(async () => {
      rejectSave(new Error('offline'));
      await pendingSave.catch(() => undefined);
    });

    expect(await screen.findByText('offline')).toBeTruthy();
    expect(screen.queryByText('123 บาท')).toBeNull();
  });

  it('replaces an existing debt amount for the same category and month after saving', async () => {
    const dashboardPayload = {
      ...payload,
      debtShopeePay: [{ monthKey: 'jun', monthLabel: 'มิ.ย. 69', amount: 1000 }],
    };
    const calls = [];

    vi.stubGlobal('fetch', vi.fn((url, init = {}) => {
      if (init.method === 'POST') {
        calls.push(JSON.parse(init.body));
        return Promise.resolve({
          ok: true,
          json: async () => ({
            ok: true,
            data: [{ monthKey: 'jun', monthLabel: 'มิ.ย. 69', amount: 1000 }],
          }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ ok: true, data: dashboardPayload }),
      });
    }));

    render(<App />);
    await screen.findByText('18,000');

    fireEvent.click(screen.getByRole('button', { name: 'บันทึก' }));
    const debtPanel = screen.getByRole('region', { name: 'ยอดหนี้เดือนนี้' });
    expect(within(debtPanel).getByText('1,000 บาท')).toBeTruthy();

    fireEvent.change(within(debtPanel).getByLabelText('ยอดหนี้'), { target: { value: '1000' } });
    fireEvent.click(within(debtPanel).getByRole('button', { name: 'บันทึกยอดหนี้' }));

    await screen.findByText('บันทึกยอดหนี้แล้ว');
    expect(calls[0]).toEqual({
      action: 'saveDebt',
      payload: { kind: 'shopeePay', monthKey: 'jun', monthLabel: 'มิ.ย. 69', amount: 1000 },
    });
    expect(within(debtPanel).getByText('1,000 บาท')).toBeTruthy();
    expect(within(debtPanel).queryByText('2,000 บาท')).toBeNull();
  });
});
