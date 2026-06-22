import { describe, expect, it } from 'vitest';
import {
  buildCategoryBreakdown,
  buildMonthlyBreakdown,
  buildMonthLookup,
  calculateMonthSummary,
  normalizeDashboard,
} from './finance.js';

const rawDashboard = {
  next5Months: [
    { key: 'may', label: 'พ.ค. 67' },
    { key: 'jun', label: 'มิ.ย. 67' },
  ],
  incomes: { may: 25000, jun: null },
  extras: [
    { id: '1', date: '16/05/2567', note: 'ยอด ShopeePay', amount: 120, monthKey: 'may', category: 'shopeePay' },
    { id: '2', date: '16/05/2567', note: 'ยอด ShopeeEasy', amount: 42, monthKey: 'may', category: 'shopeeEasy' },
    { id: 'legacy', date: '15/05/2567', note: 'ของเดิม', amount: 300, monthKey: 'may' },
  ],
  debtShopeePay: [{ monthKey: 'may', monthLabel: 'พ.ค. 67', amount: 1500, updatedAt: '15/05/2567' }],
  debtShopeecrAsh: [{ monthKey: 'may', monthLabel: 'พ.ค. 67', amount: 700, updatedAt: '15/05/2567' }],
  debtKasikorn: [{ monthKey: 'may', monthLabel: 'พ.ค. 67', amount: 2500, updatedAt: '15/05/2567' }],
  categories: [
    { categoryKey: 'shopeePay', label: 'ShopeePay', color: '#8fa2ff', active: true, sortOrder: 10 },
    { categoryKey: 'shopeeEasy', label: 'ShopeeEasy', color: '#4d96ff', active: true, sortOrder: 20 },
    { categoryKey: 'other', label: 'อื่นๆ', color: '#aeb7c8', active: true, sortOrder: 30 },
    { categoryKey: 'hidden', label: 'ปิดไว้', color: '#000000', active: false, sortOrder: 40 },
  ],
};

describe('normalizeDashboard', () => {
  it('keeps old Extras rows by assigning uncategorized rows to other', () => {
    const dashboard = normalizeDashboard(rawDashboard);

    expect(dashboard.expenses).toContainEqual(
      expect.objectContaining({
        id: 'legacy',
        note: 'ของเดิม',
        category: 'other',
        amount: 300,
      }),
    );
  });

  it('sorts recent expenses by newest first without mutating source rows', () => {
    const dashboard = normalizeDashboard(rawDashboard);

    expect(dashboard.recentExpenses.map((item) => item.id)).toEqual(['1', '2', 'legacy']);
    expect(rawDashboard.extras[2].category).toBeUndefined();
  });

  it('uses active categories from the spreadsheet payload', () => {
    const dashboard = normalizeDashboard(rawDashboard);

    expect(dashboard.categories).toEqual([
      expect.objectContaining({ key: 'shopeePay', label: 'ShopeePay', color: '#8fa2ff' }),
      expect.objectContaining({ key: 'shopeeEasy' }),
      expect.objectContaining({ key: 'other' }),
    ]);
    expect(dashboard.categories.some((item) => item.key === 'hidden')).toBe(false);
  });
});

describe('calculateMonthSummary', () => {
  it('combines income, fixed costs, debts, and expenses into a mobile summary', () => {
    const dashboard = normalizeDashboard(rawDashboard);
    const summary = calculateMonthSummary(dashboard, 'may');

    expect(summary.income).toBe(25000);
    expect(summary.debtTotal).toBe(4700);
    expect(summary.expenseTotal).toBe(462);
    expect(summary.fixedTotal).toBe(2850);
    expect(summary.totalExpenses).toBe(8012);
    expect(summary.remaining).toBe(16988);
    expect(summary.weeklyAllowance).toBe(4247);
  });

  it('uses fixed expenses and estimated income from the spreadsheet payload when present', () => {
    const dashboard = normalizeDashboard({
      next5Months: [{ key: 'jun', label: 'มิ.ย. 67' }],
      incomes: { jun: null },
      extras: [],
      debtShopeePay: [],
      debtShopeecrAsh: [],
      debtKasikorn: [],
      fixedExpenses: [
        { fixedKey: 'room', label: 'ค่าห้อง', amount: 2000, active: true },
        { fixedKey: 'paused', label: 'พักไว้', amount: 999, active: false },
      ],
      settings: { estimatedIncome: 18000 },
    });

    const summary = calculateMonthSummary(dashboard, 'jun');

    expect(summary.income).toBe(18000);
    expect(summary.fixedTotal).toBe(2000);
    expect(summary.totalExpenses).toBe(2000);
    expect(summary.remaining).toBe(16000);
  });
});

describe('buildCategoryBreakdown', () => {
  it('groups month expenses by configured category labels and colors', () => {
    const dashboard = normalizeDashboard(rawDashboard);
    const breakdown = buildCategoryBreakdown(dashboard.expenses, 'may', dashboard.categories);

    expect(breakdown).toEqual([
      expect.objectContaining({ key: 'shopeePay', label: 'ShopeePay', amount: 120 }),
      expect.objectContaining({ key: 'shopeeEasy', label: 'ShopeeEasy', amount: 42 }),
      expect.objectContaining({ key: 'other', label: 'อื่นๆ', amount: 300 }),
    ]);
  });
});

describe('buildMonthlyBreakdown', () => {
  it('includes expense categories, monthly debts, and fixed expenses', () => {
    const dashboard = normalizeDashboard(rawDashboard);
    const breakdown = buildMonthlyBreakdown(dashboard, 'may');

    expect(breakdown).toEqual([
      expect.objectContaining({ key: 'shopeePay', amount: 120 }),
      expect.objectContaining({ key: 'shopeeEasy', amount: 42 }),
      expect.objectContaining({ key: 'other', amount: 300 }),
      expect.objectContaining({ key: 'debt-shopeePay', amount: 1500 }),
      expect.objectContaining({ key: 'debt-shopeeEasy', amount: 700 }),
      expect.objectContaining({ key: 'debt-kasikorn', amount: 2500 }),
      expect.objectContaining({ key: 'fixed', amount: 2850 }),
    ]);
  });
});

describe('buildMonthLookup', () => {
  it('maps month keys to labels for form selects and recent rows', () => {
    expect(buildMonthLookup(rawDashboard.next5Months)).toEqual({
      may: 'พ.ค. 67',
      jun: 'มิ.ย. 67',
    });
  });
});
