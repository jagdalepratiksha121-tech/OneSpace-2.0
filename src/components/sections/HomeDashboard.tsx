import React, {useMemo} from 'react';
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  CheckSquare,
  Flame,
  FolderOpen,
  Quote,
  Target,
  Wallet,
} from 'lucide-react';
import {useApp} from '../../context/AppContext';
import {getDailyQuote} from '../../data/quotes';
import {formatCurrency, formatShortDate, toISODate} from '../../lib/platform';
import {DonutChart, HorizontalBarList, SmoothAreaChart} from '../charts/SimpleCharts';

export function HomeDashboard() {
  const {user, data, setActiveSection, toggleTask} = useApp();
  const today = toISODate();
  const dailyQuote = useMemo(() => getDailyQuote(new Date()), []);

  // Real user metrics only
  const pendingTasks = data.tasks.filter((t) => !t.completed);
  const completedTasks = data.tasks.filter((t) => t.completed);
  const todaysTasks = data.tasks.filter((t) => t.dueDate === today);
  const upcomingEvents = useMemo(
    () =>
      data.events
        .filter((e) => e.date >= today)
        .sort((a, b) => a.date.localeCompare(b.date)),
    [data.events, today]
  );

  const habitsCompletedToday = data.habits.filter((h) =>
    h.completedDates.includes(today)
  ).length;

  const ongoingGoals = data.goals.filter((g) => !g.completed);

  // Compute Goal Progress bars from real milestones
  const goalProgressBars = useMemo(() => {
    return data.goals.slice(0, 8).map((g) => {
      const totalM = g.milestones.length;
      const doneM = g.milestones.filter((m) => m.completed).length;
      const pct = g.completed
        ? 100
        : totalM > 0
          ? Math.round((doneM / totalM) * 100)
          : 0;
      return {
        id: g.id,
        label: g.title,
        value: pct,
        maxValue: 100,
        valueLabel: `${pct}%`,
      };
    });
  }, [data.goals]);

  // Last 6 months Income vs Expense from real transactions
  const monthlyCashflowPoints = useMemo(() => {
    const months: {key: string; label: string; primary: number; secondary: number}[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('en-US', {month: 'short'});
      months.push({key, label, primary: 0, secondary: 0});
    }

    data.transactions.forEach((tx) => {
      const key = tx.date.slice(0, 7);
      const bucket = months.find((m) => m.key === key);
      if (bucket) {
        if (tx.type === 'income') bucket.primary += tx.amount;
        else bucket.secondary += tx.amount;
      }
    });
    return months;
  }, [data.transactions]);

  const hasTransactions = data.transactions.length > 0;

  // Fallback 7-day habit completions trend when user has habits but no transactions
  const habit7DayPoints = useMemo(() => {
    const pts: {label: string; primary: number}[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const iso = toISODate(d);
      const label = d.toLocaleDateString('en-US', {weekday: 'short'});
      const count = data.habits.filter((h) => h.completedDates.includes(iso)).length;
      pts.push({label, primary: count});
    }
    return pts;
  }, [data.habits]);

  const currency = user?.currency ?? 'USD';

  return (
    <div className="space-y-4">
      {/* Daily Motivational Quote Strip */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-os-border dark:border-slate-800 px-4 py-3 flex items-start sm:items-center justify-between gap-3">
        <div className="flex items-start sm:items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-os-surface-soft dark:bg-slate-800 text-os-primary dark:text-sky-300 flex items-center justify-center shrink-0">
            <Quote className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs sm:text-sm font-medium text-os-ink dark:text-slate-100 leading-snug">
              "{dailyQuote.text}"
            </p>
            <p className="text-[11px] text-os-muted dark:text-slate-400 mt-0.5">
              Daily Inspiration · {dailyQuote.author}
            </p>
          </div>
        </div>
      </div>

      {/* Overview Row matching the 4-card Overview panel in reference screenshot */}
      <section className="bg-white dark:bg-slate-900 rounded-xl border border-os-border dark:border-slate-800 p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-display font-bold text-os-ink dark:text-slate-100">
            Overview
          </h2>
          <span className="text-[11px] text-os-muted dark:text-slate-400">
            Live Personal Summary
          </span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <button
            type="button"
            onClick={() => setActiveSection('tasks')}
            className="text-left p-3.5 rounded-xl bg-[#EFF8F4] dark:bg-emerald-950/25 border border-[#CBE5D8] dark:border-emerald-900/60 hover:border-[#8DC5AA] transition-colors flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-lg bg-[#D6EFE3] dark:bg-emerald-900/50 text-[#235743] dark:text-emerald-300 flex items-center justify-center shrink-0">
              <CheckSquare className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xl font-display font-bold text-os-ink dark:text-slate-100 tabular-nums leading-none">
                {pendingTasks.length}
              </p>
              <p className="text-xs text-os-muted dark:text-slate-400 mt-1 truncate">
                Pending Tasks
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('calendar')}
            className="text-left p-3.5 rounded-xl bg-[#EDF6F3] dark:bg-teal-950/25 border border-[#C8E2DA] dark:border-teal-900/60 hover:border-[#8AC1B1] transition-colors flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-lg bg-[#D4ECE4] dark:bg-teal-900/50 text-[#21544A] dark:text-teal-300 flex items-center justify-center shrink-0">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xl font-display font-bold text-os-ink dark:text-slate-100 tabular-nums leading-none">
                {upcomingEvents.length}
              </p>
              <p className="text-xs text-os-muted dark:text-slate-400 mt-1 truncate">
                Upcoming Events
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('habits')}
            className="text-left p-3.5 rounded-xl bg-[#EFF8F4] dark:bg-sky-950/25 border border-[#CBE5D8] dark:border-sky-900/60 hover:border-[#8DC5AA] transition-colors flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-lg bg-[#D6EFE3] dark:bg-sky-900/50 text-[#235743] dark:text-sky-300 flex items-center justify-center shrink-0">
              <Flame className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xl font-display font-bold text-os-ink dark:text-slate-100 tabular-nums leading-none">
                {habitsCompletedToday}/{data.habits.length}
              </p>
              <p className="text-xs text-os-muted dark:text-slate-400 mt-1 truncate">
                Habits Today
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('goals')}
            className="text-left p-3.5 rounded-xl bg-[#F9F2EC] dark:bg-amber-950/25 border border-[#E8CFC0] dark:border-amber-900/60 hover:border-[#D4AA90] transition-colors flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-lg bg-[#F1DFD2] dark:bg-amber-900/50 text-[#7A4B2E] dark:text-amber-300 flex items-center justify-center shrink-0">
              <Target className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xl font-display font-bold text-os-ink dark:text-slate-100 tabular-nums leading-none">
                {ongoingGoals.length}
              </p>
              <p className="text-xs text-os-muted dark:text-slate-400 mt-1 truncate">
                Ongoing Goals
              </p>
            </div>
          </button>
        </div>
      </section>

      {/* Main 2-Column Bento matching reference screenshot proportions */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.65fr_1fr] gap-4 items-start">
        {/* Left Analytics & Daily Focus Column */}
        <div className="space-y-4">
          {/* Middle Split: My Space Vault Count + Task Completion Donut */}
          <div className="grid grid-cols-1 sm:grid-cols-[0.8fr_1.2fr] gap-4">
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-os-border dark:border-slate-800 p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-display font-bold text-os-ink dark:text-slate-100">
                  My Space Vault
                </h3>
                <button
                  type="button"
                  onClick={() => setActiveSection('myspace')}
                  className="text-xs font-semibold text-os-primary dark:text-sky-300 hover:underline"
                >
                  Open
                </button>
              </div>
              <div className="my-4 flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-[#D6E4EC] dark:bg-slate-800 text-os-primary dark:text-sky-300 flex items-center justify-center shrink-0">
                  <FolderOpen className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-2xl font-display font-bold text-os-ink dark:text-slate-100 tabular-nums">
                    {data.spaceItems.length}
                  </p>
                  <p className="text-xs text-os-muted dark:text-slate-400">
                    Saved Items · {data.folders.length} Folders
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveSection('myspace')}
                className="w-full min-h-[40px] rounded-xl bg-os-surface-soft dark:bg-slate-800 hover:bg-[#DFECF2] dark:hover:bg-slate-700 text-os-ink-secondary dark:text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                <span>Manage Files & Notes</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-xl border border-os-border dark:border-slate-800 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-display font-bold text-os-ink dark:text-slate-100">
                  Task Status Breakdown
                </h3>
                <button
                  type="button"
                  onClick={() => setActiveSection('tasks')}
                  className="text-xs font-semibold text-os-primary dark:text-sky-300 hover:underline"
                >
                  View All
                </button>
              </div>
              <DonutChart
                slices={[
                  {label: 'Completed Tasks', value: completedTasks.length, color: 'var(--os-accent-mid)'},
                  {label: 'Pending Tasks', value: pendingTasks.length, color: 'var(--os-border-strong)'},
                ]}
                emptyLabel="Create tasks to see your real completion ratio"
                size={124}
              />
            </div>
          </div>

          {/* Wide Trend Chart (Income vs Expense OR Habit Activity) */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-os-border dark:border-slate-800 p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-display font-bold text-os-ink dark:text-slate-100">
                {hasTransactions ? 'Income vs Expense' : '7-Day Habit Check-ins'}
              </h3>
              <span className="text-xs text-os-muted dark:text-slate-400">
                {hasTransactions ? 'Last 6 months' : 'Last 7 days'}
              </span>
            </div>

            {hasTransactions ? (
              <SmoothAreaChart
                points={monthlyCashflowPoints}
                primaryLabel="Income"
                secondaryLabel="Expense"
                primaryColor="#4C8B74"
                secondaryColor="#C5885B"
                formatValue={(v) => formatCurrency(v, currency).replace(/\.00$/, '')}
              />
            ) : data.habits.length > 0 ? (
              <SmoothAreaChart
                points={habit7DayPoints}
                primaryLabel="Habits Completed"
                primaryColor="#4C8B74"
              />
            ) : (
              <div className="py-8 text-center">
                <p className="text-xs text-os-muted dark:text-slate-400">
                  Add income/expenses in Finance or track Habits to see your real trend chart here.
                </p>
                <div className="mt-3 flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveSection('finance')}
                    className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-os-primary text-white text-xs font-semibold"
                  >
                    Open Finance
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveSection('habits')}
                    className="min-h-[40px] px-3.5 py-1.5 rounded-xl border border-os-border-strong dark:border-slate-700 text-xs font-semibold text-os-ink-secondary dark:text-slate-200"
                  >
                    Open Habits
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Today's Tasks & Upcoming Events Split */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-os-border dark:border-slate-800 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-display font-bold text-os-ink dark:text-slate-100">
                  Today's Tasks
                </h3>
                <button
                  type="button"
                  onClick={() => setActiveSection('tasks')}
                  className="text-xs font-semibold text-os-primary dark:text-sky-300 hover:underline"
                >
                  Manage
                </button>
              </div>
              {todaysTasks.length === 0 && pendingTasks.length === 0 ? (
                <p className="text-xs text-os-muted dark:text-slate-400 py-4">
                  No tasks scheduled for today yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {(todaysTasks.length > 0 ? todaysTasks : pendingTasks)
                    .slice(0, 4)
                    .map((task) => (
                      <button
                        key={task.id}
                        type="button"
                        onClick={() => toggleTask(task.id)}
                        className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-os-surface-soft dark:border-slate-800 hover:bg-[#F5FAFC] dark:hover:bg-slate-800 flex items-center gap-2.5 text-left transition-colors"
                      >
                        <CheckCircle2
                          className={`w-4 h-4 shrink-0 ${
                            task.completed
                              ? 'text-[#4C8B74]'
                              : 'text-[#9BB4C1] dark:text-slate-600'
                          }`}
                        />
                        <div className="flex-1 min-w-0">
                          <p
                            className={`text-xs font-medium truncate ${
                              task.completed
                                ? 'line-through text-os-muted'
                                : 'text-os-ink dark:text-slate-100'
                            }`}
                          >
                            {task.title}
                          </p>
                          <p className="text-[11px] text-os-muted dark:text-slate-400">
                            {task.category} · {task.priority}
                          </p>
                        </div>
                      </button>
                    ))}
                </div>
              )}
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-xl border border-os-border dark:border-slate-800 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-display font-bold text-os-ink dark:text-slate-100">
                  Upcoming Events
                </h3>
                <button
                  type="button"
                  onClick={() => setActiveSection('calendar')}
                  className="text-xs font-semibold text-os-primary dark:text-sky-300 hover:underline"
                >
                  Calendar
                </button>
              </div>
              {upcomingEvents.length === 0 ? (
                <p className="text-xs text-os-muted dark:text-slate-400 py-4">
                  No upcoming events added yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {upcomingEvents.slice(0, 4).map((evt) => (
                    <button
                      key={evt.id}
                      type="button"
                      onClick={() => setActiveSection('calendar')}
                      className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-os-surface-soft dark:border-slate-800 hover:bg-[#F5FAFC] dark:hover:bg-slate-800 flex items-center justify-between gap-2 text-left transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-os-ink dark:text-slate-100 truncate">
                          {evt.title}
                        </p>
                        <p className="text-[11px] text-os-muted dark:text-slate-400">
                          {evt.type === 'important' ? 'Important' : evt.type === 'reminder' ? 'Reminder' : 'Event'}
                          {evt.startTime ? ` · ${evt.startTime}` : ''}
                        </p>
                      </div>
                      <span className="text-[11px] font-mono-num text-os-ink-secondary dark:text-sky-300 shrink-0">
                        {evt.date === today ? 'Today' : formatShortDate(evt.date)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Tall Column: Goal Progress + Quick Access */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-os-border dark:border-slate-800 p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-display font-bold text-os-ink dark:text-slate-100">
                Goal Progress
              </h3>
              <button
                type="button"
                onClick={() => setActiveSection('goals')}
                className="text-xs font-semibold text-os-primary dark:text-sky-300 hover:underline"
              >
                All Goals
              </button>
            </div>
            <HorizontalBarList
              items={goalProgressBars}
              emptyLabel="Add goals with milestones to track real progress here."
            />
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl border border-os-border dark:border-slate-800 p-4">
            <h3 className="text-sm font-display font-bold text-os-ink dark:text-slate-100 mb-3">
              Quick Access
            </h3>
            <div className="grid grid-cols-2 gap-2.5">
              {[
                {id: 'tasks' as const, label: 'Add Task', icon: CheckSquare},
                {id: 'calendar' as const, label: 'Schedule', icon: CalendarDays},
                {id: 'habits' as const, label: 'Log Habit', icon: Flame},
                {id: 'finance' as const, label: 'Finance', icon: Wallet},
                {id: 'goals' as const, label: 'Milestones', icon: Target},
                {id: 'myspace' as const, label: 'My Space', icon: FolderOpen},
              ].map((q) => {
                const Icon = q.icon;
                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => setActiveSection(q.id)}
                    className="min-h-[46px] px-3 py-2.5 rounded-xl bg-os-surface-soft dark:bg-slate-800 border border-os-border dark:border-slate-700 hover:border-[#8AB0C2] text-os-ink-secondary dark:text-slate-100 text-xs font-semibold flex items-center gap-2 transition-colors"
                  >
                    <Icon className="w-4 h-4 text-os-accent-mid dark:text-sky-300 shrink-0" />
                    <span className="truncate">{q.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
