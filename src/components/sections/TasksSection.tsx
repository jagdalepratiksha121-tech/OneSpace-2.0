import React, {useMemo, useState} from 'react';
import {
  CheckCircle2,
  Circle,
  Edit2,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import {useApp} from '../../context/AppContext';
import {formatDisplayDate, toISODate} from '../../lib/platform';
import type {Task, TaskPriority} from '../../types/onespace';
import {EmptyState, ModalShell} from '../ui/CommonUI';

export function TasksSection() {
  const {
    data,
    globalSearch,
    addTask,
    updateTask,
    toggleTask,
    deleteTask,
    addTaskCategory,
    requestConfirm,
  } = useApp();

  const [statusFilter, setStatusFilter] = useState<'pending' | 'completed' | 'all'>('pending');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [localSearch, setLocalSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState(toISODate());
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [category, setCategory] = useState(data.taskCategories[0] ?? 'Personal');
  const [newCategory, setNewCategory] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const openCreateModal = () => {
    setEditingTask(null);
    setTitle('');
    setDescription('');
    setDueDate(toISODate());
    setPriority('medium');
    setCategory(data.taskCategories[0] ?? 'Personal');
    setNewCategory('');
    setFormError(null);
    setModalOpen(true);
  };

  const openEditModal = (task: Task) => {
    setEditingTask(task);
    setTitle(task.title);
    setDescription(task.description);
    setDueDate(task.dueDate);
    setPriority(task.priority);
    setCategory(task.category);
    setNewCategory('');
    setFormError(null);
    setModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim().length < 2) {
      setFormError('Please enter a task title.');
      return;
    }
    const finalCat = newCategory.trim() || category;
    if (newCategory.trim()) {
      addTaskCategory(newCategory.trim());
    }

    if (editingTask) {
      updateTask(editingTask.id, {
        title: title.trim(),
        description: description.trim(),
        dueDate,
        priority,
        category: finalCat,
      });
    } else {
      addTask({
        title: title.trim(),
        description: description.trim(),
        dueDate,
        priority,
        category: finalCat,
      });
    }
    setModalOpen(false);
  };

  const query = (localSearch || globalSearch).trim().toLowerCase();

  const filteredTasks = useMemo(() => {
    return data.tasks
      .filter((t) => {
        if (statusFilter === 'pending' && t.completed) return false;
        if (statusFilter === 'completed' && !t.completed) return false;
        if (categoryFilter !== 'All' && t.category !== categoryFilter) return false;
        if (
          query &&
          !t.title.toLowerCase().includes(query) &&
          !t.description.toLowerCase().includes(query) &&
          !t.category.toLowerCase().includes(query)
        ) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
        return b.createdAt.localeCompare(a.createdAt);
      });
  }, [data.tasks, statusFilter, categoryFilter, query]);

  const pendingCount = data.tasks.filter((t) => !t.completed).length;
  const completedCount = data.tasks.filter((t) => t.completed).length;

  return (
    <div className="space-y-4">
      {/* Header Toolbar */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-os-border dark:border-slate-800 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-display font-bold text-os-ink dark:text-slate-100">
            Tasks & Action Items
          </h2>
          <p className="text-xs text-os-muted dark:text-slate-400 mt-0.5">
            {pendingCount} pending · {completedCount} completed
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="min-h-[44px] px-4 py-2 rounded-xl bg-os-primary hover:bg-os-primary-hover text-white text-xs font-semibold inline-flex items-center justify-center gap-2 transition-colors whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>New Task</span>
        </button>
      </div>

      {/* Filters Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-os-border dark:border-slate-800 p-3.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex p-1 rounded-xl bg-os-surface-soft dark:bg-slate-800">
            {(['pending', 'completed', 'all'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setStatusFilter(tab)}
                className={`min-h-[36px] px-3 rounded-lg text-xs font-semibold capitalize transition-colors ${
                  statusFilter === tab
                    ? 'bg-white dark:bg-slate-900 text-os-ink dark:text-white shadow-sm'
                    : 'text-os-muted dark:text-slate-400 hover:text-os-ink'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            aria-label="Filter by category"
            className="min-h-[40px] px-3 rounded-xl border border-os-border-strong dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-os-ink-secondary dark:text-slate-200"
          >
            <option value="All">All Categories</option>
            {data.taskCategories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        <div className="relative w-full lg:w-64">
          <Search className="w-3.5 h-3.5 text-os-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="Filter tasks..."
            className="w-full min-h-[40px] pl-9 pr-3 rounded-xl border border-os-border-strong dark:border-slate-700 bg-os-surface-soft dark:bg-slate-800 text-xs text-os-ink dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-os-primary/25"
          />
        </div>
      </div>

      {/* Task List */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-os-border dark:border-slate-800 p-4">
        {filteredTasks.length === 0 ? (
          <EmptyState
            icon={CheckCircle2}
            title={
              data.tasks.length === 0
                ? 'No tasks added yet'
                : 'No tasks match your current filters'
            }
            description="Organize your daily priorities by creating a task with a due date and category."
            actionLabel="Create First Task"
            onAction={openCreateModal}
          />
        ) : (
          <div className="divide-y divide-os-surface-soft dark:divide-slate-800">
            {filteredTasks.map((task) => {
              const priorityLabel =
                task.priority === 'high'
                  ? 'High priority'
                  : task.priority === 'medium'
                    ? 'Medium priority'
                    : 'Low priority';
              const priorityColor =
                task.priority === 'high'
                  ? 'text-rose-700 dark:text-rose-400'
                  : task.priority === 'medium'
                    ? 'text-amber-700 dark:text-amber-400'
                    : 'text-[#4C8B74] dark:text-emerald-400';

              return (
                <div
                  key={task.id}
                  className="py-3 first:pt-1 last:pb-1 flex items-start justify-between gap-3"
                >
                  <button
                    type="button"
                    onClick={() => toggleTask(task.id)}
                    aria-label={task.completed ? 'Mark task pending' : 'Mark task completed'}
                    className="min-h-[44px] min-w-[44px] -ml-2 flex items-center justify-center shrink-0 text-os-accent-mid hover:text-os-primary"
                  >
                    {task.completed ? (
                      <CheckCircle2 className="w-5 h-5 text-[#4C8B74]" />
                    ) : (
                      <Circle className="w-5 h-5" />
                    )}
                  </button>

                  <div className="flex-1 min-w-0 py-1">
                    <p
                      className={`text-sm font-semibold leading-snug ${
                        task.completed
                          ? 'line-through text-os-muted dark:text-slate-500'
                          : 'text-os-ink dark:text-slate-100'
                      }`}
                    >
                      {task.title}
                    </p>
                    {task.description && (
                      <p className="text-xs text-os-muted dark:text-slate-400 mt-1 leading-relaxed">
                        {task.description}
                      </p>
                    )}
                    <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-os-muted dark:text-slate-400">
                      <span>{task.category}</span>
                      <span aria-hidden="true">·</span>
                      <span className={`font-medium ${priorityColor}`}>{priorityLabel}</span>
                      {task.dueDate && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono-num">
                            Due {formatDisplayDate(task.dueDate)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => openEditModal(task)}
                      aria-label="Edit task"
                      className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-os-muted hover:text-os-primary hover:bg-os-surface-soft dark:hover:bg-slate-800"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        requestConfirm({
                          title: 'Delete Task',
                          message: `Are you sure you want to delete "${task.title}"?`,
                          onConfirm: () => deleteTask(task.id),
                        })
                      }
                      aria-label="Delete task"
                      className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-os-muted hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
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

      {/* Add / Edit Task Modal */}
      <ModalShell
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingTask ? 'Edit Task' : 'Create New Task'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300">
              {formError}
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-os-primary dark:text-slate-300 mb-1.5">
              Task Title
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Submit assignment PDF"
              className="w-full min-h-[44px] px-3.5 rounded-xl border border-os-border-strong dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-os-ink dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-os-primary dark:text-slate-300 mb-1.5">
              Description (optional)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add helpful context or checklist notes..."
              className="w-full p-3 rounded-xl border border-os-border-strong dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-os-ink dark:text-slate-100"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-os-primary dark:text-slate-300 mb-1.5">
                Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full min-h-[44px] px-3.5 rounded-xl border border-os-border-strong dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-os-ink dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-os-primary dark:text-slate-300 mb-1.5">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="w-full min-h-[44px] px-3.5 rounded-xl border border-os-border-strong dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-os-ink dark:text-slate-100"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>

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
                {data.taskCategories.map((c) => (
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
                placeholder="e.g. College"
                className="w-full min-h-[44px] px-3.5 rounded-xl border border-os-border-strong dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-os-ink dark:text-slate-100"
              />
            </div>
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
              {editingTask ? 'Save Changes' : 'Create Task'}
            </button>
          </div>
        </form>
      </ModalShell>
    </div>
  );
}
