import * as XLSX from 'xlsx';
import type {
  CategoryBudget,
  PersonMoneyEntry,
  Transaction,
} from '../types/onespace';
import {toISODate, triggerFileDownload} from './platform';

export interface FinanceExportOptions {
  accountName: string;
  accountEmail: string;
  currency: string;
  transactions: Transaction[];
  personEntries: PersonMoneyEntry[];
  budgets: CategoryBudget[];
  financeCategories: string[];
  dateFrom?: string;
  dateTo?: string;
}

export interface PersonBalanceRow {
  personName: string;
  given: number;
  received: number;
  pending: number;
  status: string;
}

function escapeCsvCell(value: string | number, isText = false): string {
  let str = String(value ?? '');
  if (isText && /^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  const escaped = str.replace(/"/g, '""');
  return `"${escaped}"`;
}

function buildExportSnapshot(options: FinanceExportOptions) {
  const {
    accountName,
    accountEmail,
    currency,
    transactions,
    personEntries,
    budgets,
    financeCategories,
    dateFrom,
    dateTo,
  } = options;

  const inRange = (iso: string) => {
    if (dateFrom && iso < dateFrom) return false;
    if (dateTo && iso > dateTo) return false;
    return true;
  };

  const filteredTx = [...transactions]
    .filter((tx) => inRange(tx.date))
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));

  const filteredPeople = [...personEntries]
    .filter((entry) => inRange(entry.date))
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));

  let totalIncome = 0;
  let totalExpense = 0;
  filteredTx.forEach((tx) => {
    if (tx.type === 'income') totalIncome += tx.amount;
    else totalExpense += tx.amount;
  });

  const personMap = new Map<string, {displayName: string; given: number; received: number}>();
  let totalGiven = 0;
  let totalReceived = 0;

  filteredPeople.forEach((entry) => {
    if (entry.direction === 'given') totalGiven += entry.amount;
    else totalReceived += entry.amount;

    const clean = entry.personName.trim();
    const key = clean.toLowerCase();
    if (!key) return;
    const existing = personMap.get(key) ?? {
      displayName: clean,
      given: 0,
      received: 0,
    };
    if (entry.direction === 'given') existing.given += entry.amount;
    else existing.received += entry.amount;
    personMap.set(key, existing);
  });

  const personBalances: PersonBalanceRow[] = Array.from(personMap.values())
    .map((p) => {
      const pending = Math.max(0, p.given - p.received);
      const extra = Math.max(0, p.received - p.given);
      return {
        personName: p.displayName,
        given: p.given,
        received: p.received,
        pending,
        status:
          pending > 0
            ? 'Pending to Receive'
            : extra > 0
              ? `Extra Received (+${extra.toFixed(2)})`
              : 'Settled',
      };
    })
    .sort((a, b) => b.pending - a.pending || a.personName.localeCompare(b.personName));

  const totalPendingToReceive = personBalances.reduce((sum, p) => sum + p.pending, 0);
  const currentMonth = toISODate().slice(0, 7);

  const budgetRows = budgets.map((b) => {
    const spentThisMonth = transactions
      .filter(
        (tx) =>
          tx.type === 'expense' &&
          tx.category === b.category &&
          tx.date.startsWith(currentMonth)
      )
      .reduce((sum, tx) => sum + tx.amount, 0);
    const remaining = b.monthlyLimit - spentThisMonth;
    return {
      category: b.category,
      monthlyLimit: b.monthlyLimit,
      spentThisMonth,
      remaining,
      status: spentThisMonth > b.monthlyLimit ? 'Exceeded' : 'Within Budget',
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    exportDate: toISODate(),
    rangeLabel:
      dateFrom || dateTo
        ? `${dateFrom || 'Start'} to ${dateTo || 'Today'}`
        : 'All Time (Complete Record)',
    accountName,
    accountEmail,
    currency,
    summary: {
      totalIncome,
      totalExpense,
      netBalance: totalIncome - totalExpense,
      totalGivenToPeople: totalGiven,
      totalReceivedFromPeople: totalReceived,
      totalPendingToReceive,
      transactionCount: filteredTx.length,
      personEntryCount: filteredPeople.length,
      budgetCount: budgetRows.length,
    },
    transactions: filteredTx,
    personEntries: filteredPeople,
    personBalances,
    budgets: budgetRows,
    financeCategories,
  };
}

export function downloadFinanceExcel(options: FinanceExportOptions): void {
  const snap = buildExportSnapshot(options);
  const wb = XLSX.utils.book_new();

  // Sheet 1: Summary
  const summarySheetData = [
    ['OneSpace 2.0 – Complete Finance Record', ''],
    ['Account Holder', snap.accountName || 'User'],
    ['Email', snap.accountEmail],
    ['Currency', snap.currency],
    ['Date Range', snap.rangeLabel],
    ['Exported On', snap.exportDate],
    ['', ''],
    ['Overview Metric', `Amount (${snap.currency})`],
    ['Total Income', snap.summary.totalIncome],
    ['Total Expenses', snap.summary.totalExpense],
    ['Net Balance (Income - Expenses)', snap.summary.netBalance],
    ['Total Given to People', snap.summary.totalGivenToPeople],
    ['Total Received from People', snap.summary.totalReceivedFromPeople],
    ['Pending to Receive from People', snap.summary.totalPendingToReceive],
    ['', ''],
    ['Record Counts', 'Count'],
    ['Transactions', snap.summary.transactionCount],
    ['Given & Received Entries', snap.summary.personEntryCount],
    ['Monthly Budgets', snap.summary.budgetCount],
  ];
  const wsSummary = XLSX.utils.aoa_to_sheet(summarySheetData);
  wsSummary['!cols'] = [{wch: 34}, {wch: 24}];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

  // Sheet 2: Transactions
  const txRows = [
    ['Date', 'Type', 'Category', `Amount (${snap.currency})`, 'Note'],
    ...snap.transactions.map((tx) => [
      tx.date,
      tx.type === 'income' ? 'Income' : 'Expense',
      tx.category,
      tx.amount,
      tx.note || '',
    ]),
  ];
  const wsTx = XLSX.utils.aoa_to_sheet(txRows);
  wsTx['!cols'] = [{wch: 14}, {wch: 12}, {wch: 20}, {wch: 16}, {wch: 36}];
  XLSX.utils.book_append_sheet(wb, wsTx, 'Transactions');

  // Sheet 3: Given & Received (People)
  const peopleRows = [
    ['Date', 'Direction', 'Person Name', `Amount (${snap.currency})`, 'Expected Return Date', 'Note'],
    ...snap.personEntries.map((entry) => [
      entry.date,
      entry.direction === 'given' ? 'Given to Person' : 'Received from Person',
      entry.personName,
      entry.amount,
      entry.dueDate || '',
      entry.note || '',
    ]),
  ];
  const wsPeople = XLSX.utils.aoa_to_sheet(peopleRows);
  wsPeople['!cols'] = [{wch: 14}, {wch: 22}, {wch: 22}, {wch: 16}, {wch: 20}, {wch: 34}];
  XLSX.utils.book_append_sheet(wb, wsPeople, 'Given & Received');

  // Sheet 4: People Balances
  const balanceRows = [
    [
      'Person Name',
      `Total Given (${snap.currency})`,
      `Total Received (${snap.currency})`,
      `Pending to Receive (${snap.currency})`,
      'Status',
    ],
    ...snap.personBalances.map((b) => [
      b.personName,
      b.given,
      b.received,
      b.pending,
      b.status,
    ]),
  ];
  const wsBalances = XLSX.utils.aoa_to_sheet(balanceRows);
  wsBalances['!cols'] = [{wch: 24}, {wch: 18}, {wch: 20}, {wch: 22}, {wch: 22}];
  XLSX.utils.book_append_sheet(wb, wsBalances, 'People Balances');

  // Sheet 5: Monthly Budgets
  const budgetRows = [
    [
      'Category',
      `Monthly Limit (${snap.currency})`,
      `Spent This Month (${snap.currency})`,
      `Remaining (${snap.currency})`,
      'Status',
    ],
    ...snap.budgets.map((b) => [
      b.category,
      b.monthlyLimit,
      b.spentThisMonth,
      b.remaining,
      b.status,
    ]),
  ];
  const wsBudgets = XLSX.utils.aoa_to_sheet(budgetRows);
  wsBudgets['!cols'] = [{wch: 22}, {wch: 20}, {wch: 22}, {wch: 18}, {wch: 16}];
  XLSX.utils.book_append_sheet(wb, wsBudgets, 'Monthly Budgets');

  const arrayBuffer = XLSX.write(wb, {bookType: 'xlsx', type: 'array'}) as ArrayBuffer;
  const blob = new Blob([arrayBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  triggerFileDownload(blob, `onespace-finance-record-${snap.exportDate}.xlsx`);
}

export function downloadFinanceCsv(options: FinanceExportOptions): void {
  const snap = buildExportSnapshot(options);
  const lines: string[] = [];

  lines.push(
    [
      escapeCsvCell('Record Section', true),
      escapeCsvCell('Date', true),
      escapeCsvCell('Type / Direction', true),
      escapeCsvCell('Category / Person', true),
      escapeCsvCell(`Amount (${snap.currency})`, true),
      escapeCsvCell('Status / Return Date', true),
      escapeCsvCell('Note', true),
    ].join(',')
  );

  // Summary entries
  lines.push(
    [
      escapeCsvCell('Summary', true),
      escapeCsvCell(snap.exportDate, true),
      escapeCsvCell('Total Income', true),
      escapeCsvCell(snap.rangeLabel, true),
      escapeCsvCell(snap.summary.totalIncome),
      escapeCsvCell(snap.currency, true),
      escapeCsvCell(`Account: ${snap.accountName || snap.accountEmail}`, true),
    ].join(',')
  );
  lines.push(
    [
      escapeCsvCell('Summary', true),
      escapeCsvCell(snap.exportDate, true),
      escapeCsvCell('Total Expenses', true),
      escapeCsvCell(snap.rangeLabel, true),
      escapeCsvCell(snap.summary.totalExpense),
      escapeCsvCell(snap.currency, true),
      escapeCsvCell('', true),
    ].join(',')
  );
  lines.push(
    [
      escapeCsvCell('Summary', true),
      escapeCsvCell(snap.exportDate, true),
      escapeCsvCell('Net Balance', true),
      escapeCsvCell(snap.rangeLabel, true),
      escapeCsvCell(snap.summary.netBalance),
      escapeCsvCell(snap.currency, true),
      escapeCsvCell('', true),
    ].join(',')
  );
  lines.push(
    [
      escapeCsvCell('Summary', true),
      escapeCsvCell(snap.exportDate, true),
      escapeCsvCell('Pending to Receive (People)', true),
      escapeCsvCell(snap.rangeLabel, true),
      escapeCsvCell(snap.summary.totalPendingToReceive),
      escapeCsvCell(snap.currency, true),
      escapeCsvCell(
        `Given: ${snap.summary.totalGivenToPeople} | Received: ${snap.summary.totalReceivedFromPeople}`,
        true
      ),
    ].join(',')
  );

  // Transactions
  snap.transactions.forEach((tx) => {
    lines.push(
      [
        escapeCsvCell('Transaction', true),
        escapeCsvCell(tx.date, true),
        escapeCsvCell(tx.type === 'income' ? 'Income' : 'Expense', true),
        escapeCsvCell(tx.category, true),
        escapeCsvCell(tx.amount),
        escapeCsvCell('Recorded', true),
        escapeCsvCell(tx.note || '', true),
      ].join(',')
    );
  });

  // Given & Received
  snap.personEntries.forEach((entry) => {
    lines.push(
      [
        escapeCsvCell('Given & Received', true),
        escapeCsvCell(entry.date, true),
        escapeCsvCell(
          entry.direction === 'given' ? 'Given to Person' : 'Received from Person',
          true
        ),
        escapeCsvCell(entry.personName, true),
        escapeCsvCell(entry.amount),
        escapeCsvCell(entry.dueDate ? `Return by ${entry.dueDate}` : '', true),
        escapeCsvCell(entry.note || '', true),
      ].join(',')
    );
  });

  // Per-Person Balances
  snap.personBalances.forEach((b) => {
    lines.push(
      [
        escapeCsvCell('Person Balance', true),
        escapeCsvCell(snap.exportDate, true),
        escapeCsvCell('Pending Balance', true),
        escapeCsvCell(b.personName, true),
        escapeCsvCell(b.pending),
        escapeCsvCell(b.status, true),
        escapeCsvCell(`Given: ${b.given} | Received: ${b.received}`, true),
      ].join(',')
    );
  });

  // Monthly Budgets
  snap.budgets.forEach((b) => {
    lines.push(
      [
        escapeCsvCell('Monthly Budget', true),
        escapeCsvCell(snap.exportDate, true),
        escapeCsvCell('Budget Limit', true),
        escapeCsvCell(b.category, true),
        escapeCsvCell(b.monthlyLimit),
        escapeCsvCell(b.status, true),
        escapeCsvCell(`Spent this month: ${b.spentThisMonth} | Remaining: ${b.remaining}`, true),
      ].join(',')
    );
  });

  // Add UTF-8 BOM for proper Excel/mobile currency symbol display
  const csvContent = `\uFEFF${lines.join('\r\n')}`;
  const blob = new Blob([csvContent], {type: 'text/csv;charset=utf-8;'});
  triggerFileDownload(blob, `onespace-finance-record-${snap.exportDate}.csv`);
}

export function downloadFinanceJson(options: FinanceExportOptions): void {
  const snap = buildExportSnapshot(options);
  const blob = new Blob([JSON.stringify(snap, null, 2)], {
    type: 'application/json;charset=utf-8;',
  });
  triggerFileDownload(blob, `onespace-finance-record-${snap.exportDate}.json`);
}
