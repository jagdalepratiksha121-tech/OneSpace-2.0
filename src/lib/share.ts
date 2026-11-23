import type {SpaceItem} from '../types/onespace';
import {formatBytes} from './platform';

export function buildShareText(item: SpaceItem): string {
  if (item.itemType === 'link') {
    const parts = [item.title];
    if (item.description) parts.push(item.description);
    if (item.url) parts.push(item.url);
    return parts.join('\n\n');
  }

  if (item.itemType === 'note') {
    const parts = [item.title];
    if (item.description) parts.push(item.description);
    if (item.noteContent) parts.push(item.noteContent);
    return parts.join('\n\n');
  }

  const sizeLabel = item.fileSize ? ` (${formatBytes(item.fileSize)})` : '';
  return `${item.title}${sizeLabel}${item.description ? `\n\n${item.description}` : ''}`;
}

export function buildWhatsAppShareUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export function buildMailtoShareUrl(subject: string, body: string): string {
  return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function isWebShareSupported(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.share === 'function';
}

export async function shareSpaceItemNatively(
  item: SpaceItem,
  blob?: Blob | null
): Promise<{ok: boolean; reason?: 'cancelled' | 'unsupported' | 'failed'}> {
  if (!isWebShareSupported()) {
    return {ok: false, reason: 'unsupported'};
  }

  try {
    if (item.itemType === 'file' && blob) {
      const file = new File([blob], item.fileName || item.title, {
        type: item.mimeType || blob.type || 'application/octet-stream',
      });
      const canShareWithFiles =
        typeof navigator.canShare === 'function' && navigator.canShare({files: [file]});

      if (canShareWithFiles) {
        await navigator.share({
          title: item.title,
          text: item.description || item.title,
          files: [file],
        });
        return {ok: true};
      }
    }

    await navigator.share({
      title: item.title,
      text: buildShareText(item),
      url: item.itemType === 'link' ? item.url : undefined,
    });
    return {ok: true};
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      return {ok: false, reason: 'cancelled'};
    }
    return {ok: false, reason: 'failed'};
  }
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}
