import React, {useEffect} from 'react';
import {AlertTriangle, CheckCircle2, Info, X} from 'lucide-react';
import {useApp} from '../../context/AppContext';

let activeScrollLocks = 0;
let savedBodyOverflow = '';
let savedHtmlOverflow = '';

function useBodyScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return;
    if (activeScrollLocks === 0) {
      savedBodyOverflow = document.body.style.overflow;
      savedHtmlOverflow = document.documentElement.style.overflow;
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    }
    activeScrollLocks += 1;
    return () => {
      activeScrollLocks = Math.max(0, activeScrollLocks - 1);
      if (activeScrollLocks === 0) {
        document.body.style.overflow = savedBodyOverflow;
        document.documentElement.style.overflow = savedHtmlOverflow;
      }
    };
  }, [locked]);
}

export function UserAvatar({
  name,
  avatarDataUrl,
  size = 'md',
  className = '',
}: {
  name: string;
  avatarDataUrl?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}) {
  const initials =
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('') || 'OS';

  const sizeMap = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-16 h-16 text-lg',
    xl: 'w-20 h-20 text-xl',
  };

  if (avatarDataUrl) {
    return (
      <img
        src={avatarDataUrl}
        alt={name}
        referrerPolicy="no-referrer"
        className={`${sizeMap[size]} rounded-full object-cover ring-2 ring-white/80 dark:ring-slate-700 shrink-0 ${className}`}
      />
    );
  }

  return (
    <div
      className={`${sizeMap[size]} rounded-full bg-os-accent-mid text-white font-display font-bold flex items-center justify-center ring-2 ring-white/80 dark:ring-slate-600 shrink-0 select-none ${className}`}
    >
      {initials}
    </div>
  );
}

export function ToastBanner() {
  const {toast} = useApp();
  if (!toast) return null;

  const styles =
    toast.type === 'error'
      ? 'bg-rose-600 text-white border-rose-700'
      : toast.type === 'info'
        ? 'bg-os-primary text-white border-os-primary-hover'
        : 'bg-[#2D6A54] text-white border-[#225241]';

  const Icon =
    toast.type === 'error' ? AlertTriangle : toast.type === 'info' ? Info : CheckCircle2;

  return (
    <div className="fixed bottom-20 md:bottom-6 right-4 left-4 md:left-auto z-50 flex justify-center md:justify-end pointer-events-none">
      <div
        role="status"
        className={`pointer-events-auto flex items-center gap-2.5 px-4 py-3 rounded-xl border shadow-lg text-sm font-medium max-w-md ${styles}`}
      >
        <Icon className="w-4 h-4 shrink-0" />
        <span className="leading-snug">{toast.text}</span>
      </div>
    </div>
  );
}

export function ConfirmModal() {
  const {confirmDialog, closeConfirm} = useApp();
  const [busy, setBusy] = React.useState(false);
  useBodyScrollLock(Boolean(confirmDialog));

  if (!confirmDialog) return null;

  const handleConfirm = async () => {
    try {
      setBusy(true);
      await confirmDialog.onConfirm();
      closeConfirm();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/50 backdrop-blur-[2px] p-0 sm:p-4 overscroll-none"
      onClick={closeConfirm}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-md bg-white dark:bg-slate-900 border border-os-border-strong dark:border-slate-700 rounded-t-2xl sm:rounded-2xl shadow-xl p-5 pb-safe"
      >
        <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-700 mx-auto mb-4 sm:hidden" />
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-display font-bold text-os-ink dark:text-slate-100">
              {confirmDialog.title}
            </h3>
            <p className="mt-1 text-sm text-os-muted dark:text-slate-400 leading-relaxed">
              {confirmDialog.message}
            </p>
          </div>
        </div>
        <div className="mt-5 flex items-center justify-end gap-2.5">
          <button
            type="button"
            disabled={busy}
            onClick={closeConfirm}
            className="min-h-[44px] px-4 py-2 rounded-xl border border-os-border-strong dark:border-slate-700 text-sm font-medium text-os-primary dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={handleConfirm}
            className="min-h-[44px] px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-medium transition-colors disabled:opacity-60"
          >
            {busy ? 'Processing...' : (confirmDialog.confirmLabel ?? 'Delete')}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ModalShell({
  open,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'max-w-lg',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: string;
}) {
  useBodyScrollLock(open);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/50 backdrop-blur-[2px] p-0 sm:p-4 overscroll-none touch-none"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className={`w-full ${maxWidth} max-h-[88dvh] flex flex-col bg-white dark:bg-slate-900 border border-os-border-strong dark:border-slate-700 rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden pb-safe touch-auto`}
      >
        <div className="pt-2.5 sm:hidden shrink-0">
          <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-700 mx-auto" />
        </div>
        <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-[#E2EDF2] dark:border-slate-800 shrink-0">
          <div className="min-w-0">
            <h3 className="text-base font-display font-bold text-os-ink dark:text-slate-100 truncate">
              {title}
            </h3>
            {subtitle && (
              <p className="text-xs text-os-muted dark:text-slate-400 truncate mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="min-h-[44px] min-w-[44px] -mr-2 flex items-center justify-center rounded-xl text-os-muted hover:text-os-ink dark:text-slate-400 dark:hover:text-white hover:bg-os-surface-soft dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 overflow-y-auto overscroll-contain touch-pan-y flex-1 min-h-0">
          {children}
        </div>
      </div>
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
}: {
  icon: React.ComponentType<{className?: string}>;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-10 px-4 rounded-xl border border-dashed border-[#C7DBE4] dark:border-slate-700 bg-os-surface-soft dark:bg-slate-900/50">
      <div className="w-12 h-12 rounded-xl bg-[#E3EFF5] dark:bg-slate-800 text-os-primary dark:text-sky-300 flex items-center justify-center mb-3">
        <Icon className="w-6 h-6" />
      </div>
      <h4 className="text-sm font-display font-bold text-os-ink dark:text-slate-100">
        {title}
      </h4>
      <p className="mt-1 text-xs text-os-muted dark:text-slate-400 max-w-sm leading-relaxed">
        {description}
      </p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-4 min-h-[44px] px-4 py-2 rounded-xl bg-os-primary hover:bg-os-primary-hover text-white text-xs font-semibold transition-colors whitespace-nowrap"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
