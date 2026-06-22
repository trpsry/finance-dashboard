import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { Script, createContext } from 'node:vm';

const here = dirname(fileURLToPath(import.meta.url));
const codeGs = readFileSync(resolve(here, '../../../code.gs'), 'utf8');

function loadGasContext() {
  const context = createContext({});
  new Script(codeGs).runInContext(context);
  return context;
}

describe('GAS backend contract', () => {
  it('exposes JSON web app endpoints for the standalone frontend', () => {
    expect(codeGs).toMatch(/function\s+doGet\s*\(\s*e\s*\)/);
    expect(codeGs).toMatch(/function\s+doPost\s*\(\s*e\s*\)/);
    expect(codeGs).toMatch(/function\s+apiResponse\s*\(/);
  });

  it('keeps old extras rows while supporting expense categories', () => {
    expect(codeGs).toMatch(/SHEET_EXTRAS/);
    expect(codeGs).toMatch(/category/);
    expect(codeGs).toMatch(/function\s+addExpense\s*\(/);
    expect(codeGs).toMatch(/function\s+deleteExpense\s*\(/);
  });

  it('uses the explicit finance spreadsheet and readable DB tabs', () => {
    expect(codeGs).toMatch(/SPREADSHEET_ID\s*=\s*['"]1UJCOHcxXriobWl-IvbdruR0sbd9SszNohaCddxbLM7c['"]/);
    expect(codeGs).toMatch(/SpreadsheetApp\.openById\(SPREADSHEET_ID\)/);
    expect(codeGs).not.toMatch(/getActiveSpreadsheet\(/);
    expect(codeGs).toMatch(/SHEET_TRANSACTIONS\s*=\s*['"]Transactions['"]/);
    expect(codeGs).toMatch(/SHEET_MONTHLY_INCOME\s*=\s*['"]MonthlyIncome['"]/);
    expect(codeGs).toMatch(/SHEET_DEBT_SCHEDULE\s*=\s*['"]DebtSchedule['"]/);
    expect(codeGs).toMatch(/SHEET_CATEGORIES\s*=\s*['"]Categories['"]/);
    expect(codeGs).toMatch(/SHEET_FIXED_EXPENSES\s*=\s*['"]FixedExpenses['"]/);
    expect(codeGs).toMatch(/SHEET_SETTINGS\s*=\s*['"]Settings['"]/);
  });

  it('builds a rolling five-month window from the current month', () => {
    const gas = loadGasContext();

    expect(gas.buildNextMonths(new Date(2026, 5, 22), 5)).toEqual([
      { key: 'jun', label: 'มิ.ย. 69' },
      { key: 'jul', label: 'ก.ค. 69' },
      { key: 'aug', label: 'ส.ค. 69' },
      { key: 'sep', label: 'ก.ย. 69' },
      { key: 'oct', label: 'ต.ค. 69' },
    ]);
    expect(gas.buildNextMonths(new Date(2026, 6, 1), 5)).toEqual([
      { key: 'jul', label: 'ก.ค. 69' },
      { key: 'aug', label: 'ส.ค. 69' },
      { key: 'sep', label: 'ก.ย. 69' },
      { key: 'oct', label: 'ต.ค. 69' },
      { key: 'nov', label: 'พ.ย. 69' },
    ]);
    expect(gas.buildNextMonths(new Date(2026, 11, 1), 5)).toEqual([
      { key: 'dec', label: 'ธ.ค. 69' },
      { key: 'jan', label: 'ม.ค. 70' },
      { key: 'feb', label: 'ก.พ. 70' },
      { key: 'mar', label: 'มี.ค. 70' },
      { key: 'apr', label: 'เม.ย. 70' },
    ]);
  });
});
