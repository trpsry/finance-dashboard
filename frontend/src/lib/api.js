export function createApiClient({ endpoint, fetchImpl = fetch }) {
  if (!endpoint) {
    return createDemoClient();
  }

  const cleanEndpoint = endpoint.trim();

  async function request(action, payload, method = 'POST') {
    const url = method === 'GET' ? withAction(cleanEndpoint, action) : cleanEndpoint;
    const init =
      method === 'GET'
        ? { method: 'GET', mode: 'cors' }
        : {
            method: 'POST',
            mode: 'cors',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action, payload }),
          };

    const response = await fetchImpl(url, init);
    const body = await response.json();
    if (!response.ok || body.ok === false) {
      throw new Error(body.error || `Request failed: ${response.status}`);
    }
    return body.data;
  }

  return {
    loadAll: () => request('loadAll', undefined, 'GET'),
    addExpense: (payload) => request('addExpense', payload),
    deleteExpense: (payload) => request('deleteExpense', payload),
    saveIncome: (payload) => request('saveIncome', payload),
    clearIncome: (payload) => request('clearIncome', payload),
    saveDebt: (payload) => request('saveDebt', payload),
    deleteDebt: (payload) => request('deleteDebt', payload),
    saveFixedExpense: (payload) => request('saveFixedExpense', payload),
    deleteFixedExpense: (payload) => request('deleteFixedExpense', payload),
  };
}

function withAction(endpoint, action) {
  const url = new URL(endpoint);
  url.searchParams.set('action', action);
  return url.toString();
}

function createDemoClient() {
  const demo = {
    next5Months: [
      { key: 'may', label: 'พฤษภาคม 2567' },
      { key: 'jun', label: 'มิถุนายน 2567' },
      { key: 'jul', label: 'กรกฎาคม 2567' },
      { key: 'aug', label: 'สิงหาคม 2567' },
      { key: 'sep', label: 'กันยายน 2567' },
    ],
    incomes: { may: 25000 },
    extras: [
      { id: 'demo-1', date: '16/05/2567', note: 'ShopeePay', amount: 120, monthKey: 'may', category: 'shopeePay' },
      { id: 'demo-2', date: '16/05/2567', note: 'ShopeeEasy', amount: 42, monthKey: 'may', category: 'shopeeEasy' },
      { id: 'demo-3', date: '15/05/2567', note: 'อื่นๆ', amount: 380, monthKey: 'may', category: 'other' },
    ],
    categories: [
      { categoryKey: 'shopeePay', label: 'ShopeePay', color: '#8fa2ff', active: true, sortOrder: 10 },
      { categoryKey: 'shopeeEasy', label: 'ShopeeEasy', color: '#4d96ff', active: true, sortOrder: 20 },
      { categoryKey: 'other', label: 'อื่นๆ', color: '#aeb7c8', active: true, sortOrder: 30 },
    ],
    debtShopeePay: [{ monthKey: 'may', monthLabel: 'พฤษภาคม 2567', amount: 1200, updatedAt: '15/05/2567' }],
    debtShopeecrAsh: [{ monthKey: 'may', monthLabel: 'พฤษภาคม 2567', amount: 900, updatedAt: '15/05/2567' }],
    debtKasikorn: [{ monthKey: 'may', monthLabel: 'พฤษภาคม 2567', amount: 2500, updatedAt: '15/05/2567' }],
    fixedExpenses: [
      { fixedKey: 'room', label: 'ค่าห้อง/น้ำ/ไฟ', amount: 1600, active: true, sortOrder: 10, notes: 'ประมาณการ' },
      { fixedKey: 'net', label: 'เน็ต', amount: 250, active: true, sortOrder: 20, notes: 'คงที่' },
      { fixedKey: 'oil', label: 'น้ำมัน', amount: 1000, active: true, sortOrder: 30, notes: 'คงที่' },
    ],
  };

  return {
    loadAll: async () => structuredClone(demo),
    addExpense: async (payload) => {
      demo.extras.unshift({
        id: `demo-${Date.now()}`,
        date: new Date().toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' }),
        ...payload,
      });
      return structuredClone(demo.extras);
    },
    deleteExpense: async ({ id }) => {
      demo.extras = demo.extras.filter((item) => String(item.id) !== String(id));
      return structuredClone(demo.extras);
    },
    saveIncome: async ({ monthKey, amount }) => {
      demo.incomes[monthKey] = Number(amount) || 0;
      return structuredClone(demo.incomes);
    },
    clearIncome: async ({ monthKey }) => {
      demo.incomes[monthKey] = null;
      return structuredClone(demo.incomes);
    },
    saveDebt: async () => [],
    deleteDebt: async () => [],
    saveFixedExpense: async (payload) => {
      const key = payload.fixedKey || `fixed-${Date.now()}`;
      const existingIndex = demo.fixedExpenses.findIndex((item) => item.fixedKey === key);
      const row = {
        fixedKey: key,
        label: payload.label,
        amount: Number(payload.amount) || 0,
        active: payload.active !== false,
        sortOrder: existingIndex >= 0 ? demo.fixedExpenses[existingIndex].sortOrder : demo.fixedExpenses.length * 10 + 10,
        notes: payload.notes || '',
      };
      if (existingIndex >= 0) demo.fixedExpenses[existingIndex] = row;
      else demo.fixedExpenses.push(row);
      return structuredClone(demo.fixedExpenses);
    },
    deleteFixedExpense: async ({ fixedKey }) => {
      demo.fixedExpenses = demo.fixedExpenses.filter((item) => String(item.fixedKey) !== String(fixedKey));
      return structuredClone(demo.fixedExpenses);
    },
  };
}
