import { useEffect, useMemo, useState } from 'react';
import {
  Banknote,
  CalendarDays,
  ChevronDown,
  CircleEllipsis,
  CreditCard,
  Landmark,
  Plus,
  ReceiptText,
  Repeat,
  Save,
  Settings,
  Tag,
  Trash2,
  Wallet,
} from 'lucide-react';
import {
  CATEGORY_OPTIONS,
  DEBT_OPTIONS,
  activeFixedExpenses,
  buildMonthlyBreakdown,
  calculateMonthSummary,
  formatBaht,
  otherExpensesForMonth,
} from './lib/finance.js';

const CATEGORY_ICONS = {
  shopeePay: CreditCard,
  shopeeEasy: Wallet,
  other: CircleEllipsis,
};

export function DashboardView({
  dashboard,
  selectedMonth,
  selectedMonthLabel,
  currentSummary,
  loading,
  onSelectMonth,
}) {
  return (
    <div className="screen-stack dashboard-screen">
      <MonthSelector months={dashboard.months} value={selectedMonth} onChange={onSelectMonth} light />
      <SummaryGrid summary={currentSummary} loading={loading} light />
      <CategoryBreakdown
        dashboard={dashboard}
        monthKey={selectedMonth}
        monthLabel={selectedMonthLabel}
        interactive
        light
      />
    </div>
  );
}

export function AddExpenseView({
  dashboard,
  selectedMonth,
  selectedMonthLabel,
  saving,
  onSelectMonth,
  onAddExpense,
  onDeleteExpense,
  onSaveIncome,
  onClearIncome,
}) {
  return (
    <div className="screen-stack">
      <MonthSelector months={dashboard.months} value={selectedMonth} onChange={onSelectMonth} />
      <section className="panel">
        <div className="section-title">
          <Plus size={20} />
          <div>
            <h2>บันทึกรายจ่าย</h2>
            <p>กรอกครั้งเดียว เลือกเดือนและหมวดให้ครบ</p>
          </div>
        </div>
        <ExpenseForm
          months={dashboard.months}
          categories={dashboard.categories}
          defaultMonth={selectedMonth}
          saving={saving}
          onSubmit={onAddExpense}
        />
      </section>
      <IncomeEditor
        monthKey={selectedMonth}
        monthLabel={selectedMonthLabel}
        currentValue={dashboard.incomes[selectedMonth]}
        saving={saving}
        onSave={onSaveIncome}
        onClear={onClearIncome}
      />
      <RecentExpenses
        expenses={dashboard.recentExpenses}
        categories={dashboard.categories}
        onDelete={onDeleteExpense}
        saving={saving}
      />
    </div>
  );
}

export function MonthView({
  dashboard,
  selectedMonth,
  selectedMonthLabel,
  saving,
  onSelectMonth,
  onSaveDebt,
  onDeleteDebt,
  onSaveFixedExpense,
  onDeleteFixedExpense,
}) {
  const summary = selectedMonth ? calculateMonthSummary(dashboard, selectedMonth) : null;

  return (
    <div className="screen-stack">
      <MonthSelector months={dashboard.months} value={selectedMonth} onChange={onSelectMonth} />
      <SummaryGrid summary={summary} />
      <DebtEditor
        months={dashboard.months}
        defaultMonth={selectedMonth}
        debts={{
          shopeePay: dashboard.debtShopeePay,
          shopeeCrash: dashboard.debtShopeecrAsh,
          kasikorn: dashboard.debtKasikorn,
        }}
        saving={saving}
        onSave={onSaveDebt}
        onDelete={onDeleteDebt}
      />
      <FixedExpenseEditor
        items={dashboard.fixedExpenses}
        saving={saving}
        onSave={onSaveFixedExpense}
        onDelete={onDeleteFixedExpense}
      />
      <CategoryBreakdown
        dashboard={dashboard}
        monthKey={selectedMonth}
        monthLabel={selectedMonthLabel}
      />
    </div>
  );
}

export function SettingsView({ endpoint, onSaveEndpoint, onReload }) {
  const [draft, setDraft] = useState(endpoint);

  return (
    <div className="screen-stack">
      <section className="panel">
        <div className="section-title">
          <Settings size={20} />
          <div>
            <h2>ตั้งค่า</h2>
            <p>เชื่อม frontend นี้กับ GAS Web App ของพี่จอน</p>
          </div>
        </div>
        <label className="field">
          <span>GAS Web App URL</span>
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="https://script.google.com/macros/s/.../exec"
          />
        </label>
        <div className="settings-actions">
          <button className="primary-button" type="button" onClick={() => onSaveEndpoint(draft)}>
            <Save size={18} />
            บันทึก endpoint
          </button>
          <button className="ghost-button" type="button" onClick={onReload}>
            โหลดข้อมูลใหม่
          </button>
        </div>
        <p className="helper-text">
          URL นี้ไม่ใช่ secret แต่ถ้าเผยแพร่ GitHub Pages แบบ public คนที่เห็น URL อาจเรียก backend ได้
        </p>
      </section>
    </div>
  );
}

export function BottomNav({ items, active, onChange }) {
  return (
    <nav className="bottom-nav" aria-label="เมนูหลัก">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <button
            className={item.key === active ? 'nav-item active' : 'nav-item'}
            type="button"
            key={item.key}
            onClick={() => onChange(item.key)}
          >
            <Icon size={22} />
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

function MonthSelector({ months, value, onChange, light = false }) {
  return (
    <label className={light ? 'month-select light' : 'month-select'}>
      <CalendarDays size={20} />
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {months.map((month) => (
          <option key={month.key} value={month.key}>
            {month.label}
          </option>
        ))}
      </select>
      <ChevronDown size={18} />
    </label>
  );
}

function SummaryGrid({ summary, loading, light = false }) {
  const cards = [
    { label: 'รายรับ', value: summary?.income, tone: 'income', icon: Banknote, suffix: summary?.incomeConfirmed ? '' : '~' },
    { label: 'รายจ่ายรวม', value: summary?.totalExpenses, tone: 'expense', icon: ReceiptText },
    { label: 'คงเหลือ', value: summary?.remaining, tone: 'balance', icon: Wallet },
    { label: 'ใช้ได้/อาทิตย์', value: summary?.weeklyAllowance, tone: 'week', icon: CalendarDays },
  ];

  return (
    <section className={light ? 'summary-grid light' : 'summary-grid'} aria-label="สรุปเดือน">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <article className={`summary-card ${card.tone}`} key={card.label}>
            <div className="summary-label">
              <Icon size={20} />
              <span>{card.label}</span>
            </div>
            <strong>{loading ? '...' : `${card.suffix || ''}${formatBaht(card.value)} `}</strong>
            <small>บาท</small>
          </article>
        );
      })}
    </section>
  );
}

function ExpenseForm({ months, categories = CATEGORY_OPTIONS, defaultMonth, compact = false, saving, onSubmit }) {
  const [amount, setAmount] = useState('');
  const [monthKey, setMonthKey] = useState(defaultMonth);
  const [category, setCategory] = useState(categories.find((item) => item.key === 'shopeePay')?.key || categories[0]?.key || 'other');
  const [note, setNote] = useState('');
  const selectedCategory = categories.find((item) => item.key === category) || categories[0] || CATEGORY_OPTIONS[0];

  useEffect(() => {
    if (!monthKey && defaultMonth) setMonthKey(defaultMonth);
  }, [defaultMonth, monthKey]);

  useEffect(() => {
    if (!categories.some((item) => item.key === category)) {
      setCategory(categories.find((item) => item.key === 'shopeePay')?.key || categories[0]?.key || 'other');
    }
  }, [categories, category]);

  function submit(event) {
    event.preventDefault();
    const parsedAmount = Number(amount);
    if (!parsedAmount || parsedAmount <= 0 || !monthKey) return;
    onSubmit({ amount: parsedAmount, monthKey, category, note: note.trim() || selectedCategory.label });
    setAmount('');
    setNote('');
  }

  return (
    <form className={compact ? 'expense-form panel' : 'expense-form'} onSubmit={submit}>
      {compact && (
        <div className="section-title">
          <ReceiptText size={20} />
          <div>
            <h2>บันทึกรายจ่าย</h2>
            <p>จำนวนเงิน เดือน หมวดหมู่ ในช่องเดียว</p>
          </div>
        </div>
      )}

      <div className="form-grid">
        <label className="field amount-field">
          <span>จำนวนเงิน</span>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="0.00"
          />
        </label>
        <label className="field">
          <span>เลือกเดือน</span>
          <select value={monthKey} onChange={(event) => setMonthKey(event.target.value)}>
            {months.map((month) => (
              <option key={month.key} value={month.key}>
                {month.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="field">
        <span>หมวดหมู่</span>
        <select value={category} onChange={(event) => setCategory(event.target.value)}>
          {categories.map((item) => (
            <option key={item.key} value={item.key}>
              {item.label}
            </option>
          ))}
        </select>
      </label>

      {!compact && (
        <label className="field">
          <span>หมายเหตุ ไม่บังคับ</span>
          <input value={note} onChange={(event) => setNote(event.target.value)} placeholder="เช่น ซื้อข้าวกลางวัน" maxLength={80} />
        </label>
      )}

      <div className="category-chips" aria-label="เลือกหมวดเร็ว">
        {categories.map((item) => {
          const Icon = CATEGORY_ICONS[item.key] || Tag;
          return (
            <button
              className={item.key === category ? 'category-chip active' : 'category-chip'}
              style={{ '--chip-color': item.color }}
              type="button"
              key={item.key}
              onClick={() => setCategory(item.key)}
            >
              <Icon size={18} />
              {item.label}
            </button>
          );
        })}
      </div>

      <button className="primary-button" type="submit" disabled={saving || !amount || !monthKey}>
        <Save size={19} />
        {saving ? 'กำลังบันทึก' : 'บันทึกรายจ่าย'}
      </button>
    </form>
  );
}

function RecentExpenses({ expenses, categories = CATEGORY_OPTIONS, onDelete, onGoAdd, saving = false }) {
  return (
    <section className="panel">
      <div className="list-heading">
        <div>
          <h2>รายการล่าสุด</h2>
          <p>รายการที่บันทึกล่าสุดจากทุกเดือน</p>
        </div>
        {onGoAdd ? (
          <button className="link-button" type="button" onClick={onGoAdd}>
            เพิ่ม
          </button>
        ) : null}
      </div>
      <div className="expense-list">
        {expenses.length === 0 ? (
          <div className="empty-state">ยังไม่มีรายจ่าย</div>
        ) : (
          expenses.map((item) => (
            <ExpenseRow key={item.id} item={item} categories={categories} onDelete={onDelete} saving={saving} />
          ))
        )}
      </div>
    </section>
  );
}

function ExpenseRow({ item, categories = CATEGORY_OPTIONS, onDelete, saving = false }) {
  const category = categories.find((option) => option.key === item.category) || categories.at(-1) || CATEGORY_OPTIONS.at(-1);
  const Icon = CATEGORY_ICONS[category.key] || Tag;

  return (
    <article className="expense-row">
      <div className="category-dot" style={{ '--dot-color': category.color }}>
        <Icon size={18} />
      </div>
      <div className="expense-main">
        <strong>{item.note}</strong>
        <span>{category.label}{item.monthLabel ? ` · ${item.monthLabel}` : ''}</span>
      </div>
      <div className="expense-side">
        <strong>{formatBaht(item.amount)} บาท</strong>
        <span>{item.date}</span>
      </div>
      <button className="trash-button" type="button" disabled={saving} onClick={() => onDelete(item.id)} aria-label="ลบรายการ">
        <Trash2 size={16} />
      </button>
    </article>
  );
}

function CategoryBreakdown({ dashboard, monthKey, monthLabel, interactive = false, light = false }) {
  const [expandedKey, setExpandedKey] = useState('');
  const breakdown = buildMonthlyBreakdown(dashboard, monthKey);
  const total = breakdown.reduce((sum, item) => sum + item.amount, 0);
  const donut = useMemo(() => buildDonutGradient(breakdown, total), [breakdown, total]);
  const otherExpenses = otherExpensesForMonth(dashboard, monthKey);
  const fixedExpenses = activeFixedExpenses(dashboard);

  useEffect(() => {
    setExpandedKey('');
  }, [monthKey]);

  return (
    <section className={light ? 'panel dashboard-panel' : 'panel'}>
      <div className="list-heading">
        <div>
          <h2>สรุปภาพรวมรายเดือน</h2>
          <p>{monthLabel}</p>
        </div>
      </div>
      <div className="breakdown-layout">
        <div className="donut" style={{ background: donut }}>
          <span>{formatBaht(total)}</span>
          <small>บาท</small>
        </div>
        <div className="breakdown-list">
          {breakdown.length === 0 ? (
            <div className="empty-state compact">ยังไม่มีรายจ่ายในเดือนนี้</div>
          ) : (
            breakdown.map((item) => {
              const expandable = interactive && (item.key === 'other' || item.key === 'fixed');
              const rowContent = (
                <>
                  <span className="legend" style={{ background: item.color }} />
                  <span>{item.label}</span>
                  <strong>{formatBaht(item.amount)}</strong>
                  {expandable ? (
                    <ChevronDown className={expandedKey === item.key ? 'detail-chevron open' : 'detail-chevron'} size={17} />
                  ) : null}
                </>
              );

              return expandable ? (
                <button
                  className="breakdown-row breakdown-trigger"
                  style={{ '--row-color': item.color }}
                  type="button"
                  key={item.key}
                  aria-expanded={expandedKey === item.key}
                  aria-controls="dashboard-category-detail"
                  onClick={() => setExpandedKey((current) => (current === item.key ? '' : item.key))}
                >
                  {rowContent}
                </button>
              ) : (
                <div className="breakdown-row" key={item.key}>
                  {rowContent}
                </div>
              );
            })
          )}
          <div className="breakdown-total-row">
            <span>ยอดรวมรายจ่าย</span>
            <strong>{formatBaht(total)} บาท</strong>
          </div>
        </div>
      </div>
      {interactive && expandedKey ? (
        <div className="breakdown-detail" id="dashboard-category-detail">
          <div className="detail-heading">
            <strong>{expandedKey === 'fixed' ? 'รายการรายจ่ายคงที่' : 'รายการรายจ่ายอื่นๆ'}</strong>
            <span>{monthLabel}</span>
          </div>
          <div className="detail-list">
            {expandedKey === 'fixed' ? (
              fixedExpenses.length ? (
                fixedExpenses.map((item) => (
                  <div className="detail-row" key={item.fixedKey}>
                    <span>
                      <strong>{item.label}</strong>
                      {item.notes ? <small>{item.notes}</small> : null}
                    </span>
                    <b>{formatBaht(item.amount)} บาท</b>
                  </div>
                ))
              ) : (
                <div className="empty-state compact">ยังไม่มีรายจ่ายคงที่</div>
              )
            ) : otherExpenses.length ? (
              otherExpenses.map((item) => (
                <div className="detail-row" key={item.id}>
                  <span>
                    <strong>{item.note}</strong>
                    {item.date ? <small>{item.date}</small> : null}
                  </span>
                  <b>{formatBaht(item.amount)} บาท</b>
                </div>
              ))
            ) : (
              <div className="empty-state compact">ยังไม่มีรายจ่ายอื่นๆ ในเดือนนี้</div>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function IncomeEditor({ monthKey, monthLabel, currentValue, saving, onSave, onClear }) {
  const [amount, setAmount] = useState(currentValue || '');

  useEffect(() => {
    setAmount(currentValue || '');
  }, [currentValue, monthKey]);

  return (
    <section className="panel">
      <div className="section-title">
        <Banknote size={20} />
        <div>
          <h2>รายรับจริง</h2>
          <p>{monthLabel}</p>
        </div>
      </div>
      <label className="field">
        <span>รายรับเดือนนี้</span>
        <input type="number" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="16275" />
      </label>
      <div className="settings-actions">
        <button className="primary-button" type="button" disabled={saving || !amount} onClick={() => onSave(monthKey, Number(amount))}>
          บันทึกรายรับ
        </button>
        <button className="ghost-button" type="button" disabled={saving} onClick={() => onClear(monthKey)}>
          รีเซ็ต
        </button>
      </div>
    </section>
  );
}

function DebtEditor({ months, defaultMonth, debts, saving, onSave, onDelete }) {
  const [kind, setKind] = useState('kasikorn');
  const [monthKey, setMonthKey] = useState(defaultMonth);
  const [amount, setAmount] = useState('');
  const monthLabel = months.find((month) => month.key === monthKey)?.label || monthKey;
  const activeOption = DEBT_OPTIONS.find((option) => option.key === kind) || DEBT_OPTIONS[0];

  useEffect(() => {
    if (!monthKey && defaultMonth) setMonthKey(defaultMonth);
  }, [defaultMonth, monthKey]);

  function submit(event) {
    event.preventDefault();
    const parsedAmount = Number(amount);
    if (!parsedAmount || !monthKey) return;
    onSave({ kind, monthKey, monthLabel, amount: parsedAmount });
    setAmount('');
  }

  return (
    <section className="panel">
      <div className="section-title">
        <Landmark size={20} />
        <div>
          <h2>ยอดหนี้รายเดือน</h2>
          <p>ShopeePay, ShopeeEasy และกสิกร</p>
        </div>
      </div>

      <div className="debt-tabs" role="tablist" aria-label="เลือกประเภทหนี้">
        {DEBT_OPTIONS.map((option) => (
          <button
            className={option.key === kind ? 'debt-tab active' : 'debt-tab'}
            style={{ '--debt-color': option.color }}
            type="button"
            role="tab"
            aria-selected={option.key === kind}
            key={option.key}
            onClick={() => setKind(option.key)}
          >
            {option.label}
          </button>
        ))}
      </div>

      <form className="debt-form" onSubmit={submit}>
        <label className="field">
          <span>เดือน</span>
          <select value={monthKey} onChange={(event) => setMonthKey(event.target.value)}>
            {months.map((month) => (
              <option key={month.key} value={month.key}>
                {month.label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>ยอดชำระ</span>
          <input type="number" inputMode="decimal" min="0" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0" />
        </label>
        <button className="primary-button" type="submit" disabled={saving || !amount}>
          บันทึกยอดหนี้
        </button>
      </form>

      <div className="debt-list">
        <DebtGroup
          option={activeOption}
          items={debts[activeOption.key] || []}
          onDelete={onDelete}
          saving={saving}
        />
      </div>
    </section>
  );
}

function FixedExpenseEditor({ items = [], saving, onSave, onDelete }) {
  const [selectedKey, setSelectedKey] = useState(items[0]?.fixedKey || '__new');
  const selected = items.find((item) => item.fixedKey === selectedKey);
  const isNew = selectedKey === '__new';
  const [label, setLabel] = useState(selected?.label || '');
  const [amount, setAmount] = useState(selected?.amount || '');
  const [notes, setNotes] = useState(selected?.notes || '');

  useEffect(() => {
    if (!items.length) {
      setSelectedKey('__new');
      return;
    }
    if (selectedKey !== '__new' && !items.some((item) => item.fixedKey === selectedKey)) {
      setSelectedKey(items[0].fixedKey);
    }
  }, [items, selectedKey]);

  useEffect(() => {
    if (isNew) {
      setLabel('');
      setAmount('');
      setNotes('');
      return;
    }
    setLabel(selected?.label || '');
    setAmount(selected?.amount || '');
    setNotes(selected?.notes || '');
  }, [isNew, selected]);

  function submit(event) {
    event.preventDefault();
    const parsedAmount = Number(amount);
    if (!label.trim() || parsedAmount < 0 || Number.isNaN(parsedAmount)) return;
    onSave({
      fixedKey: isNew ? '' : selectedKey,
      label: label.trim(),
      amount: parsedAmount,
      active: true,
      notes: notes.trim(),
    });
  }

  const activeItems = items.filter((item) => item.active !== false);
  const total = activeItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

  return (
    <section className="panel">
      <div className="section-title">
        <Repeat size={20} />
        <div>
          <h2>รายจ่ายคงที่</h2>
          <p>เลือกหัวข้อเดิมเพื่ออัปเดตยอด หรือเพิ่มหัวข้อใหม่</p>
        </div>
      </div>

      <form className="expense-form" onSubmit={submit}>
        <label className="field">
          <span>หัวข้อรายจ่าย</span>
          <select value={selectedKey} onChange={(event) => setSelectedKey(event.target.value)}>
            {items.map((item) => (
              <option key={item.fixedKey} value={item.fixedKey}>
                {item.label}
              </option>
            ))}
            <option value="__new">เพิ่มหัวข้อใหม่</option>
          </select>
        </label>
        <div className="form-grid">
          <label className="field">
            <span>ชื่อหัวข้อ</span>
            <input value={label} onChange={(event) => setLabel(event.target.value)} placeholder="เช่น ค่าห้อง/น้ำ/ไฟ" maxLength={60} />
          </label>
          <label className="field amount-field">
            <span>ยอดต่อเดือน</span>
            <input type="number" inputMode="decimal" min="0" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0" />
          </label>
        </div>
        <label className="field">
          <span>หมายเหตุ</span>
          <input value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="เช่น ประมาณการ / คงที่" maxLength={80} />
        </label>
        <div className="settings-actions">
          <button className="primary-button" type="submit" disabled={saving || !label.trim()}>
            บันทึกรายจ่ายคงที่
          </button>
          <button className="ghost-button" type="button" disabled={saving || isNew} onClick={() => onDelete(selectedKey)}>
            ลบ
          </button>
        </div>
      </form>

      <div className="fixed-list">
        <div className="fixed-total">
          <span>รวมรายจ่ายคงที่</span>
          <strong>{formatBaht(total)} บาท</strong>
        </div>
        {items.map((item) => (
          <button className="fixed-row" type="button" key={item.fixedKey} onClick={() => setSelectedKey(item.fixedKey)}>
            <span>
              <strong>{item.label}</strong>
              {item.notes ? <small>{item.notes}</small> : null}
            </span>
            <b>{formatBaht(item.amount)} บาท</b>
          </button>
        ))}
      </div>
    </section>
  );
}

function DebtGroup({ option, items, onDelete, saving }) {
  return (
    <div className="debt-group" style={{ '--debt-color': option.color }}>
      <div className="debt-group-heading">
        <h3>{option.label}</h3>
        <span>{items.length} เดือน</span>
      </div>
      {items.length === 0 ? (
        <p>ยังไม่มีข้อมูล</p>
      ) : (
        items.map((item) => (
          <div className="debt-row" key={`${option.key}-${item.monthKey}`}>
            <span>{item.monthLabel}</span>
            <strong>{formatBaht(item.amount)} บาท</strong>
            <button
              type="button"
              disabled={saving}
              aria-label={`ลบยอด ${option.label} เดือน ${item.monthLabel}`}
              onClick={() => onDelete(option.key, item.monthKey)}
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))
      )}
    </div>
  );
}

function buildDonutGradient(items, total) {
  if (!total) return 'conic-gradient(#2d3948 0deg 360deg)';
  let cursor = 0;
  const stops = items.map((item) => {
    const start = cursor;
    const end = cursor + (item.amount / total) * 360;
    cursor = end;
    return `${item.color} ${start}deg ${end}deg`;
  });
  return `conic-gradient(${stops.join(', ')})`;
}
