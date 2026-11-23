import React, {useEffect, useMemo, useState} from 'react';
import {
  Bell,
  CalendarDays,
  CheckSquare,
  Flame,
  FolderOpen,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Palette,
  Search,
  Settings,
  Sun,
  Target,
  Wallet,
  X,
} from 'lucide-react';
import {useApp} from '../../context/AppContext';
import {formatShortDate, toISODate} from '../../lib/platform';
import type {AppSection} from '../../types/onespace';
import {ModalShell, UserAvatar} from '../ui/CommonUI';
import {ThemeColorPicker} from '../ui/ThemeColorPicker';

interface NavItem {
  id: AppSection;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{className?: string}>;
}

export const NAV_ITEMS: NavItem[] = [
  {id: 'home', label: 'Dashboard', shortLabel: 'Home', icon: LayoutDashboard},
  {id: 'tasks', label: 'Tasks', shortLabel: 'Tasks', icon: CheckSquare},
  {id: 'calendar', label: 'Calendar', shortLabel: 'Calendar', icon: CalendarDays},
  {id: 'habits', label: 'Habits', shortLabel: 'Habits', icon: Flame},
  {id: 'finance', label: 'Finance', shortLabel: 'Finance', icon: Wallet},
  {id: 'goals', label: 'Goals', shortLabel: 'Goals', icon: Target},
  {id: 'myspace', label: 'My Space', shortLabel: 'My Space', icon: FolderOpen},
  {id: 'profile', label: 'Profile & Settings', shortLabel: 'Settings', icon: Settings},
];

const MOBILE_PRIMARY_TABS: AppSection[] = ['home', 'tasks', 'calendar', 'myspace'];

export function AppShell({children}: {children: React.ReactNode}) {
  const {
    user,
    data,
    activeSection,
    setActiveSection,
    globalSearch,
    setGlobalSearch,
    toggleTheme,
    logout,
  } = useApp();

  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [colorModalOpen, setColorModalOpen] = useState(false);

  // Prevent background page scrolling while the mobile menu sheet is open
  useEffect(() => {
    if (!mobileMoreOpen) return;
    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
    };
  }, [mobileMoreOpen]);

  const firstName = user?.fullName.trim().split(/\s+/)[0] || 'Friend';
  const today = toISODate();

  // Real notifications derived from user's actual tasks & upcoming events
  const notifications = useMemo(() => {
    const items: {id: string; title: string; subtitle: string; section: AppSection}[] = [];

    data.tasks
      .filter((t) => !t.completed && t.dueDate && t.dueDate <= today)
      .slice(0, 4)
      .forEach((t) => {
        items.push({
          id: `nt_${t.id}`,
          title: t.title,
          subtitle: t.dueDate < today ? `Overdue (${formatShortDate(t.dueDate)})` : 'Due today',
          section: 'tasks',
        });
      });

    data.events
      .filter((e) => e.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 4)
      .forEach((e) => {
        items.push({
          id: `ne_${e.id}`,
          title: e.title,
          subtitle: `${e.date === today ? 'Today' : formatShortDate(e.date)}${
            e.startTime ? ` · ${e.startTime}` : ''
          }`,
          section: 'calendar',
        });
      });

    return items;
  }, [data.tasks, data.events, today]);

  // Quick live search results across user's real items
  const searchResults = useMemo(() => {
    const q = globalSearch.trim().toLowerCase();
    if (!q) return [];
    const results: {id: string; title: string; type: string; section: AppSection}[] = [];

    data.tasks
      .filter((t) => t.title.toLowerCase().includes(q) || t.category.toLowerCase().includes(q))
      .slice(0, 3)
      .forEach((t) =>
        results.push({id: t.id, title: t.title, type: `Task · ${t.category}`, section: 'tasks'})
      );

    data.events
      .filter((e) => e.title.toLowerCase().includes(q))
      .slice(0, 2)
      .forEach((e) =>
        results.push({
          id: e.id,
          title: e.title,
          type: `Event · ${formatShortDate(e.date)}`,
          section: 'calendar',
        })
      );

    data.goals
      .filter((g) => g.title.toLowerCase().includes(q))
      .slice(0, 2)
      .forEach((g) =>
        results.push({id: g.id, title: g.title, type: 'Goal', section: 'goals'})
      );

    data.spaceItems
      .filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          s.tags.some((tag) => tag.toLowerCase().includes(q))
      )
      .slice(0, 4)
      .forEach((s) =>
        results.push({
          id: s.id,
          title: s.title,
          type: `My Space · ${s.itemType}`,
          section: 'myspace',
        })
      );

    return results.slice(0, 8);
  }, [globalSearch, data.tasks, data.events, data.goals, data.spaceItems]);

  const activeNav = NAV_ITEMS.find((n) => n.id === activeSection) ?? NAV_ITEMS[0];

  const handleSelectSection = (section: AppSection) => {
    setActiveSection(section);
    setMobileMoreOpen(false);
    setNotifOpen(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-os-frame-from via-os-frame-via to-os-frame-to dark:from-[#09131A] dark:via-[#0D1A24] dark:to-[#081017] md:p-4 lg:p-6 flex flex-col">
      {/* Main Elevated Application Frame */}
      <div className="flex-1 w-full max-w-[1400px] mx-auto bg-os-canvas dark:bg-slate-950 md:rounded-2xl md:border md:border-os-border-strong/80 dark:md:border-slate-800 md:shadow-2xl flex flex-col md:flex-row overflow-hidden">
        {/* Desktop Left Sidebar */}
        <aside className="hidden md:flex md:w-[236px] lg:w-[248px] shrink-0 bg-os-primary dark:bg-os-sidebar-dark text-white flex-col justify-between py-6 select-none transition-colors">
          <div>
            {/* Profile Header in Sidebar */}
            <div className="px-4 pb-6 flex flex-col items-center text-center">
              <button
                type="button"
                onClick={() => handleSelectSection('profile')}
                className="group focus:outline-none"
                title="View Profile & Settings"
              >
                <UserAvatar
                  name={user?.fullName ?? 'OneSpace User'}
                  avatarDataUrl={user?.avatarDataUrl}
                  size="lg"
                  className="mx-auto transition-transform group-hover:scale-105"
                />
              </button>
              <p className="mt-3 text-sm font-display font-bold text-white truncate max-w-full px-2">
                {user?.fullName || 'OneSpace User'}
              </p>
              <p className="text-[11px] text-os-sidebar-muted truncate max-w-full px-2 mt-0.5">
                {user?.email}
              </p>
            </div>

            {/* Sidebar Navigation with flush-right active white pill tab */}
            <nav aria-label="Primary Navigation" className="space-y-1 pl-3">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectSection(item.id)}
                    className={`w-full min-h-[44px] flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-l-full transition-colors whitespace-nowrap ${
                      isActive
                        ? 'bg-os-canvas dark:bg-slate-950 text-os-ink dark:text-sky-200 font-semibold shadow-sm'
                        : 'text-os-sidebar-text hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <Icon className="w-[18px] h-[18px] shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="px-4 pt-4">
            <button
              type="button"
              onClick={logout}
              className="w-full min-h-[44px] flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-os-sidebar-text hover:bg-white/10 hover:text-white transition-colors"
            >
              <LogOut className="w-[18px] h-[18px] shrink-0" />
              <span>Logout</span>
            </button>
          </div>
        </aside>

        {/* Right Main Viewport */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Desktop Header Bar */}
          <header className="hidden md:flex items-center justify-between gap-4 px-6 py-3.5 bg-white dark:bg-slate-900 border-b border-os-border dark:border-slate-800 shrink-0">
            <div className="min-w-0">
              <h1 className="text-lg font-display font-bold text-os-ink dark:text-slate-100 truncate">
                {activeSection === 'home' ? `Welcome ${firstName} !` : activeNav.label}
              </h1>
              {user?.isPreviewAccount && (
                <p className="text-[11px] text-[#4C8B74] dark:text-emerald-400 font-medium">
                  Sample Preview Workspace · Separate from real user accounts
                </p>
              )}
            </div>

            <div className="flex items-center gap-3 shrink-0">
              {/* Search Box matching reference screenshot */}
              <div className="relative">
                <div className="flex items-center h-9 w-64 lg:w-72 rounded-full border border-os-border-strong dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden focus-within:ring-2 focus-within:ring-os-primary/25">
                  <input
                    type="search"
                    value={globalSearch}
                    onChange={(e) => setGlobalSearch(e.target.value)}
                    placeholder="Search tasks, files, notes..."
                    className="flex-1 h-full px-4 text-xs bg-transparent text-os-ink dark:text-slate-100 placeholder:text-os-muted focus:outline-none"
                  />
                  <span className="h-full px-3 bg-os-surface-soft dark:bg-slate-700 border-l border-os-border-strong dark:border-slate-600 flex items-center justify-center text-[#34596B] dark:text-slate-200">
                    <Search className="w-3.5 h-3.5" />
                  </span>
                </div>

                {globalSearch.trim().length > 0 && (
                  <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-900 border border-os-border-strong dark:border-slate-700 rounded-xl shadow-xl z-40 overflow-hidden">
                    <div className="px-3.5 py-2 border-b border-os-surface-soft dark:border-slate-800 flex items-center justify-between text-[11px] font-semibold text-os-muted">
                      <span>Quick Matches</span>
                      <button
                        type="button"
                        onClick={() => setGlobalSearch('')}
                        className="hover:text-os-ink dark:hover:text-white"
                      >
                        Clear
                      </button>
                    </div>
                    {searchResults.length === 0 ? (
                      <p className="p-4 text-xs text-os-muted text-center">
                        No matching items found.
                      </p>
                    ) : (
                      <div className="max-h-64 overflow-y-auto divide-y divide-os-surface-soft dark:divide-slate-800">
                        {searchResults.map((res) => (
                          <button
                            key={res.id}
                            type="button"
                            onClick={() => {
                              setActiveSection(res.section);
                              if (res.section !== 'myspace' && res.section !== 'tasks') {
                                setGlobalSearch('');
                              }
                            }}
                            className="w-full text-left px-3.5 py-2.5 hover:bg-[#F3F8FA] dark:hover:bg-slate-800 transition-colors"
                          >
                            <p className="text-xs font-semibold text-os-ink dark:text-slate-100 truncate">
                              {res.title}
                            </p>
                            <p className="text-[11px] text-os-muted dark:text-slate-400">
                              {res.type}
                            </p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* App Colors Button */}
              <button
                type="button"
                onClick={() => setColorModalOpen(true)}
                aria-label="Change app colors"
                title="Change app colors"
                className="w-10 h-10 rounded-full border border-os-border-strong dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-center text-os-primary dark:text-slate-200 hover:bg-os-surface-soft dark:hover:bg-slate-700 transition-colors"
              >
                <Palette className="w-4 h-4" />
              </button>

              {/* Pill Theme Switch */}
              <button
                type="button"
                onClick={toggleTheme}
                aria-label="Toggle light or dark theme"
                className="relative w-14 h-8 rounded-full bg-os-primary dark:bg-slate-700 p-1 flex items-center justify-between transition-colors"
              >
                <span
                  className={`w-6 h-6 rounded-full bg-white text-os-primary flex items-center justify-center shadow transition-transform ${
                    user?.theme === 'dark' ? 'translate-x-6' : 'translate-x-0'
                  }`}
                >
                  {user?.theme === 'dark' ? (
                    <Moon className="w-3.5 h-3.5" />
                  ) : (
                    <Sun className="w-3.5 h-3.5" />
                  )}
                </span>
              </button>

              {/* Notifications Button */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setNotifOpen((prev) => !prev)}
                  aria-label="Open reminders and notifications"
                  className="relative w-10 h-10 rounded-full border border-os-border-strong dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-center text-os-primary dark:text-slate-200 hover:bg-os-surface-soft dark:hover:bg-slate-700 transition-colors"
                >
                  <Bell className="w-4 h-4" />
                  {notifications.length > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#C5885B] text-white text-[10px] font-bold flex items-center justify-center">
                      {notifications.length}
                    </span>
                  )}
                </button>

                {notifOpen && (
                  <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-900 border border-os-border-strong dark:border-slate-700 rounded-xl shadow-xl z-40 overflow-hidden">
                    <div className="px-4 py-2.5 border-b border-os-surface-soft dark:border-slate-800 flex items-center justify-between">
                      <span className="text-xs font-display font-bold text-os-ink dark:text-slate-100">
                        Reminders & Due Items
                      </span>
                      <button
                        type="button"
                        onClick={() => setNotifOpen(false)}
                        className="text-xs text-os-muted hover:text-os-ink"
                      >
                        Close
                      </button>
                    </div>
                    {notifications.length === 0 ? (
                      <p className="p-4 text-xs text-os-muted dark:text-slate-400 text-center">
                        You are all caught up. No due tasks or upcoming events.
                      </p>
                    ) : (
                      <div className="max-h-72 overflow-y-auto divide-y divide-os-surface-soft dark:divide-slate-800">
                        {notifications.map((n) => (
                          <button
                            key={n.id}
                            type="button"
                            onClick={() => handleSelectSection(n.section)}
                            className="w-full text-left px-4 py-3 hover:bg-os-surface-soft dark:hover:bg-slate-800 transition-colors"
                          >
                            <p className="text-xs font-semibold text-os-ink dark:text-slate-100 truncate">
                              {n.title}
                            </p>
                            <p className="text-[11px] text-os-muted dark:text-slate-400 mt-0.5">
                              {n.subtitle}
                            </p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* Mobile Sticky Top App Bar (compact <= 54px + Android safe top) */}
          <header className="md:hidden sticky top-0 z-30 bg-os-primary dark:bg-os-sidebar-dark text-white pt-safe shadow-sm transition-colors">
            <div className="h-[52px] px-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <button
                  type="button"
                  onClick={() => setMobileMoreOpen(true)}
                  aria-label="Open navigation menu"
                  className="min-h-[44px] min-w-[44px] -ml-1 flex items-center justify-center rounded-xl hover:bg-white/10"
                >
                  <Menu className="w-5 h-5" />
                </button>
                <div className="min-w-0">
                  <h1 className="text-sm font-display font-bold truncate">
                    {activeSection === 'home' ? `Hi, ${firstName}` : activeNav.label}
                  </h1>
                </div>
              </div>

              <div className="flex items-center gap-0.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setMobileSearchOpen((v) => !v)}
                  aria-label="Search"
                  className="min-h-[44px] min-w-[40px] flex items-center justify-center rounded-xl hover:bg-white/10"
                >
                  <Search className="w-[18px] h-[18px]" />
                </button>
                <button
                  type="button"
                  onClick={() => setColorModalOpen(true)}
                  aria-label="Change app colors"
                  className="min-h-[44px] min-w-[40px] flex items-center justify-center rounded-xl hover:bg-white/10"
                >
                  <Palette className="w-[18px] h-[18px]" />
                </button>
                <button
                  type="button"
                  onClick={toggleTheme}
                  aria-label="Toggle theme"
                  className="min-h-[44px] min-w-[40px] flex items-center justify-center rounded-xl hover:bg-white/10"
                >
                  {user?.theme === 'dark' ? (
                    <Sun className="w-[18px] h-[18px]" />
                  ) : (
                    <Moon className="w-[18px] h-[18px]" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectSection('profile')}
                  aria-label="Open profile"
                  className="min-h-[44px] min-w-[40px] flex items-center justify-center"
                >
                  <UserAvatar
                    name={user?.fullName ?? 'OS'}
                    avatarDataUrl={user?.avatarDataUrl}
                    size="sm"
                  />
                </button>
              </div>
            </div>

            {mobileSearchOpen && (
              <div className="px-3 pb-2.5 bg-os-primary dark:bg-os-sidebar-dark">
                <div className="flex items-center gap-2 bg-white dark:bg-slate-800 rounded-xl px-3 h-10">
                  <Search className="w-4 h-4 text-os-muted" />
                  <input
                    type="search"
                    value={globalSearch}
                    onChange={(e) => setGlobalSearch(e.target.value)}
                    placeholder="Search tasks, notes, files..."
                    className="flex-1 text-xs bg-transparent text-os-ink dark:text-slate-100 focus:outline-none"
                  />
                  {globalSearch && (
                    <button
                      type="button"
                      onClick={() => setGlobalSearch('')}
                      className="text-xs text-os-muted"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            )}
          </header>

          {/* Main Scrollable Content Area */}
          <main className="flex-1 overflow-y-auto p-3.5 sm:p-5 lg:p-6 pb-24 md:pb-6">
            {user?.isPreviewAccount && (
              <div className="md:hidden mb-3 px-3 py-2 rounded-xl bg-[#E7F3EE] dark:bg-emerald-950/50 border border-[#C3E1D4] dark:border-emerald-800 text-[11px] font-medium text-[#1F5441] dark:text-emerald-300">
                Sample Preview Workspace · Separate from real accounts
              </div>
            )}
            {children}
          </main>
        </div>
      </div>

      {/* Mobile Fixed Bottom Navigation Bar (4 primary tabs + More sheet) */}
      <nav
        aria-label="Mobile Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-os-border-strong dark:border-slate-800 pb-safe"
      >
        <div className="grid grid-cols-5 h-[58px] items-center">
          {MOBILE_PRIMARY_TABS.map((tabId) => {
            const item = NAV_ITEMS.find((n) => n.id === tabId)!;
            const Icon = item.icon;
            const active = activeSection === tabId;
            return (
              <button
                key={tabId}
                type="button"
                onClick={() => handleSelectSection(tabId)}
                className={`min-h-[44px] flex flex-col items-center justify-center gap-0.5 transition-colors ${
                  active
                    ? 'text-os-primary dark:text-sky-300 font-semibold'
                    : 'text-os-muted dark:text-slate-400'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] leading-none">{item.shortLabel}</span>
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setMobileMoreOpen(true)}
            className={`min-h-[44px] flex flex-col items-center justify-center gap-0.5 transition-colors ${
              ['habits', 'finance', 'goals', 'profile'].includes(activeSection)
                ? 'text-os-primary dark:text-sky-300 font-semibold'
                : 'text-os-muted dark:text-slate-400'
            }`}
          >
            <Menu className="w-5 h-5" />
            <span className="text-[10px] leading-none">More</span>
          </button>
        </div>
      </nav>

      {/* Mobile Slide-Up Menu Drawer for all 8 sections + Logout */}
      {mobileMoreOpen && (
        <div
          className="md:hidden fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-[2px] flex items-end overscroll-none touch-none"
          onClick={() => setMobileMoreOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
            onClick={(e) => e.stopPropagation()}
            className="w-full bg-white dark:bg-slate-900 rounded-t-2xl border-t border-os-border-strong dark:border-slate-800 max-h-[80dvh] flex flex-col overflow-hidden pb-safe shadow-2xl touch-auto"
          >
            {/* Fixed Drawer Header */}
            <div className="px-4 pt-3 pb-3 border-b border-os-surface-soft dark:border-slate-800 shrink-0">
              <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-700 mx-auto mb-3" />
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <UserAvatar
                    name={user?.fullName ?? 'OS'}
                    avatarDataUrl={user?.avatarDataUrl}
                    size="md"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-display font-bold text-os-ink dark:text-slate-100 truncate">
                      {user?.fullName}
                    </p>
                    <p className="text-xs text-os-muted dark:text-slate-400 truncate">
                      {user?.email}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileMoreOpen(false)}
                  aria-label="Close menu"
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-os-muted hover:bg-os-surface-soft dark:hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Scrollable Menu Options Area */}
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain touch-pan-y p-4 space-y-2">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectSection(item.id)}
                    className={`w-full min-h-[48px] px-3.5 py-2.5 rounded-xl flex items-center gap-3 text-sm font-semibold border transition-colors ${
                      active
                        ? 'bg-os-primary text-white border-os-primary'
                        : 'bg-os-surface-soft dark:bg-slate-800 text-os-ink-secondary dark:text-slate-200 border-os-border dark:border-slate-700 hover:bg-[#EDF4F8] dark:hover:bg-slate-700'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => {
                  setMobileMoreOpen(false);
                  setColorModalOpen(true);
                }}
                className="w-full min-h-[48px] px-3.5 py-2.5 rounded-xl flex items-center justify-between gap-3 text-sm font-semibold border bg-os-surface-soft dark:bg-slate-800 text-os-ink-secondary dark:text-slate-200 border-os-border dark:border-slate-700"
              >
                <span className="flex items-center gap-3">
                  <Palette className="w-4 h-4 shrink-0" />
                  <span>App Colors & Themes</span>
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  toggleTheme();
                }}
                className="w-full min-h-[48px] px-3.5 py-2.5 rounded-xl flex items-center justify-between gap-3 text-sm font-semibold border bg-os-surface-soft dark:bg-slate-800 text-os-ink-secondary dark:text-slate-200 border-os-border dark:border-slate-700"
              >
                <span className="flex items-center gap-3">
                  {user?.theme === 'dark' ? (
                    <Sun className="w-4 h-4 shrink-0" />
                  ) : (
                    <Moon className="w-4 h-4 shrink-0" />
                  )}
                  <span>{user?.theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}</span>
                </span>
              </button>
            </div>

            {/* Fixed Logout Footer */}
            <div className="px-4 py-3 border-t border-os-border dark:border-slate-800 shrink-0 bg-white dark:bg-slate-900">
              <button
                type="button"
                onClick={() => {
                  setMobileMoreOpen(false);
                  logout();
                }}
                className="w-full min-h-[46px] rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick App Colors & Theme Modal */}
      <ModalShell
        open={colorModalOpen}
        onClose={() => setColorModalOpen(false)}
        title="App Colors & Theme"
        subtitle="Personalize your sidebar, canvas, buttons, and accents."
      >
        <ThemeColorPicker compact />
      </ModalShell>
    </div>
  );
}
