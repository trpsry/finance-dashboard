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
      { id: 'demo-1', date: '16/05/2567', note: 'ข้าวผัดกุ้ง', amount: 120, monthKey: 'may', category: 'food' },
      { id: 'demo-2', date: '16/05/2567', note: 'ค่าโดยสาร BTS', amount: 42, monthKey: 'may', category: 'transport' },
      { id: 'demo-3', date: '15/05/2567', note: 'ค่าน้ำประปา', amount: 380, monthKey: 'may', category: 'fixed' },
      { id: 'demo-4', date: '15/05/2567', note: 'ผ่อนบัตรเครดิต', amount: 2500, monthKey: 'may', category: 'debt' },
      { id: 'demo-5', date: '15/05/2567', note: 'กาแฟ', amount: 60, monthKey: 'may', category: 'food' },
    ],
    debtShopeePay: [{ monthKey: 'may', monthLabel: 'พฤษภาคม 2567', amount: 1200, updatedAt: '15/05/2567' }],
    debtShopeecrAsh: [{ monthKey: 'may', monthLabel: 'พฤษภาคม 2567', amount: 900, updatedAt: '15/05/2567' }],
    debtKasikorn: [{ monthKey: 'may', monthLabel: 'พฤษภาคม 2567', amount: 2500, updatedAt: '15/05/2567' }],
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
  };
}
