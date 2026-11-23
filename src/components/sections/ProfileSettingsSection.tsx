import React, {useRef, useState} from 'react';
import {
  Bell,
  Camera,
  Database,
  Download,
  LogOut,
  Palette,
  ShieldCheck,
  Smartphone,
  Trash2,
} from 'lucide-react';
import {useApp} from '../../context/AppContext';
import {triggerFileDownload} from '../../lib/platform';
import {getSupabaseStatus} from '../../lib/supabase';
import {UserAvatar} from '../ui/CommonUI';
import {ThemeColorPicker} from '../ui/ThemeColorPicker';

export function ProfileSettingsSection() {
  const {
    user,
    data,
    updateProfile,
    logout,
    clearAllUserData,
    requestConfirm,
    showToast,
  } = useApp();

  const supabaseStatus = getSupabaseStatus();
  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  const [fullName, setFullName] = useState(user?.fullName ?? '');
  const [roleTitle, setRoleTitle] = useState(user?.roleTitle ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');
  const [currency, setCurrency] = useState(user?.currency ?? 'USD');

  if (!user) return null;

  const handleSaveDetails = (e: React.FormEvent) => {
    e.preventDefault();
    if (fullName.trim().length < 2) {
      showToast('Full name must be at least 2 characters.', 'error');
      return;
    }
    updateProfile({
      fullName: fullName.trim(),
      roleTitle: roleTitle.trim(),
      bio: bio.trim(),
      currency,
    });
    showToast('Profile details saved.');
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      showToast('Please select an image smaller than 2 MB.', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        updateProfile({avatarDataUrl: reader.result});
        showToast('Profile photo updated.');
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleExportBackup = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      app: 'OneSpace 2.0',
      profile: user,
      workspace: data,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    triggerFileDownload(blob, `onespace-backup-${user.email}.json`);
    showToast('Personal workspace JSON backup exported.');
  };

  return (
    <div className="space-y-4">
      {/* Top Profile Banner Card */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-os-border dark:border-slate-800 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <div className="relative shrink-0">
            <UserAvatar
              name={user.fullName}
              avatarDataUrl={user.avatarDataUrl}
              size="xl"
            />
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              aria-label="Upload profile photo"
              className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-os-primary text-white border-2 border-white dark:border-slate-900 flex items-center justify-center shadow"
            >
              <Camera className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-display font-bold text-os-ink dark:text-slate-100 truncate">
              {user.fullName}
            </h2>
            <p className="text-xs text-os-muted dark:text-slate-400 truncate">
              {user.email}
            </p>
            {user.roleTitle && (
              <p className="text-xs font-medium text-os-primary dark:text-sky-300 mt-1">
                {user.roleTitle}
              </p>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={logout}
          className="min-h-[44px] px-4 py-2 rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs font-semibold inline-flex items-center justify-center gap-2 shrink-0"
        >
          <LogOut className="w-4 h-4" />
          <span>Logout</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        {/* Edit Personal Details */}
        <form
          onSubmit={handleSaveDetails}
          className="bg-white dark:bg-slate-900 rounded-xl border border-os-border dark:border-slate-800 p-5 space-y-4"
        >
          <h3 className="text-sm font-display font-bold text-os-ink dark:text-slate-100">
            Personal Details
          </h3>

          <div>
            <label className="block text-xs font-semibold text-os-primary dark:text-slate-300 mb-1.5">
              Full Name
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full min-h-[44px] px-3.5 rounded-xl border border-os-border-strong dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-os-ink dark:text-slate-100"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-os-primary dark:text-slate-300 mb-1.5">
                Role / Focus
              </label>
              <input
                type="text"
                value={roleTitle}
                onChange={(e) => setRoleTitle(e.target.value)}
                placeholder="e.g. Student, Engineer"
                className="w-full min-h-[44px] px-3.5 rounded-xl border border-os-border-strong dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-os-ink dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-os-primary dark:text-slate-300 mb-1.5">
                Finance Currency
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full min-h-[44px] px-3.5 rounded-xl border border-os-border-strong dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-os-ink dark:text-slate-100"
              >
                <option value="USD">USD ($)</option>
                <option value="INR">INR (₹)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="CAD">CAD ($)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-os-primary dark:text-slate-300 mb-1.5">
              Bio
            </label>
            <textarea
              rows={2}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full p-3 rounded-xl border border-os-border-strong dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-os-ink dark:text-slate-100"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="min-h-[44px] px-5 rounded-xl bg-os-primary hover:bg-os-primary-hover text-white text-xs font-semibold"
            >
              Save Profile
            </button>
          </div>
        </form>

        {/* Theme, Notifications & Account Privacy */}
        <div className="space-y-4">
          {/* App Colors & Theme Preferences */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-os-border dark:border-slate-800 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Palette className="w-4 h-4 text-os-primary dark:text-sky-300" />
              <h3 className="text-sm font-display font-bold text-os-ink dark:text-slate-100">
                App Colors & Theme
              </h3>
            </div>
            <ThemeColorPicker />
          </div>

          {/* Notification Settings */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-os-border dark:border-slate-800 p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-os-primary dark:text-sky-300" />
              <h3 className="text-sm font-display font-bold text-os-ink dark:text-slate-100">
                Notification Settings
              </h3>
            </div>
            {(
              [
                {key: 'enabled', label: 'Enable in-app reminders'},
                {key: 'taskReminders', label: 'Task due date alerts'},
                {key: 'eventReminders', label: 'Upcoming calendar event alerts'},
                {key: 'habitReminders', label: 'Daily habit check-in nudges'},
              ] as const
            ).map((item) => {
              const checked = user.notifications[item.key];
              return (
                <label
                  key={item.key}
                  className="min-h-[42px] flex items-center justify-between gap-3 cursor-pointer text-xs text-os-ink dark:text-slate-200"
                >
                  <span>{item.label}</span>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) =>
                      updateProfile({
                        notifications: {
                          ...user.notifications,
                          [item.key]: e.target.checked,
                        },
                      })
                    }
                    className="w-4 h-4 accent-os-primary"
                  />
                </label>
              );
            })}
          </div>

          {/* Supabase & Capacitor Privacy Information */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-os-border dark:border-slate-800 p-5 space-y-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#4C8B74]" />
              <h3 className="text-sm font-display font-bold text-os-ink dark:text-slate-100">
                Privacy, Cloud & Android Architecture
              </h3>
            </div>

            <div className="space-y-2 text-xs text-os-muted dark:text-slate-400 leading-relaxed">
              <p className="flex items-start gap-2">
                <Database className="w-4 h-4 text-os-primary dark:text-sky-300 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-os-ink dark:text-slate-200">
                    Storage Status:
                  </strong>{' '}
                  {supabaseStatus.modeLabel}. Per-user Row-Level Security schema is prepared in{' '}
                  <code className="font-mono">supabase/schema.sql</code>.
                </span>
              </p>
              <p className="flex items-start gap-2">
                <Smartphone className="w-4 h-4 text-os-primary dark:text-sky-300 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-os-ink dark:text-slate-200">
                    Capacitor Android Ready:
                  </strong>{' '}
                  Configured with <code className="font-mono">capacitor.config.ts</code> and
                  Android safe-area insets for status and navigation bars.
                </span>
              </p>
            </div>

            <div className="pt-2 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleExportBackup}
                className="min-h-[42px] px-3.5 rounded-xl border border-os-border-strong dark:border-slate-700 text-xs font-semibold text-os-ink-secondary dark:text-slate-200 inline-flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Data JSON</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  requestConfirm({
                    title: 'Clear Workspace Data',
                    message:
                      'This permanently deletes all tasks, events, habits, transactions, goals, and My Space files for this account.',
                    confirmLabel: 'Clear Everything',
                    onConfirm: clearAllUserData,
                  })
                }
                className="min-h-[42px] px-3.5 rounded-xl border border-rose-200 dark:border-rose-800 text-xs font-semibold text-rose-700 dark:text-rose-300 inline-flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear Workspace</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
