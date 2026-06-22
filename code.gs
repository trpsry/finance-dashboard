// Code.gs - FinanceDashboard backend API
// Database: https://docs.google.com/spreadsheets/d/1UJCOHcxXriobWl-IvbdruR0sbd9SszNohaCddxbLM7c/edit

const SPREADSHEET_ID = '1UJCOHcxXriobWl-IvbdruR0sbd9SszNohaCddxbLM7c';

const SHEET_TRANSACTIONS   = 'Transactions';
const SHEET_MONTHLY_INCOME = 'MonthlyIncome';
const SHEET_DEBT_SCHEDULE  = 'DebtSchedule';
const SHEET_CATEGORIES     = 'Categories';
const SHEET_FIXED_EXPENSES = 'FixedExpenses';
const SHEET_SETTINGS       = 'Settings';

// Legacy names kept so the old GAS index.html and older tests still describe the same data.
const SHEET_EXTRAS      = SHEET_TRANSACTIONS;
const SHEET_INCOME      = SHEET_MONTHLY_INCOME;
const SHEET_SHOPEEPAY   = 'shopeePay';
const SHEET_SHOPEECRASH = 'shopeeCrash';
const SHEET_KASIKORN    = 'kasikorn';

const TRANSACTION_HEADERS = ['id','date','monthKey','monthLabel','category','note','amount','createdAt','updatedAt','source'];
const INCOME_HEADERS      = ['monthKey','monthLabel','amount','updatedAt','source'];
const DEBT_HEADERS        = ['id','kind','label','monthKey','monthLabel','amount','updatedAt','source'];
const CATEGORY_HEADERS    = ['categoryKey','label','type','color','active','sortOrder'];
const FIXED_HEADERS       = ['fixedKey','label','amount','active','sortOrder','notes'];
const SETTINGS_HEADERS    = ['key','value','note'];

const DEFAULT_CATEGORIES = [
  ['debt','หนี้สิน','expense','#ff595e',true,10],
  ['fixed','รายจ่ายคงที่','expense','#ff9f1c',true,20],
  ['food','อาหาร','expense','#6bc45f',true,30],
  ['transport','เดินทาง','expense','#4d96ff',true,40],
  ['other','อื่นๆ','expense','#aeb7c8',true,50]
];

const DEFAULT_FIXED_EXPENSES = [
  ['room','ค่าห้อง/น้ำ/ไฟ',1600,true,10,'ประมาณการ'],
  ['net','เน็ต',250,true,20,''],
  ['cig','บุหรี่',320,true,30,''],
  ['oil','น้ำมัน',1000,true,40,'']
];

const DEFAULT_SETTINGS = [
  ['estimatedIncome',16275,'รายรับประมาณการ ใช้เมื่อยังไม่กรอกรายรับจริง'],
  ['timezone','Asia/Bangkok','ใช้สำหรับ timestamp'],
  ['payday',28,'วันที่เงินเดือน/รอบจ่าย']
];

const MONTH_ORDER = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
const MONTH_LABEL_TH = {
  jan:'ม.ค.', feb:'ก.พ.', mar:'มี.ค.', apr:'เม.ย.',
  may:'พ.ค.', jun:'มิ.ย.', jul:'ก.ค.', aug:'ส.ค.',
  sep:'ก.ย.', oct:'ต.ค.', nov:'พ.ย.', dec:'ธ.ค.'
};

function getDb() {
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

function testSetup() {
  setupDatabase();
  Logger.log('FinanceDashboard DB ready: ' + getDb().getName());
}

function setupDatabase() {
  const tx = getSheet(SHEET_TRANSACTIONS, TRANSACTION_HEADERS);
  const income = getSheet(SHEET_MONTHLY_INCOME, INCOME_HEADERS);
  const debt = getSheet(SHEET_DEBT_SCHEDULE, DEBT_HEADERS);
  const categories = getSheet(SHEET_CATEGORIES, CATEGORY_HEADERS);
  const fixed = getSheet(SHEET_FIXED_EXPENSES, FIXED_HEADERS);
  const settings = getSheet(SHEET_SETTINGS, SETTINGS_HEADERS);

  seedRowsIfEmpty(categories, DEFAULT_CATEGORIES);
  seedRowsIfEmpty(fixed, DEFAULT_FIXED_EXPENSES);
  seedRowsIfEmpty(settings, DEFAULT_SETTINGS);

  [tx, income, debt, categories, fixed, settings].forEach(sheet => {
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, sheet.getLastColumn())
      .setFontWeight('bold')
      .setBackground('#eeeeee');
  });
}

function doGet(e) {
  if (e && e.parameter && e.parameter.action) {
    return handleApiAction(e.parameter.action, {});
  }
  return HtmlService
    .createHtmlOutputFromFile('index')
    .setTitle('แดชบอร์ดการเงิน')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
}

function doPost(e) {
  try {
    const body = parsePostBody(e);
    return handleApiAction(body.action, body.payload || {});
  } catch (err) {
    return apiResponse(false, err.message || String(err));
  }
}

function parsePostBody(e) {
  if (!e || !e.postData || !e.postData.contents) return {};
  try {
    return JSON.parse(e.postData.contents);
  } catch (err) {
    throw new Error('Invalid JSON payload');
  }
}

function handleApiAction(action, payload) {
  try {
    let data;
    switch (String(action || '')) {
      case 'loadAll':
        data = loadAll();
        break;
      case 'setupDatabase':
        setupDatabase();
        data = loadAll();
        break;
      case 'addExpense':
        data = addExpense(payload.note, payload.amount, payload.monthKey, payload.category);
        break;
      case 'deleteExpense':
        data = deleteExpense(payload.id);
        break;
      case 'saveIncome':
        data = saveIncome(payload.monthKey || payload.month, payload.amount);
        break;
      case 'clearIncome':
        data = clearIncome(payload.monthKey || payload.month);
        break;
      case 'saveDebt':
        data = saveDebtByKind(payload.kind, payload.monthKey, payload.monthLabel, payload.amount);
        break;
      case 'deleteDebt':
        data = deleteDebtByKind(payload.kind, payload.monthKey);
        break;
      default:
        throw new Error('Unknown action: ' + action);
    }
    return apiResponse(true, data);
  } catch (err) {
    return apiResponse(false, err.message || String(err));
  }
}

function apiResponse(ok, value) {
  const payload = ok ? { ok:true, data:value } : { ok:false, error:value };
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function getSheet(name, headers) {
  const ss = getDb();
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
  }
  ensureHeaders(sheet, headers);
  return sheet;
}

function ensureHeaders(sheet, headers) {
  const currentWidth = Math.max(sheet.getLastColumn(), headers.length);
  const existing = sheet.getRange(1, 1, 1, currentWidth).getValues()[0].map(String);
  headers.forEach((header, index) => {
    if (existing[index] !== header) {
      sheet.getRange(1, index + 1).setValue(header);
    }
  });
}

function seedRowsIfEmpty(sheet, rows) {
  if (sheet.getLastRow() > 1) return;
  sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
}

function formatRow(sheet, row, numCols) {
  sheet.getRange(row, 1, 1, numCols)
    .setFontSize(13)
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle');
}

function getNext5Months() {
  const now = new Date();
  const curIdx = now.getMonth();
  const shortYear = (now.getFullYear() + 543) % 100;
  const result = [];
  for (let i = 0; i < 5; i++) {
    const idx = (curIdx + i) % 12;
    const yearOffset = Math.floor((curIdx + i) / 12);
    const yr = shortYear + yearOffset;
    const key = MONTH_ORDER[idx];
    result.push({ key, label: MONTH_LABEL_TH[key] + ' ' + yr });
  }
  return result;
}

function loadAll() {
  setupDatabase();
  return {
    extras: getExtras(),
    incomes: getIncomes(),
    debtShopeePay: getDebtDataByKind(SHEET_SHOPEEPAY),
    debtShopeecrAsh: getDebtDataByKind(SHEET_SHOPEECRASH),
    debtKasikorn: getDebtDataByKind(SHEET_KASIKORN),
    next5Months: getNext5Months(),
    categories: getCategories(),
    fixedExpenses: getFixedExpenses(),
    settings: getSettings()
  };
}

function getExtras() {
  const sheet = getSheet(SHEET_TRANSACTIONS, TRANSACTION_HEADERS);
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  return data.slice(1)
    .filter(r => String(r[0] || '').trim() !== '')
    .map(r => ({
      id: String(r[0]),
      date: String(r[1]),
      monthKey: String(r[2] || ''),
      monthLabel: String(r[3] || ''),
      category: normalizeCategory(r[4]),
      note: String(r[5] || ''),
      amount: parseFloat(r[6]) || 0,
      createdAt: String(r[7] || ''),
      updatedAt: String(r[8] || ''),
      source: String(r[9] || '')
    }));
}

function addExtra(note, amount, monthKey) {
  return addExpense(note, amount, monthKey, 'other');
}

function addExpense(note, amount, monthKey, category) {
  const sheet = getSheet(SHEET_TRANSACTIONS, TRANSACTION_HEADERS);
  const now = new Date();
  const id = 'tx_' + now.getTime();
  const date = Utilities.formatDate(now, getTimezone(), 'dd/MM/yyyy');
  const stamp = Utilities.formatDate(now, getTimezone(), 'yyyy-MM-dd HH:mm:ss');
  const label = getMonthLabel(monthKey);
  sheet.appendRow([
    id,
    date,
    monthKey || getMonthKeyFromDate(now),
    label,
    normalizeCategory(category),
    String(note || '').trim(),
    parseFloat(amount) || 0,
    stamp,
    stamp,
    'web'
  ]);
  formatRow(sheet, sheet.getLastRow(), TRANSACTION_HEADERS.length);
  return getExtras();
}

function deleteExtra(id) {
  return deleteExpense(id);
}

function deleteExpense(id) {
  const sheet = getSheet(SHEET_TRANSACTIONS, TRANSACTION_HEADERS);
  const data = sheet.getDataRange().getValues();
  for (let i = data.length - 1; i >= 1; i--) {
    if (String(data[i][0]) === String(id)) {
      sheet.deleteRow(i + 1);
      break;
    }
  }
  return getExtras();
}

function getIncomes() {
  const sheet = getSheet(SHEET_MONTHLY_INCOME, INCOME_HEADERS);
  const data = sheet.getDataRange().getValues();
  const result = {};
  MONTH_ORDER.forEach(k => result[k] = null);
  if (data.length <= 1) return result;
  data.slice(1).forEach(r => {
    const key = String(r[0] || '').toLowerCase().trim();
    if (result.hasOwnProperty(key)) {
      const value = parseFloat(r[2]);
      result[key] = isNaN(value) ? null : value;
    }
  });
  return result;
}

function saveIncome(month, amount) {
  const sheet = getSheet(SHEET_MONTHLY_INCOME, INCOME_HEADERS);
  const key = String(month || '').toLowerCase().trim();
  const data = sheet.getDataRange().getValues();
  const stamp = nowStamp();
  let found = false;
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).toLowerCase().trim() === key) {
      sheet.getRange(i + 1, 2).setValue(getMonthLabel(key));
      sheet.getRange(i + 1, 3).setValue(parseFloat(amount) || 0);
      sheet.getRange(i + 1, 4).setValue(stamp);
      sheet.getRange(i + 1, 5).setValue('web');
      found = true;
      break;
    }
  }
  if (!found) {
    sheet.appendRow([key, getMonthLabel(key), parseFloat(amount) || 0, stamp, 'web']);
    formatRow(sheet, sheet.getLastRow(), INCOME_HEADERS.length);
  }
  return getIncomes();
}

function clearIncome(month) {
  const sheet = getSheet(SHEET_MONTHLY_INCOME, INCOME_HEADERS);
  const key = String(month || '').toLowerCase().trim();
  const data = sheet.getDataRange().getValues();
  for (let i = data.length - 1; i >= 1; i--) {
    if (String(data[i][0]).toLowerCase().trim() === key) {
      sheet.deleteRow(i + 1);
      break;
    }
  }
  return getIncomes();
}

function getDebtDataByKind(kind) {
  const sheet = getSheet(SHEET_DEBT_SCHEDULE, DEBT_HEADERS);
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  return data.slice(1)
    .filter(r => String(r[1]) === String(kind))
    .map(r => ({
      id: String(r[0]),
      kind: String(r[1]),
      label: String(r[2]),
      monthKey: String(r[3]),
      monthLabel: String(r[4]),
      amount: parseFloat(r[5]) || 0,
      updatedAt: String(r[6]),
      source: String(r[7] || '')
    }));
}

function saveDebtByKind(kind, monthKey, monthLabel, amount) {
  const normalizedKind = normalizeDebtKind(kind);
  const sheet = getSheet(SHEET_DEBT_SCHEDULE, DEBT_HEADERS);
  const data = sheet.getDataRange().getValues();
  const stamp = nowStamp();
  const label = getDebtLabel(normalizedKind);
  let found = false;
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][1]) === normalizedKind && String(data[i][3]) === String(monthKey)) {
      sheet.getRange(i + 1, 3).setValue(label);
      sheet.getRange(i + 1, 5).setValue(monthLabel || getMonthLabel(monthKey));
      sheet.getRange(i + 1, 6).setValue(parseFloat(amount) || 0);
      sheet.getRange(i + 1, 7).setValue(stamp);
      sheet.getRange(i + 1, 8).setValue('web');
      found = true;
      break;
    }
  }
  if (!found) {
    sheet.appendRow([
      'debt_' + normalizedKind + '_' + monthKey,
      normalizedKind,
      label,
      monthKey,
      monthLabel || getMonthLabel(monthKey),
      parseFloat(amount) || 0,
      stamp,
      'web'
    ]);
    formatRow(sheet, sheet.getLastRow(), DEBT_HEADERS.length);
  }
  return getDebtDataByKind(normalizedKind);
}

function deleteDebtByKind(kind, monthKey) {
  const normalizedKind = normalizeDebtKind(kind);
  const sheet = getSheet(SHEET_DEBT_SCHEDULE, DEBT_HEADERS);
  const data = sheet.getDataRange().getValues();
  for (let i = data.length - 1; i >= 1; i--) {
    if (String(data[i][1]) === normalizedKind && String(data[i][3]) === String(monthKey)) {
      sheet.deleteRow(i + 1);
      break;
    }
  }
  return getDebtDataByKind(normalizedKind);
}

function saveShopeePay(monthKey, monthLabel, amount) {
  return saveDebtByKind(SHEET_SHOPEEPAY, monthKey, monthLabel, amount);
}
function deleteShopeePay(monthKey) {
  return deleteDebtByKind(SHEET_SHOPEEPAY, monthKey);
}
function saveShopeecrAsh(monthKey, monthLabel, amount) {
  return saveDebtByKind(SHEET_SHOPEECRASH, monthKey, monthLabel, amount);
}
function deleteShopeecrAsh(monthKey) {
  return deleteDebtByKind(SHEET_SHOPEECRASH, monthKey);
}
function saveKasikorn(monthKey, monthLabel, amount) {
  return saveDebtByKind(SHEET_KASIKORN, monthKey, monthLabel, amount);
}
function deleteKasikorn(monthKey) {
  return deleteDebtByKind(SHEET_KASIKORN, monthKey);
}

function getCategories() {
  const sheet = getSheet(SHEET_CATEGORIES, CATEGORY_HEADERS);
  return readRows(sheet).map(r => ({
    categoryKey: String(r[0]),
    label: String(r[1]),
    type: String(r[2]),
    color: String(r[3]),
    active: r[4] === true || String(r[4]).toUpperCase() === 'TRUE',
    sortOrder: parseFloat(r[5]) || 0
  })).filter(r => r.categoryKey);
}

function getFixedExpenses() {
  const sheet = getSheet(SHEET_FIXED_EXPENSES, FIXED_HEADERS);
  return readRows(sheet).map(r => ({
    fixedKey: String(r[0]),
    label: String(r[1]),
    amount: parseFloat(r[2]) || 0,
    active: r[3] === true || String(r[3]).toUpperCase() === 'TRUE',
    sortOrder: parseFloat(r[4]) || 0,
    notes: String(r[5] || '')
  })).filter(r => r.fixedKey);
}

function getSettings() {
  const sheet = getSheet(SHEET_SETTINGS, SETTINGS_HEADERS);
  const result = {};
  readRows(sheet).forEach(r => {
    const key = String(r[0] || '').trim();
    if (!key) return;
    result[key] = r[1];
  });
  return result;
}

function readRows(sheet) {
  const data = sheet.getDataRange().getValues();
  return data.length <= 1 ? [] : data.slice(1).filter(r => String(r[0] || '').trim() !== '');
}

function normalizeCategory(category) {
  const key = String(category || '').trim();
  const allowed = getCategories().map(item => item.categoryKey);
  return allowed.indexOf(key) >= 0 ? key : 'other';
}

function normalizeDebtKind(kind) {
  const key = String(kind || '').trim();
  if (key === 'shopeePay') return SHEET_SHOPEEPAY;
  if (key === 'shopeeCrash' || key === 'shopeecrAsh') return SHEET_SHOPEECRASH;
  if (key === 'kasikorn') return SHEET_KASIKORN;
  throw new Error('Unknown debt kind: ' + kind);
}

function getDebtLabel(kind) {
  if (kind === SHEET_SHOPEEPAY) return 'ShopeePay';
  if (kind === SHEET_SHOPEECRASH) return 'ShopeecrAsh';
  if (kind === SHEET_KASIKORN) return 'กสิกร';
  return kind;
}

function getMonthKeyFromDate(date) {
  return MONTH_ORDER[date.getMonth()] || '';
}

function getMonthLabel(monthKey) {
  const months = getNext5Months();
  const found = months.find(m => m.key === monthKey);
  return found ? found.label : String(monthKey || '');
}

function getTimezone() {
  const settings = getSettings();
  return String(settings.timezone || 'Asia/Bangkok');
}

function nowStamp() {
  return Utilities.formatDate(new Date(), getTimezone(), 'yyyy-MM-dd HH:mm:ss');
}
