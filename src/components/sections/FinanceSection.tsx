import React, {useMemo, useState} from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  Download,
  Edit2,
  FileJson,
  FileSpreadsheet,
  FileText,
  Lock,
  Plus,
  Trash2,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import {useApp} from '../../context/AppContext';
import {
  downloadFinanceCsv,
  downloadFinanceExcel,
  downloadFinanceJson,
} from '../../lib/financeExport';
import {formatCurrency, formatDisplayDate, toISODate} from '../../lib/platform';
import type {PersonMoneyDirection, PersonMoneyEntry} from '../../types/onespace';
import {DonutChart, SmoothAreaChart} from '../charts/SimpleCharts';
import {EmptyState, ModalShell} from '../ui/CommonUI';

const CHART_COLORS = ['#4E7789', '#4C8B74', '#C5885B', '#80A4B5', '#D6B08D', '#2F596C'];

type ModalEntryMode = 'expense' | 'income' | 'given' | 'received';
type PeopleFilter = 'all' | 'pending' | 'given' | 'received';

interface PersonBalanceSummary {
  key: string;
  displayName: string;
  given: number;
  received: number;
  pending: number; // max(0, given - received)
  extraReceived: number; // max(0, received - given)
  entryCount: number;
}

export function FinanceSection() {
  const {
    user,
    data,
    addTransaction,
    deleteTransaction,
    addPersonEntry,
    updatePersonEntry,
    deletePersonEntry,
    addFinanceCategory,
    upsertBudget,
    deleteBudget,
    requestConfirm,
    showToast,
  } = useApp();

  const currency = user?.currency ?? 'USD';
  const currentMonth = toISODate().slice(0, 7);

  const [txModalOpen, setTxModalOpen] = useState(false);
  const [editingPersonEntry, setEditingPersonEntry] = useState<PersonMoneyEntry | null>(null);
  const [budgetModalOpen, setBudgetModalOpen] = useState(false);
  const [downloadModalOpen, setDownloadModalOpen] = useState(false);
  const [exportRange, setExportRange] = useState<'all' | 'month' | 'custom'>('all');
  const [exportFrom, setExportFrom] = useState(`${currentMonth}-01`);
  const [exportTo, setExportTo] = useState(toISODate());
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [peopleFilter, setPeopleFilter] = useState<PeopleFilter>('all');
  const [selectedPersonKey, setSelectedPersonKey] = useState<string | null>(null);

  // Unified transaction & person money form
  const [entryMode, setEntryMode] = useState<ModalEntryMode>('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(data.financeCategories[0] ?? 'Food & Dining');
  const [newCategory, setNewCategory] = useState('');
  const [txDate, setTxDate] = useState(toISODate());
  const [note, setNote] = useState('');
  const [personName, setPersonName] = useState('');
  const [personDueDate, setPersonDueDate] = useState('');

  // Budget form
  const [budgetCategory, setBudgetCategory] = useState(
    data.financeCategories[0] ?? 'Food & Dining'
  );
  const [budgetLimit, setBudgetLimit] = useState('');

  const personEntries = data.personEntries ?? [];

  const monthlyTotals = useMemo(() => {
    let income = 0;
    let expense = 0;
    data.transactions.forEach((tx) => {
      if (tx.date.startsWith(currentMonth)) {
        if (tx.type === 'income') income += tx.amount;
        else expense += tx.amount;
      }
    });
    return {income, expense, net: income - expense};
  }, [data.transactions, currentMonth]);

  const allTimeTotals = useMemo(() => {
    let income = 0;
    let expense = 0;
    data.transactions.forEach((tx) => {
      if (tx.type === 'income') income += tx.amount;
      else expense += tx.amount;
    });
    return {income, expense, balance: income - expense};
  }, [data.transactions]);

  // Group Given & Received money per person (case-insensitive)
  const personSummaries = useMemo(() => {
    const map = new Map<string, PersonBalanceSummary>();
    for (const entry of personEntries) {
      const clean = entry.personName.trim();
      const key = clean.toLowerCase();
      if (!key) continue;
      const existing = map.get(key) ?? {
        key,
        displayName: clean,
        given: 0,
        received: 0,
        pending: 0,
        extraReceived: 0,
        entryCount: 0,
      };
      if (entry.direction === 'given') {
        existing.given += entry.amount;
      } else {
        existing.received += entry.amount;
      }
      existing.entryCount += 1;
      existing.pending = Math.max(0, existing.given - existing.received);
      existing.extraReceived = Math.max(0, existing.received - existing.given);
      map.set(key, existing);
    }

    return Array.from(map.values()).sort(
      (a, b) => b.pending - a.pending || a.displayName.localeCompare(b.displayName)
    );
  }, [personEntries]);

  const personSummaryMap = useMemo(() => {
    const map = new Map<string, PersonBalanceSummary>();
    personSummaries.forEach((s) => map.set(s.key, s));
    return map;
  }, [personSummaries]);

  const peopleTotals = useMemo(() => {
    let totalGiven = 0;
    let totalReceived = 0;
    personEntries.forEach((entry) => {
      if (entry.direction === 'given') totalGiven += entry.amount;
      else totalReceived += entry.amount;
    });
    const totalPendingToReceive = personSummaries.reduce((sum, p) => sum + p.pending, 0);
    const pendingPeopleCount = personSummaries.filter((p) => p.pending > 0).length;
    return {
      totalGiven,
      totalReceived,
      totalPendingToReceive,
      pendingPeopleCount,
    };
  }, [personEntries, personSummaries]);

  const pendingPeople = useMemo(
    () => personSummaries.filter((p) => p.pending > 0),
    [personSummaries]
  );

  const filteredPersonEntries = useMemo(() => {
    return personEntries
      .filter((entry) => {
        const key = entry.personName.trim().toLowerCase();
        if (selectedPersonKey && key !== selectedPersonKey) return false;
        if (peopleFilter === 'given') return entry.direction === 'given';
        if (peopleFilter === 'received') return entry.direction === 'received';
        if (peopleFilter === 'pending') {
          const summary = personSummaryMap.get(key);
          return entry.direction === 'given' && Boolean(summary && summary.pending > 0);
        }
        return true;
      })
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  }, [personEntries, selectedPersonKey, peopleFilter, personSummaryMap]);

  const expenseByCategory = useMemo(() => {
    const map = new Map<string, number>();
    data.transactions
      .filter((tx) => tx.type === 'expense' && tx.date.startsWith(currentMonth))
      .forEach((tx) => {
        map.set(tx.category, (map.get(tx.category) ?? 0) + tx.amount);
      });
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([label, value], i) => ({
        label,
        value,
        color: CHART_COLORS[i % CHART_COLORS.length],
      }));
  }, [data.transactions, currentMonth]);

  const cashflow6Months = useMemo(() => {
    const months: {key: string; label: string; primary: number; secondary: number}[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      months.push({
        key,
        label: d.toLocaleDateString('en-US', {month: 'short'}),
        primary: 0,
        secondary: 0,
      });
    }
    data.transactions.forEach((tx) => {
      const bucket = months.find((m) => m.key === tx.date.slice(0, 7));
      if (bucket) {
        if (tx.type === 'income') bucket.primary += tx.amount;
        else bucket.secondary += tx.amount;
      }
    });
    return months;
  }, [data.transactions]);

  const filteredTransactions = useMemo(() => {
    return data.transactions
      .filter((tx) => (typeFilter === 'all' ? true : tx.type === typeFilter))
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  }, [data.transactions, typeFilter]);

  const openEntryModal = (
    mode: ModalEntryMode,
    prefill?: {personName?: string; amount?: number; note?: string}
  ) => {
    setEditingPersonEntry(null);
    setEntryMode(mode);
    setPersonName(prefill?.personName ?? '');
    setAmount(prefill?.amount && prefill.amount > 0 ? String(prefill.amount) : '');
    setTxDate(toISODate());
    setPersonDueDate('');
    setNote(prefill?.note ?? '');
    setNewCategory('');
    setTxModalOpen(true);
  };

  const openEditPersonEntryModal = (entry: PersonMoneyEntry) => {
    setEditingPersonEntry(entry);
    setEntryMode(entry.direction);
    setPersonName(entry.personName);
    setAmount(String(entry.amount));
    setTxDate(entry.date);
    setPersonDueDate(entry.dueDate ?? '');
    setNote(entry.note);
    setTxModalOpen(true);
  };

  const handleSaveEntry = (e: React.FormEvent) => {
    e.preventDefault();
    const numeric = parseFloat(amount);
    if (Number.isNaN(numeric) || numeric <= 0) return;

    if (entryMode === 'given' || entryMode === 'received') {
      const cleanPerson = personName.trim();
      if (!cleanPerson) return;

      const direction: PersonMoneyDirection = entryMode;
      const due = direction === 'given' ? personDueDate.trim() || undefined : undefined;

      if (editingPersonEntry) {
        updatePersonEntry(editingPersonEntry.id, {
          direction,
          personName: cleanPerson,
          amount: numeric,
          date: txDate,
          dueDate: due,
          note: note.trim(),
        });
      } else {
        addPersonEntry({
          direction,
          personName: cleanPerson,
          amount: numeric,
          date: txDate,
          dueDate: due,
          note: note.trim(),
        });
      }

      setEditingPersonEntry(null);
      setPersonName('');
      setPersonDueDate('');
      setAmount('');
      setNote('');
      setTxModalOpen(false);
      return;
    }

    const finalCat = newCategory.trim() || category;
    if (newCategory.trim()) {
      addFinanceCategory(newCategory.trim());
    }
    addTransaction({
      type: entryMode,
      amount: numeric,
      category: finalCat,
      date: txDate,
      note: note.trim(),
    });
    setAmount('');
    setNewCategory('');
    setNote('');
    setTxModalOpen(false);
  };

  const handleSaveBudget = (e: React.FormEvent) => {
    e.preventDefault();
    const limit = parseFloat(budgetLimit);
    if (Number.isNaN(limit) || limit <= 0) return;
    upsertBudget(budgetCategory, limit);
    setBudgetLimit('');
    setBudgetModalOpen(false);
  };

  const resolvedExportBounds = useMemo(() => {
    if (exportRange === 'month') {
      return {
        dateFrom: `${currentMonth}-01`,
        dateTo: `${currentMonth}-31`,
      };
    }
    if (exportRange === 'custom') {
      return {
        dateFrom: exportFrom || undefined,
        dateTo: exportTo || undefined,
      };
    }
    return {dateFrom: undefined, dateTo: undefined};
  }, [exportRange, exportFrom, exportTo, currentMonth]);

  const exportPreviewCounts = useMemo(() => {
    const {dateFrom, dateTo} = resolvedExportBounds;
    const inRange = (iso: string) => {
      if (dateFrom && iso < dateFrom) return false;
      if (dateTo && iso > dateTo) return false;
      return true;
    };
    return {
      txCount: data.transactions.filter((tx) => inRange(tx.date)).length,
      peopleCount: personEntries.filter((e) => inRange(e.date)).length,
      budgetCount: data.budgets.length,
    };
  }, [data.transactions, personEntries, data.budgets.length, resolvedExportBounds]);

  const handleDownloadRecord = (format: 'xlsx' | 'csv' | 'json') => {
    const payload = {
      accountName: user?.fullName ?? 'OneSpace User',
      accountEmail: user?.email ?? '',
      currency,
      transactions: data.transactions,
      personEntries,
      budgets: data.budgets,
      financeCategories: data.financeCategories,
      dateFrom: resolvedExportBounds.dateFrom,
      dateTo: resolvedExportBounds.dateTo,
    };
    if (format === 'xlsx') {
      downloadFinanceExcel(payload);
      showToast('Complete finance record downloaded (.xlsx).');
    } else if (format === 'csv') {
      downloadFinanceCsv(payload);
      showToast('Complete finance record downloaded (.csv).');
    } else {
      downloadFinanceJson(payload);
      showToast('Complete finance backup downloaded (.json).');
    }
    setDownloadModalOpen(false);
  };

  const isPersonMode = entryMode === 'given' || entryMode === 'received';

  return (
    <div className="space-y-4">
      {/* Header & Manual Ledger Notice */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-os-border dark:border-slate-800 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-display font-bold text-os-ink dark:text-slate-100">
            Personal Finance Ledger
          </h2>
          <p className="text-xs text-os-muted dark:text-slate-400 mt-0.5 flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-[#4C8B74]" />
            <span>Private manual ledger · No bank accounts connected</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setDownloadModalOpen(true)}
            className="min-h-[44px] px-3.5 py-2 rounded-xl border border-os-border-strong dark:border-slate-700 text-xs font-semibold text-os-ink-secondary dark:text-slate-200 hover:bg-os-surface-soft dark:hover:bg-slate-800 inline-flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Record</span>
          </button>
          <button
            type="button"
            onClick={() => setBudgetModalOpen(true)}
            className="min-h-[44px] px-3.5 py-2 rounded-xl border border-os-border-strong dark:border-slate-700 text-xs font-semibold text-os-ink-secondary dark:text-slate-200 hover:bg-os-surface-soft dark:hover:bg-slate-800"
          >
            Set Monthly Budget
          </button>
          <button
            type="button"
            onClick={() => openEntryModal('given')}
            className="min-h-[44px] px-3.5 py-2 rounded-xl bg-[#F9F2EC] dark:bg-amber-950/40 border border-[#E8CFC0] dark:border-amber-800 text-xs font-semibold text-[#8A4D2A] dark:text-amber-200 hover:bg-[#F3E5D9] dark:hover:bg-amber-950/70 inline-flex items-center gap-1.5"
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>Give to Person</span>
          </button>
          <button
            type="button"
            onClick={() => openEntryModal('received')}
            className="min-h-[44px] px-3.5 py-2 rounded-xl bg-[#EFF8F4] dark:bg-emerald-950/40 border border-[#CBE5D8] dark:border-emerald-800 text-xs font-semibold text-[#1F5441] dark:text-emerald-200 hover:bg-[#E1F3EB] dark:hover:bg-emerald-950/70 inline-flex items-center gap-1.5"
          >
            <ArrowDownLeft className="w-3.5 h-3.5" />
            <span>Receive Money</span>
          </button>
          <button
            type="button"
            onClick={() => openEntryModal('expense')}
            className="min-h-[44px] px-4 py-2 rounded-xl bg-os-primary hover:bg-os-primary-hover text-white text-xs font-semibold inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Add Transaction</span>
          </button>
        </div>
      </div>

      {/* 4 Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-[#EFF8F4] dark:bg-emerald-950/25 border border-[#CBE5D8] dark:border-emerald-900/60 rounded-xl p-4">
          <p className="text-xs text-os-muted dark:text-slate-400">This Month Income</p>
          <p className="text-xl font-display font-bold text-[#1F5441] dark:text-emerald-300 mt-1 font-mono-num">
            {formatCurrency(monthlyTotals.income, currency)}
          </p>
        </div>
        <div className="bg-[#F9F2EC] dark:bg-amber-950/25 border border-[#E8CFC0] dark:border-amber-900/60 rounded-xl p-4">
          <p className="text-xs text-os-muted dark:text-slate-400">This Month Expenses</p>
          <p className="text-xl font-display font-bold text-[#8A4D2A] dark:text-amber-300 mt-1 font-mono-num">
            {formatCurrency(monthlyTotals.expense, currency)}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-os-border dark:border-slate-800 rounded-xl p-4">
          <p className="text-xs text-os-muted dark:text-slate-400">Net Balance (All Time)</p>
          <p className="text-xl font-display font-bold text-os-ink dark:text-slate-100 mt-1 font-mono-num">
            {formatCurrency(allTimeTotals.balance, currency)}
          </p>
        </div>
        <div className="bg-[#EFF6FA] dark:bg-sky-950/25 border border-[#C7DCE7] dark:border-sky-900/60 rounded-xl p-4">
          <p className="text-xs text-os-muted dark:text-slate-400">To Receive (People)</p>
          <p className="text-xl font-display font-bold text-os-primary dark:text-sky-300 mt-1 font-mono-num">
            {formatCurrency(peopleTotals.totalPendingToReceive, currency)}
          </p>
          <p className="text-[11px] text-os-muted dark:text-slate-400 mt-0.5">
            {peopleTotals.pendingPeopleCount > 0
              ? `${peopleTotals.pendingPeopleCount} ${
                  peopleTotals.pendingPeopleCount === 1 ? 'person owes' : 'people owe'
                } you`
              : personEntries.length > 0
                ? 'All balances settled'
                : 'No pending dues'}
          </p>
        </div>
      </div>

      {/* Money Given & Received (People) */}
      <section className="bg-white dark:bg-slate-900 rounded-xl border border-os-border dark:border-slate-800 p-4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-display font-bold text-os-ink dark:text-slate-100 flex items-center gap-2">
              <Users className="w-4 h-4 text-os-primary dark:text-sky-300" />
              <span>Money Given & Received (People)</span>
            </h3>
            <p className="text-xs text-os-muted dark:text-slate-400 mt-0.5">
              Record money given to someone and receive your money back from them
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => openEntryModal('given')}
              className="min-h-[40px] px-3.5 py-2 rounded-xl border border-[#E8CFC0] dark:border-amber-800 bg-[#F9F2EC] dark:bg-amber-950/40 text-xs font-semibold text-[#8A4D2A] dark:text-amber-200 inline-flex items-center gap-1.5"
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>Given to Person</span>
            </button>
            <button
              type="button"
              onClick={() => openEntryModal('received')}
              className="min-h-[40px] px-3.5 py-2 rounded-xl bg-[#26694E] hover:bg-[#1F5441] text-white text-xs font-semibold inline-flex items-center gap-1.5"
            >
              <ArrowDownLeft className="w-3.5 h-3.5" />
              <span>Receive My Money</span>
            </button>
          </div>
        </div>

        {/* Totals Strip + Per-Person Balance Cards */}
        {personEntries.length > 0 && (
          <>
            <div className="grid grid-cols-3 gap-2.5 p-3 rounded-xl bg-os-surface-soft dark:bg-slate-800/60 border border-os-border dark:border-slate-700 text-xs">
              <div>
                <p className="text-[11px] text-os-muted dark:text-slate-400">Total Given</p>
                <p className="font-mono-num font-bold text-[#8A4D2A] dark:text-amber-300 mt-0.5">
                  {formatCurrency(peopleTotals.totalGiven, currency)}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-os-muted dark:text-slate-400">Total Received</p>
                <p className="font-mono-num font-bold text-[#1F5441] dark:text-emerald-300 mt-0.5">
                  {formatCurrency(peopleTotals.totalReceived, currency)}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-os-muted dark:text-slate-400">Pending to Receive</p>
                <p className="font-mono-num font-bold text-os-primary dark:text-sky-300 mt-0.5">
                  {formatCurrency(peopleTotals.totalPendingToReceive, currency)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {personSummaries.map((person) => {
                const isSelected = selectedPersonKey === person.key;
                const isSettled = person.pending === 0;
                return (
                  <div
                    key={person.key}
                    className={`p-3 rounded-xl border transition-colors ${
                      isSelected
                        ? 'border-os-primary bg-[#EFF6FA] dark:border-sky-400 dark:bg-sky-950/30'
                        : 'border-[#E2EDF2] dark:border-slate-800 bg-os-surface-soft dark:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedPersonKey(isSelected ? null : person.key)
                        }
                        className="text-left min-w-0 flex-1"
                      >
                        <p className="text-xs font-bold text-os-ink dark:text-slate-100 truncate">
                          {person.displayName}
                        </p>
                        <p className="text-[11px] text-os-muted dark:text-slate-400 mt-0.5 font-mono-num">
                          Given {formatCurrency(person.given, currency)} · Recv{' '}
                          {formatCurrency(person.received, currency)}
                        </p>
                      </button>

                      {person.pending > 0 ? (
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold font-mono-num bg-[#F9EFE8] dark:bg-amber-950/60 text-[#8A4D2A] dark:text-amber-300 shrink-0">
                          Due {formatCurrency(person.pending, currency)}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[#E7F4EE] dark:bg-emerald-950/60 text-[#1F5441] dark:text-emerald-300 inline-flex items-center gap-1 shrink-0">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>
                            {person.extraReceived > 0
                              ? `+${formatCurrency(person.extraReceived, currency)}`
                              : 'Settled'}
                          </span>
                        </span>
                      )}
                    </div>

                    <div className="mt-2.5 flex items-center gap-2">
                      {person.pending > 0 && (
                        <button
                          type="button"
                          onClick={() =>
                            openEntryModal('received', {
                              personName: person.displayName,
                              amount: person.pending,
                              note: `Received back from ${person.displayName}`,
                            })
                          }
                          className="flex-1 min-h-[36px] px-2.5 rounded-lg bg-[#26694E] hover:bg-[#1F5441] text-white text-[11px] font-semibold inline-flex items-center justify-center gap-1"
                        >
                          <ArrowDownLeft className="w-3 h-3" />
                          <span>Receive</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() =>
                          openEntryModal('given', {
                            personName: person.displayName,
                          })
                        }
                        className={`${
                          isSettled ? 'flex-1' : ''
                        } min-h-[36px] px-2.5 rounded-lg border border-os-border-strong dark:border-slate-700 text-[11px] font-semibold text-os-ink-secondary dark:text-slate-200 hover:bg-os-surface-soft dark:hover:bg-slate-800 inline-flex items-center justify-center gap-1`}
                      >
                        <ArrowUpRight className="w-3 h-3" />
                        <span>Give</span>
                      </button>
                      {isSettled && (
                        <button
                          type="button"
                          onClick={() =>
                            openEntryModal('received', {
                              personName: person.displayName,
                            })
                          }
                          className="flex-1 min-h-[36px] px-2.5 rounded-lg border border-os-border-strong dark:border-slate-700 text-[11px] font-semibold text-[#1F5441] dark:text-emerald-300 hover:bg-[#EFF8F4] dark:hover:bg-emerald-950/30 inline-flex items-center justify-center gap-1"
                        >
                          <ArrowDownLeft className="w-3 h-3" />
                          <span>Receive</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Filter Bar & People Entries List */}
        {personEntries.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No money given or received yet"
            description="Track money you lend to friends or family and easily mark it when you receive your money back."
            actionLabel="Give Money to Person"
            onAction={() => openEntryModal('given')}
          />
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="inline-flex p-1 rounded-xl bg-os-surface-soft dark:bg-slate-800">
                {(['all', 'pending', 'given', 'received'] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setPeopleFilter(tab)}
                    className={`min-h-[32px] px-2.5 rounded-lg text-xs font-semibold capitalize ${
                      peopleFilter === tab
                        ? 'bg-white dark:bg-slate-900 text-os-ink dark:text-white shadow-sm'
                        : 'text-os-muted dark:text-slate-400'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {selectedPersonKey && (
                <button
                  type="button"
                  onClick={() => setSelectedPersonKey(null)}
                  className="min-h-[32px] px-2.5 rounded-lg bg-os-surface-soft dark:bg-slate-800 text-xs font-semibold text-os-primary dark:text-sky-300 inline-flex items-center gap-1"
                >
                  <span>
                    Filtered: {personSummaryMap.get(selectedPersonKey)?.displayName}
                  </span>
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {filteredPersonEntries.length === 0 ? (
              <p className="text-xs text-os-muted dark:text-slate-400 text-center py-4">
                No entries match this filter.
              </p>
            ) : (
              <div className="divide-y divide-os-surface-soft dark:divide-slate-800">
                {filteredPersonEntries.map((entry) => {
                  const summary = personSummaryMap.get(
                    entry.personName.trim().toLowerCase()
                  );
                  const hasPending = Boolean(summary && summary.pending > 0);
                  const isGiven = entry.direction === 'given';

                  return (
                    <div
                      key={entry.id}
                      className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                            isGiven
                              ? 'bg-[#F9EFE8] dark:bg-amber-950/60 text-[#9B5932] dark:text-amber-300'
                              : 'bg-[#E7F4EE] dark:bg-emerald-950/60 text-[#26694E] dark:text-emerald-300'
                          }`}
                        >
                          {isGiven ? (
                            <ArrowUpRight className="w-4 h-4" />
                          ) : (
                            <ArrowDownLeft className="w-4 h-4" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <p className="text-xs font-semibold text-os-ink dark:text-slate-100 truncate">
                              {isGiven
                                ? `Given to ${entry.personName}`
                                : `Received from ${entry.personName}`}
                            </p>
                            {isGiven && (
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                  hasPending
                                    ? 'bg-[#F9EFE8] dark:bg-amber-950/60 text-[#8A4D2A] dark:text-amber-300'
                                    : 'bg-[#E7F4EE] dark:bg-emerald-950/60 text-[#1F5441] dark:text-emerald-300'
                                }`}
                              >
                                {hasPending ? 'Pending' : 'Settled'}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-os-muted dark:text-slate-400 truncate">
                            {formatDisplayDate(entry.date)}
                            {entry.dueDate && isGiven && hasPending
                              ? ` · Return by ${formatDisplayDate(entry.dueDate)}`
                              : ''}
                            {entry.note ? ` · ${entry.note}` : ''}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-1.5 shrink-0">
                        <span
                          className={`text-xs font-mono-num font-bold mr-1 ${
                            isGiven
                              ? 'text-[#8A4D2A] dark:text-amber-300'
                              : 'text-[#26694E] dark:text-emerald-300'
                          }`}
                        >
                          {isGiven ? '-' : '+'}
                          {formatCurrency(entry.amount, currency)}
                        </span>

                        {isGiven && hasPending && summary && (
                          <button
                            type="button"
                            onClick={() =>
                              openEntryModal('received', {
                                personName: entry.personName,
                                amount: Math.min(entry.amount, summary.pending),
                                note: entry.note
                                  ? `Returned: ${entry.note}`
                                  : `Received back from ${entry.personName}`,
                              })
                            }
                            className="min-h-[36px] px-2.5 rounded-lg bg-[#E7F4EE] dark:bg-emerald-950/60 text-[#1F5441] dark:text-emerald-300 text-[11px] font-semibold hover:bg-[#D5ECE2]"
                          >
                            Receive
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => openEditPersonEntryModal(entry)}
                          aria-label="Edit person entry"
                          className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-xl text-os-muted hover:text-os-primary"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            requestConfirm({
                              title: 'Delete Entry',
                              message: `Delete this ${
                                isGiven ? 'given' : 'received'
                              } entry of ${formatCurrency(entry.amount, currency)} (${entry.personName})?`,
                              onConfirm: () => deletePersonEntry(entry.id),
                            })
                          }
                          aria-label="Delete person entry"
                          className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-xl text-os-muted hover:text-rose-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-os-border dark:border-slate-800 p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-display font-bold text-os-ink dark:text-slate-100">
              Income vs Expenses
            </h3>
            <span className="text-xs text-os-muted dark:text-slate-400">Last 6 months</span>
          </div>
          <SmoothAreaChart
            points={cashflow6Months}
            primaryLabel="Income"
            secondaryLabel="Expense"
            primaryColor="#4C8B74"
            secondaryColor="#C5885B"
            formatValue={(v) => formatCurrency(v, currency).replace(/\.00$/, '')}
          />
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-os-border dark:border-slate-800 p-4">
          <h3 className="text-sm font-display font-bold text-os-ink dark:text-slate-100 mb-3">
            Monthly Spending by Category
          </h3>
          <DonutChart
            slices={expenseByCategory}
            emptyLabel="Log expenses this month to view category distribution"
            size={128}
          />
        </div>
      </div>

      {/* Monthly Budgets & Transaction History */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.45fr] gap-4 items-start">
        {/* Monthly Budgets */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-os-border dark:border-slate-800 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-display font-bold text-os-ink dark:text-slate-100">
              Monthly Budgets
            </h3>
            <button
              type="button"
              onClick={() => setBudgetModalOpen(true)}
              className="text-xs font-semibold text-os-primary dark:text-sky-300 hover:underline"
            >
              + Budget
            </button>
          </div>
          {data.budgets.length === 0 ? (
            <EmptyState
              icon={Wallet}
              title="No budgets configured"
              description="Set monthly spending limits per category to monitor your expenses."
              actionLabel="Set First Budget"
              onAction={() => setBudgetModalOpen(true)}
            />
          ) : (
            <div className="space-y-3">
              {data.budgets.map((b) => {
                const spent = data.transactions
                  .filter(
                    (tx) =>
                      tx.type === 'expense' &&
                      tx.category === b.category &&
                      tx.date.startsWith(currentMonth)
                  )
                  .reduce((sum, tx) => sum + tx.amount, 0);
                const pct = Math.min(100, Math.round((spent / b.monthlyLimit) * 100));
                const over = spent > b.monthlyLimit;

                return (
                  <div
                    key={b.id}
                    className="p-3 rounded-xl border border-os-surface-soft dark:border-slate-800 bg-os-surface-soft dark:bg-slate-800/40"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-os-ink dark:text-slate-100">
                        {b.category}
                      </span>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs font-mono-num ${
                            over
                              ? 'text-rose-600 dark:text-rose-400 font-semibold'
                              : 'text-os-muted dark:text-slate-400'
                          }`}
                        >
                          {formatCurrency(spent, currency)} / {formatCurrency(b.monthlyLimit, currency)}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            requestConfirm({
                              title: 'Remove Budget',
                              message: `Remove monthly budget for "${b.category}"?`,
                              onConfirm: () => deleteBudget(b.id),
                            })
                          }
                          aria-label="Remove budget"
                          className="p-1 text-os-muted hover:text-rose-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-os-surface-soft dark:bg-slate-700 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          over ? 'bg-rose-600' : pct > 80 ? 'bg-[#C5885B]' : 'bg-[#4C8B74]'
                        }`}
                        style={{width: `${pct}%`}}
                      />
                    </div>
                    {over && (
                      <p className="mt-1 text-[11px] font-medium text-rose-600 dark:text-rose-400">
                        Exceeded monthly budget by {formatCurrency(spent - b.monthlyLimit, currency)}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Transaction History */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-os-border dark:border-slate-800 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <h3 className="text-sm font-display font-bold text-os-ink dark:text-slate-100">
              Transaction History
            </h3>
            <div className="inline-flex p-1 rounded-xl bg-os-surface-soft dark:bg-slate-800">
              {(['all', 'income', 'expense'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTypeFilter(t)}
                  className={`min-h-[32px] px-2.5 rounded-lg text-xs font-semibold capitalize ${
                    typeFilter === t
                      ? 'bg-white dark:bg-slate-900 text-os-ink dark:text-white shadow-sm'
                      : 'text-os-muted dark:text-slate-400'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {filteredTransactions.length === 0 ? (
            <EmptyState
              icon={Wallet}
              title="No transactions recorded"
              description="Add income or expense entries to track your cashflow and budgets."
              actionLabel="Record Transaction"
              onAction={() => openEntryModal('expense')}
            />
          ) : (
            <div className="divide-y divide-os-surface-soft dark:divide-slate-800">
              {filteredTransactions.map((tx) => (
                <div
                  key={tx.id}
                  className="py-2.5 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        tx.type === 'income'
                          ? 'bg-[#E7F4EE] dark:bg-emerald-950/60 text-[#26694E] dark:text-emerald-300'
                          : 'bg-[#F9EFE8] dark:bg-amber-950/60 text-[#9B5932] dark:text-amber-300'
                      }`}
                    >
                      {tx.type === 'income' ? (
                        <ArrowDownLeft className="w-4 h-4" />
                      ) : (
                        <ArrowUpRight className="w-4 h-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-os-ink dark:text-slate-100 truncate">
                        {tx.note || tx.category}
                      </p>
                      <p className="text-[11px] text-os-muted dark:text-slate-400">
                        {tx.category} · {formatDisplayDate(tx.date)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`text-xs font-mono-num font-bold ${
                        tx.type === 'income'
                          ? 'text-[#26694E] dark:text-emerald-300'
                          : 'text-os-ink dark:text-slate-100'
                      }`}
                    >
                      {tx.type === 'income' ? '+' : '-'}
                      {formatCurrency(tx.amount, currency)}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        requestConfirm({
                          title: 'Delete Transaction',
                          message: `Delete this ${tx.type} of ${formatCurrency(tx.amount, currency)}?`,
                          onConfirm: () => deleteTransaction(tx.id),
                        })
                      }
                      aria-label="Delete transaction"
                      className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-os-muted hover:text-rose-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Unified Add Transaction / Given & Received Money Modal */}
      <ModalShell
        open={txModalOpen}
        onClose={() => {
          setTxModalOpen(false);
          setEditingPersonEntry(null);
        }}
        title={
          editingPersonEntry
            ? 'Edit Given / Received Entry'
            : entryMode === 'given'
              ? 'Give Money to Person'
              : entryMode === 'received'
                ? 'Receive Money from Someone'
                : 'Add Transaction'
        }
      >
        <form onSubmit={handleSaveEntry} className="space-y-4">
          {/* Mode selector (when editing a person entry, restrict toggle to given/received) */}
          <div
            className={`grid gap-1.5 p-1 rounded-xl bg-os-surface-soft dark:bg-slate-800 ${
              editingPersonEntry ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-4'
            }`}
          >
            {(editingPersonEntry
              ? ([
                  {id: 'given', label: 'Given to Person'},
                  {id: 'received', label: 'Receive Money'},
                ] as const)
              : ([
                  {id: 'expense', label: 'Expense'},
                  {id: 'income', label: 'Income'},
                  {id: 'given', label: 'Give to Person'},
                  {id: 'received', label: 'Receive Money'},
                ] as const)
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setEntryMode(opt.id)}
                className={`min-h-[40px] px-2 rounded-lg text-xs font-semibold ${
                  entryMode === opt.id
                    ? 'bg-white dark:bg-slate-900 text-os-ink dark:text-white shadow-sm'
                    : 'text-os-muted dark:text-slate-400'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {isPersonMode && (
            <div className="space-y-3">
              {entryMode === 'received' && pendingPeople.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold text-os-muted dark:text-slate-400 mb-1.5">
                    Quick select pending person:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {pendingPeople.map((p) => (
                      <button
                        key={p.key}
                        type="button"
                        onClick={() => {
                          setPersonName(p.displayName);
                          setAmount(String(p.pending));
                          if (!note) setNote(`Received back from ${p.displayName}`);
                        }}
                        className="min-h-[34px] px-2.5 rounded-lg bg-[#EFF8F4] dark:bg-emerald-950/50 border border-[#CBE5D8] dark:border-emerald-800 text-xs font-semibold text-[#1F5441] dark:text-emerald-300"
                      >
                        {p.displayName} ({formatCurrency(p.pending, currency)})
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-os-primary dark:text-slate-300 mb-1.5">
                  {entryMode === 'given' ? 'Given To (Person Name)' : 'Received From (Person Name)'}
                </label>
                <input
                  type="text"
                  required
                  list="onespace-people-suggestions"
                  value={personName}
                  onChange={(e) => setPersonName(e.target.value)}
                  placeholder="e.g. Rahul, Priya, Mom"
                  className="w-full min-h-[44px] px-3.5 rounded-xl border border-os-border-strong dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-os-ink dark:text-slate-100"
                />
                <datalist id="onespace-people-suggestions">
                  {personSummaries.map((p) => (
                    <option key={p.key} value={p.displayName} />
                  ))}
                </datalist>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-os-primary dark:text-slate-300 mb-1.5">
                Amount ({currency})
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full min-h-[44px] px-3.5 rounded-xl border border-os-border-strong dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-mono-num text-os-ink dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-os-primary dark:text-slate-300 mb-1.5">
                Date
              </label>
              <input
                type="date"
                required
                value={txDate}
                onChange={(e) => setTxDate(e.target.value)}
                className="w-full min-h-[44px] px-3.5 rounded-xl border border-os-border-strong dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-os-ink dark:text-slate-100"
              />
            </div>
          </div>

          {entryMode === 'given' && (
            <div>
              <label className="block text-xs font-semibold text-os-primary dark:text-slate-300 mb-1.5">
                Expected Return Date (optional)
              </label>
              <input
                type="date"
                value={personDueDate}
                onChange={(e) => setPersonDueDate(e.target.value)}
                className="w-full min-h-[44px] px-3.5 rounded-xl border border-os-border-strong dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-os-ink dark:text-slate-100"
              />
            </div>
          )}

          {!isPersonMode && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-os-primary dark:text-slate-300 mb-1.5">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 rounded-xl border border-os-border-strong dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-os-ink dark:text-slate-100"
                >
                  {data.financeCategories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-os-primary dark:text-slate-300 mb-1.5">
                  Or New Category
                </label>
                <input
                  type="text"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder="e.g. Subscriptions"
                  className="w-full min-h-[44px] px-3.5 rounded-xl border border-os-border-strong dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-os-ink dark:text-slate-100"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-os-primary dark:text-slate-300 mb-1.5">
              Note (optional)
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={
                entryMode === 'given'
                  ? 'e.g. Shared cab fare, lunch split'
                  : entryMode === 'received'
                    ? 'e.g. Returned via UPI / cash'
                    : 'Description or merchant'
              }
              className="w-full min-h-[44px] px-3.5 rounded-xl border border-os-border-strong dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-os-ink dark:text-slate-100"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => {
                setTxModalOpen(false);
                setEditingPersonEntry(null);
              }}
              className="min-h-[44px] px-4 py-2 rounded-xl border border-os-border-strong dark:border-slate-700 text-xs font-semibold text-os-primary dark:text-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="min-h-[44px] px-5 py-2 rounded-xl bg-os-primary hover:bg-os-primary-hover text-white text-xs font-semibold"
            >
              {editingPersonEntry
                ? 'Update Entry'
                : entryMode === 'given'
                  ? 'Save Given Money'
                  : entryMode === 'received'
                    ? 'Save Received Money'
                    : 'Save Transaction'}
            </button>
          </div>
        </form>
      </ModalShell>

      {/* Set Monthly Budget Modal */}
      <ModalShell
        open={budgetModalOpen}
        onClose={() => setBudgetModalOpen(false)}
        title="Set Monthly Category Budget"
      >
        <form onSubmit={handleSaveBudget} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-os-primary dark:text-slate-300 mb-1.5">
              Category
            </label>
            <select
              value={budgetCategory}
              onChange={(e) => setBudgetCategory(e.target.value)}
              className="w-full min-h-[44px] px-3.5 rounded-xl border border-os-border-strong dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-os-ink dark:text-slate-100"
            >
              {data.financeCategories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-os-primary dark:text-slate-300 mb-1.5">
              Monthly Limit ({currency})
            </label>
            <input
              type="number"
              step="1"
              min="1"
              required
              value={budgetLimit}
              onChange={(e) => setBudgetLimit(e.target.value)}
              placeholder="e.g. 300"
              className="w-full min-h-[44px] px-3.5 rounded-xl border border-os-border-strong dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-mono-num text-os-ink dark:text-slate-100"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setBudgetModalOpen(false)}
              className="min-h-[44px] px-4 py-2 rounded-xl border border-os-border-strong dark:border-slate-700 text-xs font-semibold text-os-primary dark:text-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="min-h-[44px] px-5 py-2 rounded-xl bg-os-primary hover:bg-os-primary-hover text-white text-xs font-semibold"
            >
              Save Budget
            </button>
          </div>
        </form>
      </ModalShell>

      {/* Download Whole Finance Record Modal */}
      <ModalShell
        open={downloadModalOpen}
        onClose={() => setDownloadModalOpen(false)}
        title="Download Finance Record"
        subtitle="Export your complete income, expenses, given & received money, and budgets."
      >
        <div className="space-y-4">
          <div>
            <p className="text-xs font-semibold text-os-primary dark:text-slate-300 mb-1.5">
              Record Range
            </p>
            <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-os-surface-soft dark:bg-slate-800">
              {[
                {id: 'all' as const, label: 'Whole Record'},
                {id: 'month' as const, label: 'This Month'},
                {id: 'custom' as const, label: 'Custom'},
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setExportRange(opt.id)}
                  className={`min-h-[38px] px-2 rounded-lg text-xs font-semibold ${
                    exportRange === opt.id
                      ? 'bg-white dark:bg-slate-900 text-os-ink dark:text-white shadow-sm'
                      : 'text-os-muted dark:text-slate-400'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {exportRange === 'custom' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-os-primary dark:text-slate-300 mb-1">
                  From Date
                </label>
                <input
                  type="date"
                  value={exportFrom}
                  onChange={(e) => setExportFrom(e.target.value)}
                  className="w-full min-h-[42px] px-3 rounded-xl border border-os-border-strong dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-os-ink dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-os-primary dark:text-slate-300 mb-1">
                  To Date
                </label>
                <input
                  type="date"
                  value={exportTo}
                  onChange={(e) => setExportTo(e.target.value)}
                  className="w-full min-h-[42px] px-3 rounded-xl border border-os-border-strong dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-os-ink dark:text-slate-100"
                />
              </div>
            </div>
          )}

          {/* Live included counts */}
          <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-os-surface-soft dark:bg-slate-800/60 border border-os-border dark:border-slate-700 text-center">
            <div>
              <p className="text-base font-display font-bold text-os-ink dark:text-slate-100 font-mono-num">
                {exportPreviewCounts.txCount}
              </p>
              <p className="text-[11px] text-os-muted dark:text-slate-400">Transactions</p>
            </div>
            <div>
              <p className="text-base font-display font-bold text-os-ink dark:text-slate-100 font-mono-num">
                {exportPreviewCounts.peopleCount}
              </p>
              <p className="text-[11px] text-os-muted dark:text-slate-400">Given / Recv</p>
            </div>
            <div>
              <p className="text-base font-display font-bold text-os-ink dark:text-slate-100 font-mono-num">
                {exportPreviewCounts.budgetCount}
              </p>
              <p className="text-[11px] text-os-muted dark:text-slate-400">Budgets</p>
            </div>
          </div>

          <div className="space-y-2.5">
            <button
              type="button"
              onClick={() => handleDownloadRecord('xlsx')}
              className="w-full min-h-[54px] px-4 py-3 rounded-xl bg-os-primary hover:bg-os-primary-hover text-white flex items-center justify-between gap-3 text-left transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <FileSpreadsheet className="w-5 h-5 shrink-0 text-emerald-300" />
                <div className="min-w-0">
                  <p className="text-xs font-bold">Download Excel Workbook (.xlsx)</p>
                  <p className="text-[11px] text-white/75 truncate">
                    5 sheets: Summary, Transactions, Given & Received, People Balances, Budgets
                  </p>
                </div>
              </div>
              <Download className="w-4 h-4 shrink-0" />
            </button>

            <button
              type="button"
              onClick={() => handleDownloadRecord('csv')}
              className="w-full min-h-[52px] px-4 py-2.5 rounded-xl border border-os-border-strong dark:border-slate-700 hover:bg-os-surface-soft dark:hover:bg-slate-800 text-os-ink dark:text-slate-100 flex items-center justify-between gap-3 text-left transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <FileText className="w-5 h-5 shrink-0 text-os-accent-mid dark:text-sky-300" />
                <div className="min-w-0">
                  <p className="text-xs font-bold">Download CSV Spreadsheet (.csv)</p>
                  <p className="text-[11px] text-os-muted dark:text-slate-400 truncate">
                    Single flat table compatible with Excel, Google Sheets, and mobile apps
                  </p>
                </div>
              </div>
              <Download className="w-4 h-4 shrink-0 text-os-muted" />
            </button>

            <button
              type="button"
              onClick={() => handleDownloadRecord('json')}
              className="w-full min-h-[52px] px-4 py-2.5 rounded-xl border border-os-border-strong dark:border-slate-700 hover:bg-os-surface-soft dark:hover:bg-slate-800 text-os-ink dark:text-slate-100 flex items-center justify-between gap-3 text-left transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <FileJson className="w-5 h-5 shrink-0 text-[#C5885B]" />
                <div className="min-w-0">
                  <p className="text-xs font-bold">Download JSON Full Backup (.json)</p>
                  <p className="text-[11px] text-os-muted dark:text-slate-400 truncate">
                    Complete structured data archive of your finance ledger
                  </p>
                </div>
              </div>
              <Download className="w-4 h-4 shrink-0 text-os-muted" />
            </button>
          </div>
        </div>
      </ModalShell>
    </div>
  );
}
