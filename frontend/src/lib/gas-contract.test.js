import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const codeGs = readFileSync(resolve(here, '../../../code.gs'), 'utf8');

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
});
