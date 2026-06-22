// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { AddExpenseView, DashboardView, MonthView } from './components.jsx';
import {
  DEBT_OPTIONS,
  FINANCE_COLORS,
  calculateMonthSummary,
  normalizeDashboard,
} from './lib/finance.js';

const dashboard = normalizeDashboard({
  next5Months: [
    { key: 'jun', label: 'มิ.ย. 69' },
    { key: 'jul', label: 'ก.ค. 69' },
  ],
  incomes: { jun: 18000 },
  extras: [
    { id: 'other-1', date: '22/06/2569', note: 'ยืมแม่', amount: 500, monthKey: 'jun', category: 'other' },
  ],
  debtShopeePay: [{ monthKey: 'jun', monthLabel: 'มิ.ย. 69', amount: 865 }],
  debtShopeecrAsh: [{ monthKey: 'jun', monthLabel: 'มิ.ย. 69', amount: 2138 }],
  debtKasikorn: [{ monthKey: 'jun', monthLabel: 'มิ.ย. 69', amount: 1400 }],
  fixedExpenses: [
    { fixedKey: 'room', label: 'ค่าห้อง/น้ำ/ไฟ', amount: 1600, active: true, notes: 'ประมาณการ' },
    { fixedKey: 'paused', label: 'พักไว้', amount: 999, active: false },
  ],
});

const baseProps = {
  dashboard,
  selectedMonth: 'jun',
  selectedMonthLabel: 'มิ.ย. 69',
  currentSummary: calculateMonthSummary(dashboard, 'jun'),
  loading: false,
  saving: false,
  onSelectMonth: vi.fn(),
  onAddExpense: vi.fn(),
  onDeleteExpense: vi.fn(),
  onSaveIncome: vi.fn(),
  onClearIncome: vi.fn(),
  onSaveDebt: vi.fn(),
  onDeleteDebt: vi.fn(),
  onSaveFixedExpense: vi.fn(),
  onDeleteFixedExpense: vi.fn(),
};

afterEach(cleanup);

describe('view composition', () => {
  it('keeps Dashboard focused on overview and expands fixed and other details', () => {
    render(<DashboardView {...baseProps} />);

    expect(screen.queryByRole('heading', { name: 'บันทึกรายจ่าย' })).toBeNull();
    expect(screen.queryByRole('heading', { name: 'รายการล่าสุด' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /รายจ่ายคงที่/ }));
    expect(screen.getByText('ค่าห้อง/น้ำ/ไฟ')).toBeTruthy();
    expect(screen.queryByText('พักไว้')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /รายจ่ายอื่นๆ/ }));
    expect(screen.getByText('ยืมแม่')).toBeTruthy();
    expect(screen.getByText('500 บาท')).toBeTruthy();
  });

  it('moves income and recent expenses to the record view', () => {
    render(<AddExpenseView {...baseProps} />);

    expect(screen.getByRole('heading', { name: 'บันทึกรายจ่าย' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'รายรับจริง' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'รายการล่าสุด' })).toBeTruthy();
  });

  it('removes income from the month view and shows one debt group at a time', () => {
    render(<MonthView {...baseProps} />);

    expect(screen.queryByRole('heading', { name: 'รายรับจริง' })).toBeNull();
    expect(screen.getByText('1,400 บาท')).toBeTruthy();
    expect(screen.queryByText('865 บาท')).toBeNull();

    fireEvent.click(screen.getByRole('tab', { name: 'ShopeePay' }));
    expect(screen.getByText('865 บาท')).toBeTruthy();
    expect(screen.queryByText('1,400 บาท')).toBeNull();
  });
});

describe('shared finance colors', () => {
  it('uses Dashboard colors for debt tabs', () => {
    expect(DEBT_OPTIONS.find((item) => item.key === 'shopeePay')?.color).toBe(FINANCE_COLORS.shopeePay);
    expect(DEBT_OPTIONS.find((item) => item.key === 'shopeeCrash')?.color).toBe(FINANCE_COLORS.shopeeEasy);
  });
});
