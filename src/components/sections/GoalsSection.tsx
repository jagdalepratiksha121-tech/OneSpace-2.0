import React, {useMemo, useState} from 'react';
import {
  CheckCircle2,
  Circle,
  Edit2,
  Plus,
  Target,
  Trash2,
  X,
} from 'lucide-react';
import {useApp} from '../../context/AppContext';
import {formatDisplayDate} from '../../lib/platform';
import type {Goal, GoalCategory, Milestone} from '../../types/onespace';
import {EmptyState, ModalShell} from '../ui/CommonUI';

export function GoalsSection() {
  const {
    data,
    addGoal,
    updateGoal,
    toggleMilestone,
    toggleGoalCompleted,
    deleteGoal,
    requestConfirm,
  } = useApp();

  const [tab, setTab] = useState<'ongoing' | 'completed'>('ongoing');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<GoalCategory>('personal');
  const [deadline, setDeadline] = useState('');
  const [description, setDescription] = useState('');
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [newMilestoneTitle, setNewMilestoneTitle] = useState('');

  const openCreate = () => {
    setEditingGoal(null);
    setTitle('');
    setCategory('personal');
    setDeadline('');
    setDescription('');
    setMilestones([]);
    setNewMilestoneTitle('');
    setModalOpen(true);
  };

  const openEdit = (goal: Goal) => {
    setEditingGoal(goal);
    setTitle(goal.title);
    setCategory(goal.category);
    setDeadline(goal.deadline);
    setDescription(goal.description);
    setMilestones(goal.milestones);
    setNewMilestoneTitle('');
    setModalOpen(true);
  };

  const addDraftMilestone = () => {
    const clean = newMilestoneTitle.trim();
    if (!clean) return;
    setMilestones((prev) => [
      ...prev,
      {id: `ms_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, title: clean, completed: false},
    ]);
    setNewMilestoneTitle('');
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim().length < 2) return;
    if (editingGoal) {
      updateGoal(editingGoal.id, {
        title: title.trim(),
        category,
        deadline,
        description: description.trim(),
        milestones,
      });
    } else {
      addGoal({
        title: title.trim(),
        category,
        deadline,
        description: description.trim(),
        milestones,
      });
    }
    setModalOpen(false);
  };

  const visibleGoals = useMemo(
    () => data.goals.filter((g) => (tab === 'completed' ? g.completed : !g.completed)),
    [data.goals, tab]
  );

  const ongoingCount = data.goals.filter((g) => !g.completed).length;
  const completedCount = data.goals.filter((g) => g.completed).length;

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-os-border dark:border-slate-800 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-display font-bold text-os-ink dark:text-slate-100">
            Personal & Professional Goals
          </h2>
          <p className="text-xs text-os-muted dark:text-slate-400 mt-0.5">
            {ongoingCount} ongoing · {completedCount} completed
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex p-1 rounded-xl bg-os-surface-soft dark:bg-slate-800">
            <button
              type="button"
              onClick={() => setTab('ongoing')}
              className={`min-h-[36px] px-3 rounded-lg text-xs font-semibold ${
                tab === 'ongoing'
                  ? 'bg-white dark:bg-slate-900 text-os-ink dark:text-white shadow-sm'
                  : 'text-os-muted dark:text-slate-400'
              }`}
            >
              Ongoing ({ongoingCount})
            </button>
            <button
              type="button"
              onClick={() => setTab('completed')}
              className={`min-h-[36px] px-3 rounded-lg text-xs font-semibold ${
                tab === 'completed'
                  ? 'bg-white dark:bg-slate-900 text-os-ink dark:text-white shadow-sm'
                  : 'text-os-muted dark:text-slate-400'
              }`}
            >
              Completed ({completedCount})
            </button>
          </div>

          <button
            type="button"
            onClick={openCreate}
            className="min-h-[44px] px-4 rounded-xl bg-os-primary hover:bg-os-primary-hover text-white text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>New Goal</span>
          </button>
        </div>
      </div>

      {visibleGoals.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-os-border dark:border-slate-800 p-4">
          <EmptyState
            icon={Target}
            title={tab === 'ongoing' ? 'No ongoing goals yet' : 'No completed goals yet'}
            description="Break down meaningful personal and career goals into trackable milestones with deadlines."
            actionLabel={tab === 'ongoing' ? 'Create First Goal' : undefined}
            onAction={tab === 'ongoing' ? openCreate : undefined}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {visibleGoals.map((goal) => {
            const totalM = goal.milestones.length;
            const doneM = goal.milestones.filter((m) => m.completed).length;
            const pct = goal.completed
              ? 100
              : totalM > 0
                ? Math.round((doneM / totalM) * 100)
                : 0;

            return (
              <div
                key={goal.id}
                className="bg-white dark:bg-slate-900 rounded-xl border border-os-border dark:border-slate-800 p-4 flex flex-col justify-between gap-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs text-os-muted dark:text-slate-400 capitalize">
                        {goal.category}
                        {goal.deadline ? ` · Deadline ${formatDisplayDate(goal.deadline)}` : ''}
                      </p>
                      <h3 className="text-sm font-display font-bold text-os-ink dark:text-slate-100 mt-1">
                        {goal.title}
                      </h3>
                    </div>

                    <div className="flex items-center shrink-0">
                      <button
                        type="button"
                        onClick={() => openEdit(goal)}
                        aria-label="Edit goal"
                        className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-os-muted hover:text-os-primary"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          requestConfirm({
                            title: 'Delete Goal',
                            message: `Delete "${goal.title}" and all its milestones?`,
                            onConfirm: () => deleteGoal(goal.id),
                          })
                        }
                        aria-label="Delete goal"
                        className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-os-muted hover:text-rose-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {goal.description && (
                    <p className="text-xs text-os-muted dark:text-slate-400 mt-1.5 leading-relaxed">
                      {goal.description}
                    </p>
                  )}

                  {/* Progress Bar */}
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-os-muted dark:text-slate-400">
                        {totalM > 0 ? `${doneM} of ${totalM} milestones` : 'Progress'}
                      </span>
                      <span className="font-mono-num font-bold text-os-primary dark:text-sky-300">
                        {pct}%
                      </span>
                    </div>
                    <div className="h-2.5 rounded-full bg-os-surface-soft dark:bg-slate-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#4C8B74] transition-all duration-300"
                        style={{width: `${pct}%`}}
                      />
                    </div>
                  </div>

                  {/* Milestones Checklist */}
                  {goal.milestones.length > 0 && (
                    <div className="mt-3 space-y-1.5">
                      {goal.milestones.map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => toggleMilestone(goal.id, m.id)}
                          className="w-full min-h-[38px] px-2.5 py-1.5 rounded-lg hover:bg-[#F5FAFC] dark:hover:bg-slate-800 flex items-center gap-2 text-left transition-colors"
                        >
                          {m.completed ? (
                            <CheckCircle2 className="w-4 h-4 text-[#4C8B74] shrink-0" />
                          ) : (
                            <Circle className="w-4 h-4 text-[#8DA7B5] shrink-0" />
                          )}
                          <span
                            className={`text-xs ${
                              m.completed
                                ? 'line-through text-os-muted dark:text-slate-500'
                                : 'text-os-ink dark:text-slate-200'
                            }`}
                          >
                            {m.title}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-os-surface-soft dark:border-slate-800 flex justify-end">
                  <button
                    type="button"
                    onClick={() => toggleGoalCompleted(goal.id)}
                    className="min-h-[40px] px-3.5 rounded-xl bg-os-surface-soft dark:bg-slate-800 hover:bg-[#DFECF2] dark:hover:bg-slate-700 text-xs font-semibold text-os-ink-secondary dark:text-slate-200 transition-colors"
                  >
                    {goal.completed ? 'Reopen Goal' : 'Mark Goal Completed'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Goal Modal */}
      <ModalShell
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingGoal ? 'Edit Goal' : 'Create Goal'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-os-primary dark:text-slate-300 mb-1.5">
              Goal Title
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Master Data Structures & Algorithms"
              className="w-full min-h-[44px] px-3.5 rounded-xl border border-os-border-strong dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-os-ink dark:text-slate-100"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-os-primary dark:text-slate-300 mb-1.5">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as GoalCategory)}
                className="w-full min-h-[44px] px-3.5 rounded-xl border border-os-border-strong dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-os-ink dark:text-slate-100"
              >
                <option value="personal">Personal</option>
                <option value="professional">Professional</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-os-primary dark:text-slate-300 mb-1.5">
                Target Deadline
              </label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full min-h-[44px] px-3.5 rounded-xl border border-os-border-strong dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-os-ink dark:text-slate-100"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-os-primary dark:text-slate-300 mb-1.5">
              Description (optional)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Why does this goal matter?"
              className="w-full p-3 rounded-xl border border-os-border-strong dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-os-ink dark:text-slate-100"
            />
          </div>

          {/* Milestones Builder */}
          <div>
            <label className="block text-xs font-semibold text-os-primary dark:text-slate-300 mb-1.5">
              Milestones
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newMilestoneTitle}
                onChange={(e) => setNewMilestoneTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addDraftMilestone();
                  }
                }}
                placeholder="Add a smaller milestone step"
                className="flex-1 min-h-[44px] px-3.5 rounded-xl border border-os-border-strong dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-os-ink dark:text-slate-100"
              />
              <button
                type="button"
                onClick={addDraftMilestone}
                className="min-h-[44px] px-4 rounded-xl bg-os-surface-soft dark:bg-slate-800 text-xs font-semibold text-os-ink-secondary dark:text-slate-200"
              >
                Add
              </button>
            </div>
            {milestones.length > 0 && (
              <div className="mt-2 space-y-1.5">
                {milestones.map((m) => (
                  <div
                    key={m.id}
                    className="px-3 py-2 rounded-lg bg-[#F6FAFC] dark:bg-slate-800 border border-[#E2EDF2] dark:border-slate-700 flex items-center justify-between gap-2 text-xs"
                  >
                    <span className="truncate text-os-ink dark:text-slate-100">{m.title}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setMilestones((prev) => prev.filter((item) => item.id !== m.id))
                      }
                      className="text-os-muted hover:text-rose-600 p-1"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
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
              {editingGoal ? 'Save Changes' : 'Create Goal'}
            </button>
          </div>
        </form>
      </ModalShell>
    </div>
  );
}
