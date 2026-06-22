// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
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
  localStorage.clear();
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

    expect(screen.getByText('123 บาท')).toBeTruthy();

    await act(async () => {
      rejectSave(new Error('offline'));
      await pendingSave.catch(() => undefined);
    });

    expect(await screen.findByText('offline')).toBeTruthy();
    expect(screen.queryByText('123 บาท')).toBeNull();
  });
});
