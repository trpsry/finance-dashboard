import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Bell,
  CalendarDays,
  Home,
  Menu,
  Plus,
  RefreshCw,
  Settings,
} from 'lucide-react';
import { createApiClient } from './lib/api.js';
import { calculateMonthSummary, chooseActiveMonth, normalizeDashboard } from './lib/finance.js';
import {
  AddExpenseView,
  BottomNav,
  DashboardView,
  MonthView,
  SettingsView,
} from './components.jsx';

const STORAGE_KEY = 'financeDashboard.gasEndpoint';
const FALLBACK_GAS_ENDPOINT =
  'https://script.google.com/macros/s/AKfycbypMCHcAcLM7vU_kr6t9fF5EQFHUcFT6sW-IpPm9K010epaw67t5OndoNPAOpcnFKUH/exec';
const DEFAULT_ENDPOINT = import.meta.env.VITE_GAS_ENDPOINT || FALLBACK_GAS_ENDPOINT;
const STALE_GAS_ENDPOINTS = new Set([
  'https://script.google.com/macros/s/AKfycbxrmUfdb-eYY-m6vHJqvgKPGKETbhEPnntrzOXbAlWpIpJ_3LQhrbxEfBdOQAWYyLsM/exec',
  'https://script.google.com/macros/s/AKfycbwpRBYTptn3K8Yle7ayVlmhBfsiiaeMiuNEKB5Xxc8DoqOYZh5-ypgrZsFy1GxNKB0c/exec',
  'https://script.google.com/macros/s/AKfycbyj-npPe8PsmTXJfi-8dnZhW7I4aE0nKtLhHnAJ8t8D3in9-4Ec-DYZNNvKV39vpPXy/exec',
]);

const NAV_ITEMS = [
  { key: 'dashboard', label: 'แดชบอร์ด', icon: Home },
  { key: 'add', label: 'บันทึก', icon: Plus },
  { key: 'months', label: 'เดือนต่างๆ', icon: CalendarDays },
  { key: 'settings', label: 'ตั้งค่า', icon: Settings },
];

export default function App() {
  const [view, setView] = useState('dashboard');
  const [rawData, setRawData] = useState(null);
  const [activeMonth, setActiveMonth] = useState('');
  const [endpoint, setEndpoint] = useState(() => {
    const storedEndpoint = localStorage.getItem(STORAGE_KEY);
    return !storedEndpoint || STALE_GAS_ENDPOINTS.has(storedEndpoint) ? DEFAULT_ENDPOINT : storedEndpoint;
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const client = useMemo(() => createApiClient({ endpoint }), [endpoint]);
  const dashboard = useMemo(() => normalizeDashboard(rawData || {}), [rawData]);
  const months = dashboard.months;
  const selectedMonth = chooseActiveMonth(activeMonth, months);
  const selectedMonthLabel = dashboard.monthLookup[selectedMonth] || 'กำลังโหลด';
  const currentSummary = selectedMonth ? calculateMonthSummary(dashboard, selectedMonth) : null;

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await client.loadAll();
      setRawData(data);
      setActiveMonth((current) => chooseActiveMonth(current, data.next5Months || []));
    } catch (err) {
      setError(err.message || 'โหลดข้อมูลไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  }, [client]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    if (endpoint) localStorage.setItem(STORAGE_KEY, endpoint);
    else localStorage.removeItem(STORAGE_KEY);
  }, [endpoint]);

  async function withSave(action, successMessage) {
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await action();
      setNotice(successMessage);
    } catch (err) {
      setError(err.message || 'บันทึกไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  }

  function patchRawData(patch) {
    setRawData((current) => ({ ...(current || {}), ...patch }));
  }

  async function addExpense(payload) {
    await withSave(async () => {
      const extras = await client.addExpense(payload);
      patchRawData({ extras });
      setView('dashboard');
    }, 'บันทึกรายจ่ายแล้ว');
  }

  async function deleteExpense(id) {
    if (!window.confirm('ลบรายการนี้?')) return;
    await withSave(async () => {
      const extras = await client.deleteExpense({ id });
      patchRawData({ extras });
    }, 'ลบรายการแล้ว');
  }

  async function saveIncome(monthKey, amount) {
    await withSave(async () => {
      const incomes = await client.saveIncome({ monthKey, amount });
      patchRawData({ incomes });
    }, 'บันทึกรายรับแล้ว');
  }

  async function clearIncome(monthKey) {
    if (!window.confirm('รีเซ็ตรายรับเดือนนี้?')) return;
    await withSave(async () => {
      const incomes = await client.clearIncome({ monthKey });
      patchRawData({ incomes });
    }, 'รีเซ็ตรายรับแล้ว');
  }

  async function saveDebt(payload) {
    await withSave(async () => {
      const result = await client.saveDebt(payload);
      patchDebt(payload.kind, result);
    }, 'บันทึกยอดหนี้แล้ว');
  }

  async function deleteDebt(kind, monthKey) {
    if (!window.confirm('ลบยอดหนี้เดือนนี้?')) return;
    await withSave(async () => {
      const result = await client.deleteDebt({ kind, monthKey });
      patchDebt(kind, result);
    }, 'ลบยอดหนี้แล้ว');
  }

  function patchDebt(kind, value) {
    const map = {
      shopeePay: 'debtShopeePay',
      shopeeCrash: 'debtShopeecrAsh',
      kasikorn: 'debtKasikorn',
    };
    patchRawData({ [map[kind]]: value });
  }

  async function saveFixedExpense(payload) {
    await withSave(async () => {
      const fixedExpenses = await client.saveFixedExpense(payload);
      patchRawData({ fixedExpenses });
    }, 'บันทึกรายจ่ายคงที่แล้ว');
  }

  async function deleteFixedExpense(fixedKey) {
    if (!window.confirm('ลบรายจ่ายคงที่นี้?')) return;
    await withSave(async () => {
      const fixedExpenses = await client.deleteFixedExpense({ fixedKey });
      patchRawData({ fixedExpenses });
    }, 'ลบรายจ่ายคงที่แล้ว');
  }

  function saveEndpoint(nextEndpoint) {
    setEndpoint(nextEndpoint.trim());
    setNotice('บันทึก GAS endpoint แล้ว');
  }

  const commonProps = {
    dashboard,
    selectedMonth,
    selectedMonthLabel,
    currentSummary,
    loading,
    saving,
    onSelectMonth: setActiveMonth,
    onAddExpense: addExpense,
    onDeleteExpense: deleteExpense,
    onSaveIncome: saveIncome,
    onClearIncome: clearIncome,
    onSaveDebt: saveDebt,
    onDeleteDebt: deleteDebt,
    onSaveFixedExpense: saveFixedExpense,
    onDeleteFixedExpense: deleteFixedExpense,
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <button className="icon-button" type="button" aria-label="เมนู">
          <Menu size={24} />
        </button>
        <div>
          <h1>Dashboard</h1>
          <p>{selectedMonthLabel}</p>
        </div>
        <button className="status-button" type="button" onClick={loadDashboard} aria-label="รีเฟรชข้อมูล">
          {loading ? <RefreshCw size={20} className="spin" /> : <Bell size={20} />}
        </button>
      </header>

      {error && <div className="notice notice-error">{error}</div>}
      {notice && <div className="notice notice-success">{notice}</div>}
      {!endpoint && <div className="notice notice-muted">โหมดตัวอย่าง</div>}

      <main>
        {view === 'dashboard' && <DashboardView {...commonProps} onGoAdd={() => setView('add')} />}
        {view === 'add' && <AddExpenseView {...commonProps} />}
        {view === 'months' && <MonthView {...commonProps} />}
        {view === 'settings' && (
          <SettingsView
            endpoint={endpoint}
            saving={saving}
            onSaveEndpoint={saveEndpoint}
            onReload={loadDashboard}
          />
        )}
      </main>

      <BottomNav items={NAV_ITEMS} active={view} onChange={setView} />
    </div>
  );
}
