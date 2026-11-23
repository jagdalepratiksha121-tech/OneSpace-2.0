import type {AppColorPaletteId} from '../types/onespace';

export interface ColorPaletteTokens {
  id: AppColorPaletteId;
  name: string;
  subtitle: string;
  primary: string;
  primaryHover: string;
  sidebarDark: string;
  canvas: string;
  frameFrom: string;
  frameVia: string;
  frameTo: string;
  surfaceSoft: string;
  border: string;
  borderStrong: string;
  ink: string;
  inkSecondary: string;
  muted: string;
  sidebarMuted: string;
  sidebarText: string;
  accentMid: string;
}

export const APP_COLOR_PALETTES: ColorPaletteTokens[] = [
  {
    id: 'slate',
    name: 'Ocean Slate',
    subtitle: 'Default cool slate & ice blue',
    primary: '#234658',
    primaryHover: '#1A3544',
    sidebarDark: '#122632',
    canvas: '#E2EEF4',
    frameFrom: '#D4E6EE',
    frameVia: '#B7D2DF',
    frameTo: '#749DB2',
    surfaceSoft: '#EFF5F8',
    border: '#CEE0E9',
    borderStrong: '#CBDCE4',
    ink: '#162E3A',
    inkSecondary: '#1E3F50',
    muted: '#5E7B89',
    sidebarMuted: '#A2BCC9',
    sidebarText: '#DCE9F0',
    accentMid: '#4E7789',
  },
  {
    id: 'emerald',
    name: 'Emerald Forest',
    subtitle: 'Calm sage & deep botanical green',
    primary: '#1E5242',
    primaryHover: '#163E32',
    sidebarDark: '#102B23',
    canvas: '#E4F1EB',
    frameFrom: '#D6EBE2',
    frameVia: '#B9DACB',
    frameTo: '#73A690',
    surfaceSoft: '#EEF7F3',
    border: '#CBE0D6',
    borderStrong: '#C0D8CD',
    ink: '#14332A',
    inkSecondary: '#1C473A',
    muted: '#52786B',
    sidebarMuted: '#A5C7BA',
    sidebarText: '#DDF0E8',
    accentMid: '#3C7E69',
  },
  {
    id: 'indigo',
    name: 'Royal Indigo',
    subtitle: 'Crisp indigo & soft periwinkle',
    primary: '#2E3A78',
    primaryHover: '#222B5B',
    sidebarDark: '#171E42',
    canvas: '#E7EBF7',
    frameFrom: '#DCE2F4',
    frameVia: '#C2CCE9',
    frameTo: '#8393C7',
    surfaceSoft: '#F0F3FA',
    border: '#D0D8EC',
    borderStrong: '#C5CFE8',
    ink: '#1A224A',
    inkSecondary: '#263166',
    muted: '#5D688F',
    sidebarMuted: '#AEB7DA',
    sidebarText: '#E2E6F6',
    accentMid: '#5262A8',
  },
  {
    id: 'plum',
    name: 'Midnight Plum',
    subtitle: 'Rich aubergine & soft lavender',
    primary: '#4A2859',
    primaryHover: '#381D44',
    sidebarDark: '#261330',
    canvas: '#EFE9F4',
    frameFrom: '#E6DCEE',
    frameVia: '#D1C0DF',
    frameTo: '#997BB2',
    surfaceSoft: '#F5F0F8',
    border: '#DCCFE6',
    borderStrong: '#D2C2DF',
    ink: '#2B1735',
    inkSecondary: '#3E224C',
    muted: '#735A82',
    sidebarMuted: '#C3AECB',
    sidebarText: '#EDE2F2',
    accentMid: '#764C8A',
  },
  {
    id: 'terracotta',
    name: 'Warm Terracotta',
    subtitle: 'Earthy clay & soft sand cream',
    primary: '#6E372A',
    primaryHover: '#54281E',
    sidebarDark: '#381A13',
    canvas: '#F4EAE5',
    frameFrom: '#EDE0DA',
    frameVia: '#DEC4B9',
    frameTo: '#B48877',
    surfaceSoft: '#F9F2EE',
    border: '#E6D2C9',
    borderStrong: '#DEC6BB',
    ink: '#3A1C15',
    inkSecondary: '#552A20',
    muted: '#825F56',
    sidebarMuted: '#D1B0A7',
    sidebarText: '#F5E6E1',
    accentMid: '#9B5947',
  },
  {
    id: 'cobalt',
    name: 'Cobalt Blue',
    subtitle: 'Clean sapphire & airy sky grey',
    primary: '#1D4D8A',
    primaryHover: '#153B6B',
    sidebarDark: '#0F2848',
    canvas: '#E3EEF8',
    frameFrom: '#D6E6F5',
    frameVia: '#B8D2EC',
    frameTo: '#719EC9',
    surfaceSoft: '#EFF5FB',
    border: '#CCDFEE',
    borderStrong: '#BED4E8',
    ink: '#132D4F',
    inkSecondary: '#1B4070',
    muted: '#577394',
    sidebarMuted: '#A7C1DF',
    sidebarText: '#DFECFA',
    accentMid: '#4176B5',
  },
  {
    id: 'teal',
    name: 'Teal Lagoon',
    subtitle: 'Deep cyan-teal & seafoam mist',
    primary: '#165860',
    primaryHover: '#104248',
    sidebarDark: '#0B2D31',
    canvas: '#E1F0F2',
    frameFrom: '#D4E9EC',
    frameVia: '#B5D9DE',
    frameTo: '#6EA8B0',
    surfaceSoft: '#EEF6F7',
    border: '#C8E1E5',
    borderStrong: '#BBD8DD',
    ink: '#0F373C',
    inkSecondary: '#154B52',
    muted: '#517A7F',
    sidebarMuted: '#A0C6CB',
    sidebarText: '#DCF0F2',
    accentMid: '#37828C',
  },
  {
    id: 'charcoal',
    name: 'Classic Charcoal',
    subtitle: 'Minimalist graphite & neutral grey',
    primary: '#2A3038',
    primaryHover: '#1D2228',
    sidebarDark: '#16191E',
    canvas: '#EAECEF',
    frameFrom: '#E1E4E8',
    frameVia: '#C8CED6',
    frameTo: '#8B95A3',
    surfaceSoft: '#F3F4F6',
    border: '#D5DAE1',
    borderStrong: '#C8CFD8',
    ink: '#181C22',
    inkSecondary: '#2B313B',
    muted: '#616A76',
    sidebarMuted: '#ACB3BE',
    sidebarText: '#E4E7EC',
    accentMid: '#586270',
  },
];

function hexToHsl(hex: string): {h: number; s: number; l: number} {
  const clean = hex.replace('#', '');
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean.padEnd(6, '0').slice(0, 6);
  const r = parseInt(full.slice(0, 2), 16) / 255;
  const g = parseInt(full.slice(2, 4), 16) / 255;
  const b = parseInt(full.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

function hslToHex(h: number, s: number, l: number): string {
  const sNorm = Math.max(0, Math.min(100, s)) / 100;
  const lNorm = Math.max(0, Math.min(100, l)) / 100;
  const a = sNorm * Math.min(lNorm, 1 - lNorm);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = lNorm - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

export function deriveCustomPalette(hex: string): ColorPaletteTokens {
  const {h, s, l} = hexToHsl(hex);
  // Ensure primary stays dark enough for crisp white text contrast on sidebar & buttons
  const primaryL = Math.max(18, Math.min(36, l));
  const softSat = Math.min(s, 45);
  const canvasSat = Math.min(s, 36);

  return {
    id: 'custom',
    name: 'Custom Color',
    subtitle: hex.toUpperCase(),
    primary: hslToHex(h, s, primaryL),
    primaryHover: hslToHex(h, s, Math.max(12, primaryL - 7)),
    sidebarDark: hslToHex(h, Math.min(s, 55), 14),
    canvas: hslToHex(h, canvasSat, 92),
    frameFrom: hslToHex(h, canvasSat, 89),
    frameVia: hslToHex(h, Math.min(s, 38), 80),
    frameTo: hslToHex(h, Math.min(s, 34), 60),
    surfaceSoft: hslToHex(h, softSat, 96),
    border: hslToHex(h, Math.min(s, 32), 86),
    borderStrong: hslToHex(h, Math.min(s, 30), 82),
    ink: hslToHex(h, Math.min(s, 48), 16),
    inkSecondary: hslToHex(h, Math.min(s, 45), 23),
    muted: hslToHex(h, Math.min(s, 24), 45),
    sidebarMuted: hslToHex(h, Math.min(s, 30), 74),
    sidebarText: hslToHex(h, Math.min(s, 40), 91),
    accentMid: hslToHex(h, Math.min(s, 42), 45),
  };
}

export function resolveColorPalette(
  paletteId: AppColorPaletteId = 'slate',
  customColor?: string
): ColorPaletteTokens {
  if (paletteId === 'custom' && customColor) {
    return deriveCustomPalette(customColor);
  }
  return APP_COLOR_PALETTES.find((p) => p.id === paletteId) ?? APP_COLOR_PALETTES[0];
}

export function applyAppPaletteToDom(
  paletteId: AppColorPaletteId = 'slate',
  customColor?: string
): void {
  if (typeof document === 'undefined') return;
  const tokens = resolveColorPalette(paletteId, customColor);
  const root = document.documentElement;
  root.style.setProperty('--os-primary', tokens.primary);
  root.style.setProperty('--os-primary-hover', tokens.primaryHover);
  root.style.setProperty('--os-sidebar-dark', tokens.sidebarDark);
  root.style.setProperty('--os-canvas', tokens.canvas);
  root.style.setProperty('--os-frame-from', tokens.frameFrom);
  root.style.setProperty('--os-frame-via', tokens.frameVia);
  root.style.setProperty('--os-frame-to', tokens.frameTo);
  root.style.setProperty('--os-surface-soft', tokens.surfaceSoft);
  root.style.setProperty('--os-border', tokens.border);
  root.style.setProperty('--os-border-strong', tokens.borderStrong);
  root.style.setProperty('--os-ink', tokens.ink);
  root.style.setProperty('--os-ink-secondary', tokens.inkSecondary);
  root.style.setProperty('--os-muted', tokens.muted);
  root.style.setProperty('--os-sidebar-muted', tokens.sidebarMuted);
  root.style.setProperty('--os-sidebar-text', tokens.sidebarText);
  root.style.setProperty('--os-accent-mid', tokens.accentMid);
}
