export const EST_INCOME = 16275;

export const FIXED_EXPENSES = {
  room: 1600,
  net: 250,
  oil: 1000,
};

export const FIXED_TOTAL = Object.values(FIXED_EXPENSES).reduce((sum, value) => sum + value, 0);

export const CATEGORY_OPTIONS = [
  { key: 'shopeePay', label: 'ShopeePay', color: '#8fa2ff' },
  { key: 'shopeeEasy', label: 'ShopeeEasy', color: '#4d96ff' },
  { key: 'other', label: 'อื่นๆ', color: '#aeb7c8' },
];

export function formatBaht(value) {
  return Math.round(Number(value) || 0).toLocaleString('th-TH');
}

export function buildMonthLookup(months = []) {
  return months.reduce((lookup, month) => {
    lookup[month.key] = month.label;
    return lookup;
  }, {});
}

export function normalizeCategories(items) {
  if (!Array.isArray(items) || items.length === 0) return CATEGORY_OPTIONS;

  const categories = items
    .map((item) => ({
      key: String(item.categoryKey || item.key || '').trim(),
      label: String(item.label || item.categoryKey || item.key || '').trim(),
      color: String(item.color || '#aeb7c8').trim(),
      active: item.active !== false,
      sortOrder: Number(item.sortOrder) || 0,
    }))
    .filter((item) => item.key && item.active)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  return categories.length ? categories : CATEGORY_OPTIONS;
}

export function normalizeCategory(category, categories = CATEGORY_OPTIONS) {
  const categoryKeys = new Set(categories.map((item) => item.key));
  return categoryKeys.has(category) ? category : 'other';
}

export function normalizeDashboard(raw = {}) {
  const months = Array.isArray(raw.next5Months) ? raw.next5Months : [];
  const monthLookup = buildMonthLookup(months);
  const categories = normalizeCategories(raw.categories);
  const fixedExpenses = normalizeFixedExpenses(raw.fixedExpenses);
  const settings = raw.settings || {};
  const expenses = (raw.extras || []).map((item, index) => ({
    id: String(item.id ?? index),
    date: String(item.date || ''),
    note: String(item.note || 'ไม่มีหมายเหตุ'),
    amount: Number(item.amount) || 0,
    monthKey: String(item.monthKey || months[0]?.key || ''),
    monthLabel: monthLookup[item.monthKey] || '',
    category: normalizeCategory(item.category, categories),
    index,
  }));

  return {
    months,
    monthLookup,
    incomes: raw.incomes || {},
    expenses,
    recentExpenses: sortRecentExpenses(expenses).slice(0, 8),
    debtShopeePay: raw.debtShopeePay || [],
    debtShopeecrAsh: raw.debtShopeecrAsh || [],
    debtKasikorn: raw.debtKasikorn || [],
    categories,
    fixedExpenses,
    settings,
    estimatedIncome: Number(settings.estimatedIncome) || EST_INCOME,
  };
}

export function calculateMonthSummary(dashboard, monthKey) {
  const incomeValue = dashboard.incomes?.[monthKey];
  const income = incomeValue != null ? Number(incomeValue) || 0 : dashboard.estimatedIncome;
  const expenseTotal = sumByMonth(dashboard.expenses, monthKey);
  const fixedTotal = calculateFixedTotal(dashboard.fixedExpenses);
  const debtTotal =
    sumDebtByMonth(dashboard.debtShopeePay, monthKey) +
    sumDebtByMonth(dashboard.debtShopeecrAsh, monthKey) +
    sumDebtByMonth(dashboard.debtKasikorn, monthKey);
  const totalExpenses = expenseTotal + debtTotal + fixedTotal;
  const remaining = income - totalExpenses;

  return {
    income,
    incomeConfirmed: incomeValue != null,
    expenseTotal,
    debtTotal,
    fixedTotal,
    totalExpenses,
    remaining,
    weeklyAllowance: Math.round(remaining / 4),
  };
}

export function buildMonthlyBreakdown(dashboard, monthKey) {
  const categoryRows = buildCategoryBreakdown(dashboard.expenses, monthKey, dashboard.categories);
  const fixedTotal = calculateFixedTotal(dashboard.fixedExpenses);
  const debtRows = [
    {
      key: 'debt-shopeePay',
      label: 'ShopeePay',
      color: '#8fa2ff',
      amount: sumDebtByMonth(dashboard.debtShopeePay, monthKey),
    },
    {
      key: 'debt-shopeeEasy',
      label: 'ShopeeEasy',
      color: '#4d96ff',
      amount: sumDebtByMonth(dashboard.debtShopeecrAsh, monthKey),
    },
    {
      key: 'debt-kasikorn',
      label: 'กสิกร',
      color: '#00a950',
      amount: sumDebtByMonth(dashboard.debtKasikorn, monthKey),
    },
  ].filter((item) => item.amount > 0);

  const fixedRow = fixedTotal > 0
    ? [{ key: 'fixed', label: 'รายจ่ายคงที่', color: '#ff9f1c', amount: fixedTotal }]
    : [];

  return [...categoryRows, ...debtRows, ...fixedRow];
}

function normalizeFixedExpenses(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return Object.entries(FIXED_EXPENSES).map(([fixedKey, amount], index) => ({
      fixedKey,
      label: fixedKey,
      amount,
      active: true,
      sortOrder: index + 1,
    }));
  }

  return items
    .map((item) => ({
      fixedKey: String(item.fixedKey || ''),
      label: String(item.label || item.fixedKey || ''),
      amount: Number(item.amount) || 0,
      active: item.active !== false,
      sortOrder: Number(item.sortOrder) || 0,
      notes: String(item.notes || ''),
    }))
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

function calculateFixedTotal(items = []) {
  return items
    .filter((item) => item.active !== false)
    .reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
}

export function buildCategoryBreakdown(expenses, monthKey, categories = CATEGORY_OPTIONS) {
  const totals = new Map(categories.map((category) => [category.key, 0]));

  expenses
    .filter((expense) => expense.monthKey === monthKey)
    .forEach((expense) => {
      const key = normalizeCategory(expense.category, categories);
      totals.set(key, (totals.get(key) || 0) + expense.amount);
    });

  return categories
    .map((category) => ({
      ...category,
      amount: totals.get(category.key) || 0,
    }))
    .filter((category) => category.amount > 0);
}

export function expensesForMonth(expenses, monthKey) {
  return sortRecentExpenses(expenses.filter((expense) => expense.monthKey === monthKey));
}

function sumByMonth(items = [], monthKey) {
  return items
    .filter((item) => item.monthKey === monthKey)
    .reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
}

function sumDebtByMonth(items = [], monthKey) {
  return items
    .filter((item) => item.monthKey === monthKey)
    .reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
}

function sortRecentExpenses(expenses) {
  return [...expenses].sort((a, b) => {
    const dateDiff = parseThaiDate(b.date) - parseThaiDate(a.date);
    if (dateDiff !== 0) return dateDiff;
    return a.index - b.index;
  });
}

function parseThaiDate(value) {
  const [day, month, year] = String(value).split('/').map(Number);
  if (!day || !month || !year) return 0;
  const gregorianYear = year > 2400 ? year - 543 : year;
  return new Date(gregorianYear, month - 1, day).getTime();
}
