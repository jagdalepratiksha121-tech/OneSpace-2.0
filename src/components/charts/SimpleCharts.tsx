import React from 'react';

export interface DonutSlice {
  label: string;
  value: number;
  color: string;
}

export function DonutChart({
  slices,
  emptyLabel = 'No data recorded yet',
  size = 136,
}: {
  slices: DonutSlice[];
  emptyLabel?: string;
  size?: number;
}) {
  const total = slices.reduce((sum, s) => sum + Math.max(0, s.value), 0);

  if (total <= 0) {
    return (
      <div className="flex flex-col items-center justify-center py-6 text-center">
        <svg width={size} height={size} viewBox="0 0 100 100" className="opacity-40">
          <circle
            cx="50"
            cy="50"
            r="36"
            fill="none"
            stroke="currentColor"
            strokeWidth="18"
            className="text-os-border-strong dark:text-slate-700"
          />
        </svg>
        <p className="mt-2 text-xs text-os-muted dark:text-slate-400">{emptyLabel}</p>
      </div>
    );
  }

  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  let accumulated = 0;

  return (
    <div className="flex flex-col sm:flex-row items-center gap-5">
      <div className="relative shrink-0" style={{width: size, height: size}}>
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          {slices.map((slice) => {
            if (slice.value <= 0) return null;
            const fraction = slice.value / total;
            const dash = fraction * circumference;
            const offset = -accumulated * circumference;
            accumulated += fraction;
            return (
              <circle
                key={slice.label}
                cx="50"
                cy="50"
                r={radius}
                fill="none"
                stroke={slice.color}
                strokeWidth="22"
                strokeDasharray={`${dash} ${circumference}`}
                strokeDashoffset={offset}
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-[11px] font-medium text-os-muted dark:text-slate-400">
            Total
          </span>
          <span className="text-sm font-display font-bold text-os-ink dark:text-slate-100 tabular-nums">
            {total.toLocaleString()}
          </span>
        </div>
      </div>

      <div className="flex-1 w-full space-y-2.5 min-w-0">
        {slices.map((slice) => {
          const pct = Math.round((slice.value / total) * 100);
          return (
            <div key={slice.label} className="flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className="w-3.5 h-3.5 rounded-[4px] shrink-0"
                  style={{backgroundColor: slice.color}}
                />
                <span className="text-os-ink-secondary dark:text-slate-200 font-medium truncate">
                  {slice.label}
                </span>
              </div>
              <span className="font-mono-num text-os-muted dark:text-slate-400 shrink-0">
                {pct}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export interface AreaSeriesPoint {
  label: string;
  primary: number;
  secondary?: number;
}

export function SmoothAreaChart({
  points,
  primaryLabel,
  secondaryLabel,
  primaryColor = '#4C8B74',
  secondaryColor = '#C5885B',
  height = 175,
  formatValue = (v: number) => String(v),
}: {
  points: AreaSeriesPoint[];
  primaryLabel: string;
  secondaryLabel?: string;
  primaryColor?: string;
  secondaryColor?: string;
  height?: number;
  formatValue?: (v: number) => string;
}) {
  if (points.length === 0) {
    return (
      <div className="py-10 text-center text-xs text-os-muted dark:text-slate-400">
        No trend data available yet.
      </div>
    );
  }

  const width = 460;
  const padLeft = 40;
  const padRight = 14;
  const padTop = 22;
  const padBottom = 26;
  const innerW = width - padLeft - padRight;
  const innerH = height - padTop - padBottom;

  const allValues = points.flatMap((p) =>
    p.secondary !== undefined ? [p.primary, p.secondary] : [p.primary]
  );
  const maxVal = Math.max(10, ...allValues);

  const getCoords = (values: number[]) =>
    values.map((val, i) => {
      const x =
        points.length === 1
          ? padLeft + innerW / 2
          : padLeft + (i / (points.length - 1)) * innerW;
      const y = padTop + innerH - (val / maxVal) * innerH;
      return {x, y, val};
    });

  const buildSmoothPath = (coords: {x: number; y: number}[]) => {
    if (coords.length === 0) return '';
    if (coords.length === 1) return `M ${coords[0].x} ${coords[0].y}`;
    let d = `M ${coords[0].x} ${coords[0].y}`;
    for (let i = 0; i < coords.length - 1; i++) {
      const p0 = coords[i];
      const p1 = coords[i + 1];
      const cx = (p0.x + p1.x) / 2;
      d += ` C ${cx} ${p0.y}, ${cx} ${p1.y}, ${p1.x} ${p1.y}`;
    }
    return d;
  };

  const primaryCoords = getCoords(points.map((p) => p.primary));
  const primaryLine = buildSmoothPath(primaryCoords);
  const primaryArea = `${primaryLine} L ${primaryCoords[primaryCoords.length - 1].x} ${
    padTop + innerH
  } L ${primaryCoords[0].x} ${padTop + innerH} Z`;

  const hasSecondary = points.some((p) => p.secondary !== undefined);
  const secondaryCoords = hasSecondary
    ? getCoords(points.map((p) => p.secondary ?? 0))
    : [];
  const secondaryLine = hasSecondary ? buildSmoothPath(secondaryCoords) : '';
  const secondaryArea = hasSecondary
    ? `${secondaryLine} L ${secondaryCoords[secondaryCoords.length - 1].x} ${
        padTop + innerH
      } L ${secondaryCoords[0].x} ${padTop + innerH} Z`
    : '';

  const peakPrimary = primaryCoords.reduce(
    (best, c) => (c.val > best.val ? c : best),
    primaryCoords[0]
  );
  const peakSecondary = hasSecondary
    ? secondaryCoords.reduce((best, c) => (c.val > best.val ? c : best), secondaryCoords[0])
    : null;

  const yTicks = [0, 0.5, 1];

  return (
    <div className="w-full">
      <div className="flex items-center gap-4 mb-2 text-xs">
        <div className="flex items-center gap-1.5">
          <span
            className="w-2.5 h-2.5 rounded-sm inline-block"
            style={{backgroundColor: primaryColor}}
          />
          <span className="text-os-ink-secondary dark:text-slate-300 font-medium">
            {primaryLabel}
          </span>
        </div>
        {secondaryLabel && (
          <div className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-sm inline-block"
              style={{backgroundColor: secondaryColor}}
            />
            <span className="text-os-ink-secondary dark:text-slate-300 font-medium">
              {secondaryLabel}
            </span>
          </div>
        )}
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto overflow-visible"
        role="img"
        aria-label={primaryLabel}
      >
        <defs>
          <linearGradient id="osGradPrimary" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={primaryColor} stopOpacity="0.28" />
            <stop offset="100%" stopColor={primaryColor} stopOpacity="0.02" />
          </linearGradient>
          <linearGradient id="osGradSecondary" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={secondaryColor} stopOpacity="0.22" />
            <stop offset="100%" stopColor={secondaryColor} stopOpacity="0.01" />
          </linearGradient>
        </defs>

        {yTicks.map((tick) => {
          const y = padTop + innerH - tick * innerH;
          const labelVal = Math.round(tick * maxVal);
          return (
            <g key={tick}>
              <line
                x1={padLeft}
                x2={width - padRight}
                y1={y}
                y2={y}
                stroke="currentColor"
                strokeDasharray="3 3"
                className="text-os-border dark:text-slate-800"
              />
              <text
                x={padLeft - 6}
                y={y + 3}
                textAnchor="end"
                className="fill-os-muted dark:fill-slate-400 text-[9px] font-mono"
              >
                {formatValue(labelVal)}
              </text>
            </g>
          );
        })}

        {hasSecondary && (
          <>
            <path d={secondaryArea} fill="url(#osGradSecondary)" />
            <path
              d={secondaryLine}
              fill="none"
              stroke={secondaryColor}
              strokeWidth="2.2"
              strokeLinecap="round"
            />
          </>
        )}

        <path d={primaryArea} fill="url(#osGradPrimary)" />
        <path
          d={primaryLine}
          fill="none"
          stroke={primaryColor}
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        {peakPrimary.val > 0 && (
          <g>
            <circle cx={peakPrimary.x} cy={peakPrimary.y} r="3.5" fill={primaryColor} />
            <rect
              x={Math.min(width - 66, Math.max(padLeft, peakPrimary.x - 28))}
              y={Math.max(2, peakPrimary.y - 20)}
              width="56"
              height="15"
              rx="4"
              fill={primaryColor}
            />
            <text
              x={Math.min(width - 38, Math.max(padLeft + 28, peakPrimary.x))}
              y={Math.max(12, peakPrimary.y - 10)}
              textAnchor="middle"
              className="fill-white text-[8px] font-mono font-medium"
            >
              {formatValue(peakPrimary.val)}
            </text>
          </g>
        )}

        {peakSecondary && peakSecondary.val > 0 && (
          <circle cx={peakSecondary.x} cy={peakSecondary.y} r="3" fill={secondaryColor} />
        )}

        {points.map((pt, i) => {
          const x = primaryCoords[i].x;
          return (
            <text
              key={pt.label}
              x={x}
              y={height - 6}
              textAnchor="middle"
              className="fill-os-muted dark:fill-slate-400 text-[9px]"
            >
              {pt.label}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

export interface HorizontalBarItem {
  id: string;
  label: string;
  value: number;
  maxValue?: number;
  valueLabel: string;
}

export function HorizontalBarList({
  items,
  emptyLabel = 'Nothing to display yet',
}: {
  items: HorizontalBarItem[];
  emptyLabel?: string;
}) {
  if (items.length === 0) {
    return (
      <div className="py-8 text-center text-xs text-os-muted dark:text-slate-400">
        {emptyLabel}
      </div>
    );
  }

  const max = Math.max(1, ...items.map((item) => item.maxValue ?? item.value));

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const pct = Math.min(100, Math.max(4, Math.round((item.value / max) * 100)));
        return (
          <div key={item.id} className="grid grid-cols-[minmax(0,115px)_1fr] items-center gap-3">
            <span className="text-xs text-os-ink-secondary dark:text-slate-300 truncate font-medium">
              {item.label}
            </span>
            <div className="flex items-center gap-2 min-w-0">
              <div className="flex-1 h-3 bg-os-surface-soft dark:bg-slate-800 rounded-r-full overflow-hidden">
                <div
                  className="h-full bg-os-accent-mid dark:bg-sky-500/80 rounded-r-full transition-all duration-300"
                  style={{width: `${pct}%`}}
                />
              </div>
              <span className="text-[11px] font-mono-num text-os-muted dark:text-slate-400 shrink-0 w-12 text-right">
                {item.valueLabel}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
