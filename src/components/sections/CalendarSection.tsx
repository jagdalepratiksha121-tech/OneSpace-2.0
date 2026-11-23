import React, {useMemo, useState} from 'react';
import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Edit2,
  Plus,
  Trash2,
} from 'lucide-react';
import {useApp} from '../../context/AppContext';
import {formatDisplayDate, formatShortDate, toISODate} from '../../lib/platform';
import type {CalendarEvent, CalendarEventType} from '../../types/onespace';
import {EmptyState, ModalShell} from '../ui/CommonUI';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function CalendarSection() {
  const {data, addEvent, updateEvent, deleteEvent, toggleTask, requestConfirm} = useApp();
  const today = toISODate();

  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
  const [cursorDate, setCursorDate] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(today);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);

  // Event form state
  const [title, setTitle] = useState('');
  const [eventDate, setEventDate] = useState(selectedDate);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [type, setType] = useState<CalendarEventType>('event');
  const [description, setDescription] = useState('');

  const openNewEvent = (dateOverride?: string) => {
    setEditingEvent(null);
    setTitle('');
    setEventDate(dateOverride ?? selectedDate);
    setStartTime('09:00');
    setEndTime('10:00');
    setType('event');
    setDescription('');
    setModalOpen(true);
  };

  const openEditEvent = (evt: CalendarEvent) => {
    setEditingEvent(evt);
    setTitle(evt.title);
    setEventDate(evt.date);
    setStartTime(evt.startTime);
    setEndTime(evt.endTime);
    setType(evt.type);
    setDescription(evt.description);
    setModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    if (editingEvent) {
      updateEvent(editingEvent.id, {
        title: title.trim(),
        date: eventDate,
        startTime,
        endTime,
        type,
        description: description.trim(),
      });
    } else {
      addEvent({
        title: title.trim(),
        date: eventDate,
        startTime,
        endTime,
        type,
        description: description.trim(),
      });
    }
    setSelectedDate(eventDate);
    setModalOpen(false);
  };

  const navigatePeriod = (dir: -1 | 1) => {
    const next = new Date(cursorDate);
    if (viewMode === 'month') {
      next.setMonth(next.getMonth() + dir);
    } else {
      next.setDate(next.getDate() + dir * 7);
    }
    setCursorDate(next);
  };

  // Calendar grid dates
  const calendarDays = useMemo(() => {
    if (viewMode === 'month') {
      const year = cursorDate.getFullYear();
      const month = cursorDate.getMonth();
      const firstDay = new Date(year, month, 1);
      const startOffset = firstDay.getDay();
      const startDate = new Date(year, month, 1 - startOffset);
      const cells: {iso: string; day: number; inMonth: boolean}[] = [];
      for (let i = 0; i < 42; i++) {
        const d = new Date(startDate);
        d.setDate(startDate.getDate() + i);
        cells.push({
          iso: toISODate(d),
          day: d.getDate(),
          inMonth: d.getMonth() === month,
        });
      }
      return cells;
    }

    // Weekly view (Sun - Sat containing cursorDate)
    const startOfWeek = new Date(cursorDate);
    startOfWeek.setDate(cursorDate.getDate() - cursorDate.getDay());
    const cells: {iso: string; day: number; inMonth: boolean}[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      cells.push({
        iso: toISODate(d),
        day: d.getDate(),
        inMonth: true,
      });
    }
    return cells;
  }, [cursorDate, viewMode]);

  const periodLabel =
    viewMode === 'month'
      ? cursorDate.toLocaleDateString('en-US', {month: 'long', year: 'numeric'})
      : `Week of ${formatShortDate(calendarDays[0].iso)} – ${formatShortDate(calendarDays[6].iso)}`;

  const selectedDayEvents = useMemo(
    () =>
      data.events
        .filter((e) => e.date === selectedDate)
        .sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [data.events, selectedDate]
  );

  const selectedDayTasks = useMemo(
    () => data.tasks.filter((t) => t.dueDate === selectedDate),
    [data.tasks, selectedDate]
  );

  const upcomingEvents = useMemo(
    () =>
      data.events
        .filter((e) => e.date >= today)
        .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime)),
    [data.events, today]
  );

  return (
    <div className="space-y-4">
      {/* Header Controls */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-os-border dark:border-slate-800 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigatePeriod(-1)}
            aria-label="Previous period"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border border-os-border-strong dark:border-slate-700 hover:bg-os-surface-soft dark:hover:bg-slate-800"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <h2 className="text-base font-display font-bold text-os-ink dark:text-slate-100 min-w-[160px] text-center">
            {periodLabel}
          </h2>
          <button
            type="button"
            onClick={() => navigatePeriod(1)}
            aria-label="Next period"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border border-os-border-strong dark:border-slate-700 hover:bg-os-surface-soft dark:hover:bg-slate-800"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex p-1 rounded-xl bg-os-surface-soft dark:bg-slate-800">
            {(['month', 'week'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setViewMode(mode)}
                className={`min-h-[36px] px-3 rounded-lg text-xs font-semibold capitalize ${
                  viewMode === mode
                    ? 'bg-white dark:bg-slate-900 text-os-ink dark:text-white shadow-sm'
                    : 'text-os-muted dark:text-slate-400'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => {
              setCursorDate(new Date());
              setSelectedDate(today);
            }}
            className="min-h-[42px] px-3.5 rounded-xl border border-os-border-strong dark:border-slate-700 text-xs font-semibold text-os-ink-secondary dark:text-slate-200 hover:bg-os-surface-soft dark:hover:bg-slate-800"
          >
            Today
          </button>

          <button
            type="button"
            onClick={() => openNewEvent(selectedDate)}
            className="min-h-[44px] px-4 rounded-xl bg-os-primary hover:bg-os-primary-hover text-white text-xs font-semibold inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Add Event</span>
          </button>
        </div>
      </div>

      {/* Main Calendar Grid + Selected Day Agenda */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.55fr_1fr] gap-4 items-start">
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-os-border dark:border-slate-800 p-3 sm:p-4">
          <div className="grid grid-cols-7 gap-1 mb-2">
            {WEEKDAYS.map((wd) => (
              <div
                key={wd}
                className="text-center text-[11px] font-semibold text-os-muted dark:text-slate-400 py-1"
              >
                {wd}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((cell) => {
              const dayEvents = data.events.filter((e) => e.date === cell.iso);
              const dayTasks = data.tasks.filter((t) => t.dueDate === cell.iso);
              const isSelected = cell.iso === selectedDate;
              const isToday = cell.iso === today;

              return (
                <button
                  key={cell.iso}
                  type="button"
                  onClick={() => setSelectedDate(cell.iso)}
                  className={`min-h-[56px] sm:min-h-[76px] p-1.5 rounded-xl border text-left flex flex-col justify-between transition-colors ${
                    isSelected
                      ? 'bg-os-primary text-white border-os-primary'
                      : isToday
                        ? 'bg-[#EFF8F4] dark:bg-emerald-950/30 border-[#9AD0B7] dark:border-emerald-800 text-os-ink dark:text-slate-100'
                        : cell.inMonth
                          ? 'bg-white dark:bg-slate-900 border-[#E7F0F5] dark:border-slate-800 hover:bg-[#F5FAFC] dark:hover:bg-slate-800 text-os-ink dark:text-slate-200'
                          : 'bg-[#F8FBFD] dark:bg-slate-950/50 border-transparent text-[#96AFBC] dark:text-slate-600'
                  }`}
                >
                  <span className="text-xs font-mono-num font-semibold">{cell.day}</span>
                  {(dayEvents.length > 0 || dayTasks.length > 0) && (
                    <div className="space-y-0.5 w-full overflow-hidden">
                      {dayEvents.slice(0, 1).map((ev) => (
                        <p
                          key={ev.id}
                          className={`text-[10px] truncate px-1 rounded ${
                            isSelected
                              ? 'bg-white/20 text-white'
                              : ev.type === 'important'
                                ? 'bg-[#F9E7DB] text-[#7A4322] dark:bg-amber-900/50 dark:text-amber-200'
                                : 'bg-[#DFEEF5] text-os-ink-secondary dark:bg-sky-900/50 dark:text-sky-200'
                          }`}
                        >
                          {ev.title}
                        </p>
                      ))}
                      {dayEvents.length + dayTasks.length > 1 && (
                        <p
                          className={`text-[9px] font-medium px-1 ${
                            isSelected ? 'text-[#CBE0EA]' : 'text-os-muted dark:text-slate-400'
                          }`}
                        >
                          +{dayEvents.length + dayTasks.length - 1} more
                        </p>
                      )}
                      {dayEvents.length === 0 && dayTasks.length > 0 && (
                        <p
                          className={`text-[10px] truncate px-1 rounded ${
                            isSelected
                              ? 'bg-white/20 text-white'
                              : 'bg-[#E4F4EC] text-[#1F5441] dark:bg-emerald-900/50 dark:text-emerald-200'
                          }`}
                        >
                          {dayTasks.length} task{dayTasks.length > 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Side: Selected Day Agenda + Upcoming List */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-os-border dark:border-slate-800 p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-display font-bold text-os-ink dark:text-slate-100">
                  {selectedDate === today ? 'Today' : formatDisplayDate(selectedDate)}
                </h3>
                <p className="text-[11px] text-os-muted dark:text-slate-400">
                  {selectedDayEvents.length} events · {selectedDayTasks.length} tasks due
                </p>
              </div>
              <button
                type="button"
                onClick={() => openNewEvent(selectedDate)}
                className="min-h-[38px] px-3 rounded-xl bg-os-surface-soft dark:bg-slate-800 text-xs font-semibold text-os-ink-secondary dark:text-sky-300"
              >
                + Event
              </button>
            </div>

            {selectedDayEvents.length === 0 && selectedDayTasks.length === 0 ? (
              <EmptyState
                icon={CalendarDays}
                title="Nothing scheduled"
                description="Add an event, important date, or reminder for this day."
                actionLabel="Add Event"
                onAction={() => openNewEvent(selectedDate)}
              />
            ) : (
              <div className="space-y-2.5">
                {selectedDayEvents.map((evt) => (
                  <div
                    key={evt.id}
                    className="p-3 rounded-xl border border-[#E3EFF5] dark:border-slate-800 bg-[#F9FCFD] dark:bg-slate-800/40 flex items-start justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-os-ink dark:text-slate-100">
                        {evt.title}
                      </p>
                      <p className="text-[11px] text-os-muted dark:text-slate-400 mt-0.5 flex items-center gap-1.5">
                        <Clock className="w-3 h-3" />
                        <span>
                          {evt.startTime
                            ? `${evt.startTime}${evt.endTime ? ` – ${evt.endTime}` : ''}`
                            : 'All day'}
                        </span>
                        <span>·</span>
                        <span className="capitalize">{evt.type}</span>
                      </p>
                      {evt.description && (
                        <p className="text-xs text-os-muted dark:text-slate-300 mt-1">
                          {evt.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center shrink-0">
                      <button
                        type="button"
                        onClick={() => openEditEvent(evt)}
                        aria-label="Edit event"
                        className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-os-muted hover:text-os-primary"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          requestConfirm({
                            title: 'Delete Event',
                            message: `Remove "${evt.title}" from your calendar?`,
                            onConfirm: () => deleteEvent(evt.id),
                          })
                        }
                        aria-label="Delete event"
                        className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-os-muted hover:text-rose-600"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}

                {selectedDayTasks.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => toggleTask(t.id)}
                    className="w-full p-3 rounded-xl border border-[#DCEEE5] dark:border-emerald-900/50 bg-[#F3FAF6] dark:bg-emerald-950/20 flex items-center gap-2.5 text-left"
                  >
                    <CheckCircle2
                      className={`w-4 h-4 shrink-0 ${
                        t.completed ? 'text-[#4C8B74]' : 'text-[#89A5B2]'
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-xs font-semibold truncate ${
                          t.completed
                            ? 'line-through text-os-muted'
                            : 'text-os-ink dark:text-slate-100'
                        }`}
                      >
                        {t.title}
                      </p>
                      <p className="text-[11px] text-os-muted dark:text-slate-400">
                        Task Due · {t.category}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl border border-os-border dark:border-slate-800 p-4">
            <h3 className="text-sm font-display font-bold text-os-ink dark:text-slate-100 mb-3">
              All Upcoming Events
            </h3>
            {upcomingEvents.length === 0 ? (
              <p className="text-xs text-os-muted dark:text-slate-400">
                No upcoming events scheduled.
              </p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {upcomingEvents.map((ev) => (
                  <button
                    key={ev.id}
                    type="button"
                    onClick={() => setSelectedDate(ev.date)}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-os-surface-soft dark:hover:bg-slate-800 border border-[#E9F2F6] dark:border-slate-800 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-os-ink dark:text-slate-100 truncate">
                        {ev.title}
                      </p>
                      <p className="text-[11px] text-os-muted dark:text-slate-400 capitalize">
                        {ev.type}
                        {ev.startTime ? ` · ${ev.startTime}` : ''}
                      </p>
                    </div>
                    <span className="text-[11px] font-mono-num text-os-primary dark:text-sky-300 shrink-0">
                      {formatShortDate(ev.date)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add / Edit Event Modal */}
      <ModalShell
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingEvent ? 'Edit Event' : 'Add Calendar Event'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-os-primary dark:text-slate-300 mb-1.5">
              Title
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Project Deadline or Doctor Appointment"
              className="w-full min-h-[44px] px-3.5 rounded-xl border border-os-border-strong dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-os-ink dark:text-slate-100"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-os-primary dark:text-slate-300 mb-1.5">
                Date
              </label>
              <input
                type="date"
                required
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="w-full min-h-[44px] px-3.5 rounded-xl border border-os-border-strong dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-os-ink dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-os-primary dark:text-slate-300 mb-1.5">
                Type
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as CalendarEventType)}
                className="w-full min-h-[44px] px-3.5 rounded-xl border border-os-border-strong dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-os-ink dark:text-slate-100"
              >
                <option value="event">Event</option>
                <option value="reminder">Reminder</option>
                <option value="important">Important Date</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-os-primary dark:text-slate-300 mb-1.5">
                Start Time
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full min-h-[44px] px-3.5 rounded-xl border border-os-border-strong dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-os-ink dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-os-primary dark:text-slate-300 mb-1.5">
                End Time
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full min-h-[44px] px-3.5 rounded-xl border border-os-border-strong dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-os-ink dark:text-slate-100"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-os-primary dark:text-slate-300 mb-1.5">
              Notes (optional)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Location, link, or reminder details..."
              className="w-full p-3 rounded-xl border border-os-border-strong dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-os-ink dark:text-slate-100"
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
              {editingEvent ? 'Save Changes' : 'Save Event'}
            </button>
          </div>
        </form>
      </ModalShell>
    </div>
  );
}
