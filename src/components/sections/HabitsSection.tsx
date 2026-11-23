import React, {useMemo, useState} from 'react';
import {Check, Flame, Plus, Trash2} from 'lucide-react';
import {useApp} from '../../context/AppContext';
import {toISODate} from '../../lib/platform';
import type {HabitFrequency} from '../../types/onespace';
import {HorizontalBarList, SmoothAreaChart} from '../charts/SimpleCharts';
import {EmptyState, ModalShell} from '../ui/CommonUI';

function computeCurrentStreak(completedDates: string[]): number {
  if (completedDates.length === 0) return 0;
  const set = new Set(completedDates);
  const today = new Date();
  let cursor = new Date(today);
  if (!set.has(toISODate(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
    if (!set.has(toISODate(cursor))) return 0;
  }
  let streak = 0;
  while (set.has(toISODate(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function HabitsSection() {
  const {data, addHabit, toggleHabitDate, deleteHabit, requestConfirm} = useApp();
  const today = toISODate();

  const [modalOpen, setModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [frequency, setFrequency] = useState<HabitFrequency>('daily');
  const [targetPerWeek, setTargetPerWeek] = useState(7);
  const [category, setCategory] = useState('Wellness');

  const last7Days = useMemo(() => {
    const days: {iso: string; dayShort: string; dateNum: number}[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push({
        iso: toISODate(d),
        dayShort: d.toLocaleDateString('en-US', {weekday: 'short'}).slice(0, 2),
        dateNum: d.getDate(),
      });
    }
    return days;
  }, []);

  const last14DaysChart = useMemo(() => {
    const pts: {label: string; primary: number}[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const iso = toISODate(d);
      const label = i % 2 === 0 ? `${d.getMonth() + 1}/${d.getDate()}` : '';
      const completedCount = data.habits.filter((h) => h.completedDates.includes(iso)).length;
      pts.push({label, primary: completedCount});
    }
    return pts;
  }, [data.habits]);

  const habitStreakBars = useMemo(() => {
    return data.habits.map((h) => {
      const streak = computeCurrentStreak(h.completedDates);
      return {
        id: h.id,
        label: h.title,
        value: streak,
        maxValue: Math.max(7, streak),
        valueLabel: `${streak}d`,
      };
    });
  }, [data.habits]);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim().length < 2) return;
    addHabit({
      title: title.trim(),
      frequency,
      targetPerWeek: frequency === 'daily' ? 7 : Math.min(7, Math.max(1, targetPerWeek)),
      category: category.trim() || 'Wellness',
    });
    setTitle('');
    setFrequency('daily');
    setTargetPerWeek(7);
    setCategory('Wellness');
    setModalOpen(false);
  };

  const completedTodayCount = data.habits.filter((h) =>
    h.completedDates.includes(today)
  ).length;
  const bestStreak = data.habits.reduce(
    (max, h) => Math.max(max, computeCurrentStreak(h.completedDates)),
    0
  );

  return (
    <div className="space-y-4">
      {/* Header Summary */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-os-border dark:border-slate-800 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-display font-bold text-os-ink dark:text-slate-100">
            Habits & Daily Streaks
          </h2>
          <p className="text-xs text-os-muted dark:text-slate-400 mt-0.5 tabular-nums">
            {completedTodayCount} of {data.habits.length} completed today · Best active streak:{' '}
            {bestStreak} days
          </p>
        </div>

        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="min-h-[44px] px-4 py-2 rounded-xl bg-os-primary hover:bg-os-primary-hover text-white text-xs font-semibold inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>New Habit</span>
        </button>
      </div>

      {/* Interactive Habit Tracker Cards */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-os-border dark:border-slate-800 p-4">
        {data.habits.length === 0 ? (
          <EmptyState
            icon={Flame}
            title="No habits tracked yet"
            description="Create daily or weekly habits to build consistency and track real streaks."
            actionLabel="Create First Habit"
            onAction={() => setModalOpen(true)}
          />
        ) : (
          <div className="space-y-3">
            {data.habits.map((habit) => {
              const streak = computeCurrentStreak(habit.completedDates);
              const doneThisWeek = last7Days.filter((d) =>
                habit.completedDates.includes(d.iso)
              ).length;
              const doneToday = habit.completedDates.includes(today);

              return (
                <div
                  key={habit.id}
                  className="p-3.5 rounded-xl border border-[#E2EDF2] dark:border-slate-800 bg-os-surface-soft dark:bg-slate-800/40 flex flex-col lg:flex-row lg:items-center justify-between gap-3"
                >
                  <div className="flex items-start sm:items-center gap-3 min-w-0">
                    <button
                      type="button"
                      onClick={() => toggleHabitDate(habit.id, today)}
                      aria-label={`Toggle ${habit.title} for today`}
                      className={`min-h-[44px] min-w-[44px] rounded-xl border flex items-center justify-center shrink-0 transition-colors ${
                        doneToday
                          ? 'bg-[#4C8B74] border-[#4C8B74] text-white'
                          : 'bg-white dark:bg-slate-900 border-[#C6DAE4] dark:border-slate-700 text-os-muted hover:border-os-primary'
                      }`}
                    >
                      <Check className="w-5 h-5" />
                    </button>

                    <div className="min-w-0">
                      <p className="text-sm font-display font-bold text-os-ink dark:text-slate-100 truncate">
                        {habit.title}
                      </p>
                      <p className="text-xs text-os-muted dark:text-slate-400 mt-0.5 tabular-nums">
                        {habit.category} · <span className="capitalize">{habit.frequency}</span> ·{' '}
                        {doneThisWeek}/{habit.targetPerWeek} this week · {streak} day streak
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between lg:justify-end gap-2">
                    {/* 7-day interactive completion history grid */}
                    <div className="flex items-center gap-1.5">
                      {last7Days.map((day) => {
                        const checked = habit.completedDates.includes(day.iso);
                        return (
                          <button
                            key={day.iso}
                            type="button"
                            onClick={() => toggleHabitDate(habit.id, day.iso)}
                            title={`${day.dayShort} ${day.dateNum}`}
                            className={`w-9 h-10 rounded-lg border text-[10px] font-semibold flex flex-col items-center justify-center transition-colors ${
                              checked
                                ? 'bg-os-primary border-os-primary text-white'
                                : 'bg-white dark:bg-slate-900 border-[#D9E7EE] dark:border-slate-700 text-os-muted dark:text-slate-400 hover:border-[#7EA4B7]'
                            }`}
                          >
                            <span>{day.dayShort}</span>
                            <span className="font-mono-num text-[9px] opacity-80">
                              {day.dateNum}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        requestConfirm({
                          title: 'Delete Habit',
                          message: `Delete "${habit.title}" and its completion history?`,
                          onConfirm: () => deleteHabit(habit.id),
                        })
                      }
                      aria-label="Delete habit"
                      className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-os-muted hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Charts Row */}
      {data.habits.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-os-border dark:border-slate-800 p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-display font-bold text-os-ink dark:text-slate-100">
                14-Day Completion Trend
              </h3>
              <span className="text-xs text-os-muted dark:text-slate-400">
                Daily check-ins
              </span>
            </div>
            <SmoothAreaChart
              points={last14DaysChart}
              primaryLabel="Completed Habits"
              primaryColor="#4C8B74"
            />
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl border border-os-border dark:border-slate-800 p-4">
            <h3 className="text-sm font-display font-bold text-os-ink dark:text-slate-100 mb-3">
              Active Streaks
            </h3>
            <HorizontalBarList items={habitStreakBars} />
          </div>
        </div>
      )}

      {/* New Habit Modal */}
      <ModalShell
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Create New Habit"
      >
        <form onSubmit={handleAdd} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-os-primary dark:text-slate-300 mb-1.5">
              Habit Name
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Read 20 pages, Morning walk"
              className="w-full min-h-[44px] px-3.5 rounded-xl border border-os-border-strong dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-os-ink dark:text-slate-100"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-os-primary dark:text-slate-300 mb-1.5">
                Frequency
              </label>
              <select
                value={frequency}
                onChange={(e) => {
                  const val = e.target.value as HabitFrequency;
                  setFrequency(val);
                  if (val === 'daily') setTargetPerWeek(7);
                  else setTargetPerWeek(3);
                }}
                className="w-full min-h-[44px] px-3.5 rounded-xl border border-os-border-strong dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-os-ink dark:text-slate-100"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-os-primary dark:text-slate-300 mb-1.5">
                Target Days / Week
              </label>
              <input
                type="number"
                min={1}
                max={7}
                value={frequency === 'daily' ? 7 : targetPerWeek}
                disabled={frequency === 'daily'}
                onChange={(e) => setTargetPerWeek(Number(e.target.value))}
                className="w-full min-h-[44px] px-3.5 rounded-xl border border-os-border-strong dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-os-ink dark:text-slate-100 disabled:opacity-60"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-os-primary dark:text-slate-300 mb-1.5">
              Category
            </label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. Health, Study, Mindfulness"
              className="w-full min-h-[44px] px-3.5 rounded-xl border border-os-border-strong dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-os-ink dark:text-slate-100"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="min-h-[44px] px-4 py-2 rounded-xl border border-os-border-strong dark:border-slate-700 text-xs font-semibold text-os-primary dark:text-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="min-h-[44px] px-5 py-2 rounded-xl bg-os-primary hover:bg-os-primary-hover text-white text-xs font-semibold"
            >
              Create Habit
            </button>
          </div>
        </form>
      </ModalShell>
    </div>
  );
}
