import React from 'react';
import {Check, Moon, Pipette, RotateCcw, Sun} from 'lucide-react';
import {useApp} from '../../context/AppContext';
import {APP_COLOR_PALETTES, deriveCustomPalette} from '../../lib/themePalettes';

export function ThemeColorPicker({compact = false}: {compact?: boolean}) {
  const {user, setTheme, setColorPalette, showToast} = useApp();
  if (!user) return null;

  const activePalette = user.colorPalette ?? 'slate';
  const customHex = user.customColor ?? '#2E5B88';
  const customTokens = deriveCustomPalette(customHex);

  return (
    <div className="space-y-4">
      {/* Light / Dark Mode Switch */}
      <div>
        <p className="text-xs font-semibold text-os-ink-secondary dark:text-slate-300 mb-2">
          Appearance Mode
        </p>
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => setTheme('light')}
            className={`min-h-[44px] px-3.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-colors ${
              user.theme === 'light'
                ? 'bg-os-primary text-white border-os-primary'
                : 'bg-os-surface-soft dark:bg-slate-800 text-os-ink-secondary dark:text-slate-200 border-os-border dark:border-slate-700'
            }`}
          >
            <Sun className="w-4 h-4" />
            <span>Light Mode</span>
          </button>
          <button
            type="button"
            onClick={() => setTheme('dark')}
            className={`min-h-[44px] px-3.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-colors ${
              user.theme === 'dark'
                ? 'bg-os-primary text-white border-os-primary'
                : 'bg-os-surface-soft dark:bg-slate-800 text-os-ink-secondary dark:text-slate-200 border-os-border dark:border-slate-700'
            }`}
          >
            <Moon className="w-4 h-4" />
            <span>Dark Mode</span>
          </button>
        </div>
      </div>

      {/* Curated App Color Palettes */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-2">
          <p className="text-xs font-semibold text-os-ink-secondary dark:text-slate-300">
            App Color Theme
          </p>
          {activePalette !== 'slate' && (
            <button
              type="button"
              onClick={() => {
                setColorPalette('slate');
                showToast('Reset to Ocean Slate default theme.');
              }}
              className="text-[11px] font-semibold text-os-primary dark:text-sky-300 hover:underline inline-flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Default</span>
            </button>
          )}
        </div>

        <div
          className={`grid gap-2.5 ${
            compact ? 'grid-cols-2' : 'grid-cols-1 sm:grid-cols-2'
          }`}
        >
          {APP_COLOR_PALETTES.map((palette) => {
            const isSelected = activePalette === palette.id;
            return (
              <button
                key={palette.id}
                type="button"
                onClick={() => {
                  setColorPalette(palette.id);
                  showToast(`Applied "${palette.name}" app colors.`);
                }}
                className={`min-h-[54px] p-2.5 rounded-xl border text-left flex items-center justify-between gap-2.5 transition-all ${
                  isSelected
                    ? 'border-os-primary bg-os-surface-soft dark:bg-slate-800 ring-2 ring-os-primary/20'
                    : 'border-os-border dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-os-surface-soft/70 dark:hover:bg-slate-800/70'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {/* 3-tone color swatch */}
                  <div className="flex items-center -space-x-1.5 shrink-0">
                    <span
                      className="w-6 h-6 rounded-lg border border-white dark:border-slate-900 shadow-sm"
                      style={{backgroundColor: palette.primary}}
                    />
                    <span
                      className="w-5 h-5 rounded-md border border-white dark:border-slate-900 shadow-sm"
                      style={{backgroundColor: palette.accentMid}}
                    />
                    <span
                      className="w-4 h-4 rounded border border-slate-200 dark:border-slate-700"
                      style={{backgroundColor: palette.canvas}}
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-os-ink dark:text-slate-100 truncate">
                      {palette.name}
                    </p>
                    {!compact && (
                      <p className="text-[11px] text-os-muted dark:text-slate-400 truncate">
                        {palette.subtitle}
                      </p>
                    )}
                  </div>
                </div>
                {isSelected && (
                  <span className="w-5 h-5 rounded-full bg-os-primary text-white flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Custom Color Picker */}
      <div
        className={`p-3 rounded-xl border transition-colors ${
          activePalette === 'custom'
            ? 'border-os-primary bg-os-surface-soft dark:bg-slate-800 ring-2 ring-os-primary/20'
            : 'border-os-border dark:border-slate-700 bg-os-surface-soft/50 dark:bg-slate-800/40'
        }`}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="w-9 h-9 rounded-xl border border-white dark:border-slate-700 shadow-sm flex items-center justify-center shrink-0 text-white"
              style={{backgroundColor: customTokens.primary}}
            >
              <Pipette className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-os-ink dark:text-slate-100">
                Custom Accent Color
              </p>
              <p className="text-[11px] text-os-muted dark:text-slate-400 font-mono uppercase">
                {activePalette === 'custom' ? customHex : 'Pick any color'}
              </p>
            </div>
          </div>

          <label className="min-h-[40px] px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-os-border-strong dark:border-slate-700 text-xs font-semibold text-os-ink-secondary dark:text-slate-200 cursor-pointer inline-flex items-center gap-2 shrink-0 hover:bg-os-surface-soft dark:hover:bg-slate-800">
            <input
              type="color"
              value={customHex}
              onChange={(e) => setColorPalette('custom', e.target.value)}
              aria-label="Choose custom app color"
              className="w-5 h-5 rounded cursor-pointer border-0 bg-transparent p-0"
            />
            <span>Choose</span>
          </label>
        </div>
      </div>
    </div>
  );
}
