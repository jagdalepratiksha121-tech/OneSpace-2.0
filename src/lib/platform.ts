import type {SpaceFileKind} from '../types/onespace';

export function formatBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const idx = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, idx);
  return `${value >= 10 || idx === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[idx]}`;
}

export function formatCurrency(amount: number, currency = 'USD'): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `$${amount.toFixed(2)}`;
  }
}

export function toISODate(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function formatDisplayDate(iso: string): string {
  if (!iso) return 'No date';
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatShortDate(iso: string): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export function extractYoutubeId(url: string): string | null {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, '');
    if (host === 'youtu.be') {
      return parsed.pathname.slice(1).split('/')[0] || null;
    }
    if (host === 'youtube.com' || host === 'm.youtube.com') {
      if (parsed.pathname === '/watch') {
        return parsed.searchParams.get('v');
      }
      if (parsed.pathname.startsWith('/shorts/') || parsed.pathname.startsWith('/embed/')) {
        return parsed.pathname.split('/')[2] || null;
      }
    }
    return null;
  } catch {
    return null;
  }
}

export function detectSpaceFileKind(fileName: string, mimeType = ''): SpaceFileKind {
  const lower = fileName.toLowerCase();
  const mime = mimeType.toLowerCase();

  if (lower.endsWith('.pdf') || mime === 'application/pdf') return 'pdf';
  if (
    lower.endsWith('.doc') ||
    lower.endsWith('.docx') ||
    mime.includes('wordprocessingml') ||
    mime.includes('msword')
  ) {
    return 'word';
  }
  if (
    lower.endsWith('.xls') ||
    lower.endsWith('.xlsx') ||
    lower.endsWith('.csv') ||
    mime.includes('spreadsheetml') ||
    mime.includes('ms-excel')
  ) {
    return 'excel';
  }
  if (
    lower.endsWith('.ppt') ||
    lower.endsWith('.pptx') ||
    mime.includes('presentationml') ||
    mime.includes('powerpoint')
  ) {
    return 'ppt';
  }
  if (
    mime.startsWith('image/') ||
    /\.(png|jpe?g|gif|webp|svg|bmp)$/i.test(lower)
  ) {
    return 'image';
  }
  return 'other';
}

export function triggerFileDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export function isCapacitorAndroid(): boolean {
  if (typeof window === 'undefined') return false;
  const win = window as unknown as {Capacitor?: {getPlatform?: () => string}};
  return win.Capacitor?.getPlatform?.() === 'android';
}
