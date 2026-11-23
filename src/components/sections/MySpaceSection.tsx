import React, {useEffect, useMemo, useRef, useState} from 'react';
import {
  ChevronRight,
  Copy,
  Download,
  Edit2,
  ExternalLink,
  Eye,
  FileSpreadsheet,
  FileText,
  Folder,
  FolderInput,
  FolderPlus,
  Globe,
  HardDrive,
  Image as ImageIcon,
  Link2,
  Mail,
  MessageCircle,
  Plus,
  Presentation,
  Search,
  Share2,
  Star,
  StickyNote,
  Trash2,
  Upload,
  Video,
} from 'lucide-react';
import {useApp} from '../../context/AppContext';
import {
  extractYoutubeId,
  formatBytes,
  formatDisplayDate,
  triggerFileDownload,
} from '../../lib/platform';
import {
  buildMailtoShareUrl,
  buildShareText,
  buildWhatsAppShareUrl,
  copyToClipboard,
  isWebShareSupported,
  shareSpaceItemNatively,
} from '../../lib/share';
import {getSupabaseStatus} from '../../lib/supabase';
import type {SpaceFolder, SpaceItem} from '../../types/onespace';
import {EmptyState, ModalShell} from '../ui/CommonUI';
import {DocumentViewer} from './DocumentViewer';

type SpaceViewMode = 'browse' | 'favorites' | 'recent' | 'all';
type SpaceTypeFilter =
  | 'all'
  | 'pdf'
  | 'word'
  | 'excel'
  | 'ppt'
  | 'image'
  | 'link'
  | 'youtube'
  | 'note';

export function MySpaceSection() {
  const {
    data,
    globalSearch,
    createFolder,
    renameFolder,
    deleteFolder,
    uploadFilesToSpace,
    addLinkToSpace,
    addNoteToSpace,
    updateSpaceItem,
    deleteSpaceItem,
    touchSpaceItem,
    getSpaceFileBlob,
    requestConfirm,
    showToast,
  } = useApp();

  const supabaseStatus = getSupabaseStatus();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [viewMode, setViewMode] = useState<SpaceViewMode>('browse');
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<SpaceTypeFilter>('all');
  const [tagFilter, setTagFilter] = useState<string>('All');
  const [localSearch, setLocalSearch] = useState('');

  // Modals
  const [folderModalOpen, setFolderModalOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<SpaceFolder | null>(null);
  const [folderName, setFolderName] = useState('');
  const [folderDesc, setFolderDesc] = useState('');

  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [editingLinkItem, setEditingLinkItem] = useState<SpaceItem | null>(null);
  const [linkTitle, setLinkTitle] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [linkDesc, setLinkDesc] = useState('');
  const [linkCat, setLinkCat] = useState('Reference');
  const [linkTags, setLinkTags] = useState('');

  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [editingNoteItem, setEditingNoteItem] = useState<SpaceItem | null>(null);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteDesc, setNoteDesc] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [noteCat, setNoteCat] = useState('Notes');
  const [noteTags, setNoteTags] = useState('');

  const [renameItemModal, setRenameItemModal] = useState<SpaceItem | null>(null);
  const [renameTitle, setRenameTitle] = useState('');
  const [renameCategory, setRenameCategory] = useState('');
  const [renameTags, setRenameTags] = useState('');

  const [moveItemModal, setMoveItemModal] = useState<SpaceItem | null>(null);
  const [moveTargetFolderId, setMoveTargetFolderId] = useState<string | null>(null);

  const [previewItem, setPreviewItem] = useState<SpaceItem | null>(null);
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [shareItemModal, setShareItemModal] = useState<SpaceItem | null>(null);
  const [sharingNative, setSharingNative] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Clean up Blob URL when closing preview
  useEffect(() => {
    return () => {
      if (previewBlobUrl) {
        URL.revokeObjectURL(previewBlobUrl);
      }
    };
  }, [previewBlobUrl]);

  // Breadcrumb path for current folder
  const breadcrumbs = useMemo(() => {
    const trail: SpaceFolder[] = [];
    let cursor = currentFolderId;
    const guard = new Set<string>();
    while (cursor && !guard.has(cursor)) {
      guard.add(cursor);
      const found = data.folders.find((f) => f.id === cursor);
      if (!found) break;
      trail.unshift(found);
      cursor = found.parentId;
    }
    return trail;
  }, [currentFolderId, data.folders]);

  const currentFolder = useMemo(
    () => data.folders.find((f) => f.id === currentFolderId) ?? null,
    [currentFolderId, data.folders]
  );

  // Subfolders inside current folder
  const childFolders = useMemo(() => {
    if (viewMode !== 'browse') return [];
    const q = (localSearch || globalSearch).trim().toLowerCase();
    return data.folders
      .filter((f) => f.parentId === currentFolderId)
      .filter((f) => !q || f.name.toLowerCase().includes(q) || f.description.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [data.folders, currentFolderId, viewMode, localSearch, globalSearch]);

  // All unique tags
  const allTags = useMemo(() => {
    const set = new Set<string>();
    data.spaceItems.forEach((item) => item.tags.forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }, [data.spaceItems]);

  // Filtered items
  const visibleItems = useMemo(() => {
    const q = (localSearch || globalSearch).trim().toLowerCase();
    let list = [...data.spaceItems];

    if (viewMode === 'browse' && !q) {
      list = list.filter((i) => i.folderId === currentFolderId);
    } else if (viewMode === 'favorites') {
      list = list.filter((i) => i.favorite);
    } else if (viewMode === 'recent') {
      list = list.sort((a, b) => b.lastAccessedAt.localeCompare(a.lastAccessedAt)).slice(0, 20);
    }

    if (typeFilter !== 'all') {
      list = list.filter((item) => {
        if (typeFilter === 'note') return item.itemType === 'note';
        if (typeFilter === 'link') return item.itemType === 'link' && !item.isYoutube;
        if (typeFilter === 'youtube') return item.itemType === 'link' && Boolean(item.isYoutube);
        return item.itemType === 'file' && item.fileKind === typeFilter;
      });
    }

    if (tagFilter !== 'All') {
      list = list.filter((item) => item.tags.includes(tagFilter));
    }

    if (q) {
      list = list.filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q) ||
          (item.noteContent?.toLowerCase().includes(q) ?? false) ||
          item.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    return list;
  }, [
    data.spaceItems,
    viewMode,
    currentFolderId,
    typeFilter,
    tagFilter,
    localSearch,
    globalSearch,
  ]);

  // Folder path lookup helper for search/all-items view
  const getFolderPathLabel = (folderId: string | null): string => {
    if (!folderId) return 'My Space';
    const parts: string[] = [];
    let cursor: string | null = folderId;
    const guard = new Set<string>();
    while (cursor && !guard.has(cursor)) {
      guard.add(cursor);
      const f = data.folders.find((x) => x.id === cursor);
      if (!f) break;
      parts.unshift(f.name);
      cursor = f.parentId;
    }
    return parts.length > 0 ? parts.join(' / ') : 'My Space';
  };

  // Handlers
  const openCreateFolder = () => {
    setEditingFolder(null);
    setFolderName('');
    setFolderDesc('');
    setFolderModalOpen(true);
  };

  const openEditFolder = (folder: SpaceFolder) => {
    setEditingFolder(folder);
    setFolderName(folder.name);
    setFolderDesc(folder.description);
    setFolderModalOpen(true);
  };

  const handleSaveFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderName.trim()) return;
    if (editingFolder) {
      renameFolder(editingFolder.id, folderName, folderDesc);
    } else {
      createFolder(folderName, currentFolderId, folderDesc);
    }
    setFolderModalOpen(false);
  };

  const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      await uploadFilesToSpace(files, currentFolderId);
    } catch {
      showToast('Could not save selected file locally.', 'error');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const openNewLink = () => {
    setEditingLinkItem(null);
    setLinkTitle('');
    setLinkUrl('');
    setLinkDesc('');
    setLinkCat('Reference');
    setLinkTags('');
    setLinkModalOpen(true);
  };

  const openEditLink = (item: SpaceItem) => {
    setEditingLinkItem(item);
    setLinkTitle(item.title);
    setLinkUrl(item.url ?? '');
    setLinkDesc(item.description);
    setLinkCat(item.category);
    setLinkTags(item.tags.join(', '));
    setLinkModalOpen(true);
  };

  const handleSaveLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkTitle.trim() || !linkUrl.trim()) return;
    const normalizedUrl = /^https?:\/\//i.test(linkUrl.trim())
      ? linkUrl.trim()
      : `https://${linkUrl.trim()}`;
    const tags = linkTags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    if (editingLinkItem) {
      updateSpaceItem(editingLinkItem.id, {
        title: linkTitle.trim(),
        url: normalizedUrl,
        isYoutube: Boolean(extractYoutubeId(normalizedUrl)),
        description: linkDesc.trim(),
        category: linkCat.trim() || 'Web Link',
        tags,
      });
    } else {
      addLinkToSpace({
        folderId: currentFolderId,
        title: linkTitle,
        url: normalizedUrl,
        description: linkDesc,
        category: linkCat,
        tags,
      });
    }
    setLinkModalOpen(false);
  };

  const openNewNote = () => {
    setEditingNoteItem(null);
    setNoteTitle('');
    setNoteDesc('');
    setNoteContent('');
    setNoteCat('Notes');
    setNoteTags('');
    setNoteModalOpen(true);
  };

  const openEditNote = (item: SpaceItem) => {
    setEditingNoteItem(item);
    setNoteTitle(item.title);
    setNoteDesc(item.description);
    setNoteContent(item.noteContent ?? '');
    setNoteCat(item.category);
    setNoteTags(item.tags.join(', '));
    setNoteModalOpen(true);
  };

  const handleSaveNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteTitle.trim()) return;
    const tags = noteTags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    if (editingNoteItem) {
      updateSpaceItem(editingNoteItem.id, {
        title: noteTitle.trim(),
        description: noteDesc.trim(),
        noteContent,
        category: noteCat.trim() || 'Notes',
        tags,
      });
    } else {
      addNoteToSpace({
        folderId: currentFolderId,
        title: noteTitle,
        description: noteDesc,
        noteContent,
        category: noteCat,
        tags,
      });
    }
    setNoteModalOpen(false);
  };

  const handleOpenPreview = async (item: SpaceItem) => {
    touchSpaceItem(item.id);
    if (previewBlobUrl) {
      URL.revokeObjectURL(previewBlobUrl);
      setPreviewBlobUrl(null);
    }
    setPreviewBlob(null);
    setPreviewItem(item);

    if (item.itemType === 'file' && item.blobKey) {
      setPreviewLoading(true);
      try {
        const blob = await getSpaceFileBlob(item.blobKey);
        if (blob) {
          setPreviewBlob(blob);
          const url = URL.createObjectURL(blob);
          setPreviewBlobUrl(url);
        }
      } finally {
        setPreviewLoading(false);
      }
    }
  };

  const handleDownloadFile = async (item: SpaceItem) => {
    if (!item.blobKey) return;
    const blob = await getSpaceFileBlob(item.blobKey);
    if (!blob) {
      showToast('File data not found in local storage.', 'error');
      return;
    }
    touchSpaceItem(item.id);
    triggerFileDownload(blob, item.fileName || item.title);
  };

  const handleOpenShare = (item: SpaceItem) => {
    touchSpaceItem(item.id);
    setShareItemModal(item);
  };

  const handleNativeShare = async (item: SpaceItem) => {
    setSharingNative(true);
    try {
      const blob =
        item.itemType === 'file' && item.blobKey
          ? await getSpaceFileBlob(item.blobKey)
          : null;
      const res = await shareSpaceItemNatively(item, blob);
      if (res.ok) {
        showToast('Shared successfully.');
      } else if (res.reason === 'unsupported') {
        showToast('System share sheet is unavailable on this browser. Use WhatsApp, Email, or Copy below.', 'info');
      } else if (res.reason === 'failed') {
        showToast('Could not open device share sheet. Try WhatsApp or Copy below.', 'info');
      }
    } finally {
      setSharingNative(false);
    }
  };

  const handleCopyShare = async (item: SpaceItem) => {
    const text = item.itemType === 'link' && item.url ? item.url : buildShareText(item);
    const copied = await copyToClipboard(text);
    if (copied) {
      showToast(
        item.itemType === 'link'
          ? 'Link copied to clipboard.'
          : 'Details copied to clipboard.'
      );
    } else {
      showToast('Could not copy automatically.', 'error');
    }
  };

  const openRenameModal = (item: SpaceItem) => {
    setRenameItemModal(item);
    setRenameTitle(item.title);
    setRenameCategory(item.category);
    setRenameTags(item.tags.join(', '));
  };

  const handleSaveRename = (e: React.FormEvent) => {
    e.preventDefault();
    if (!renameItemModal || !renameTitle.trim()) return;
    updateSpaceItem(renameItemModal.id, {
      title: renameTitle.trim(),
      fileName: renameItemModal.itemType === 'file' ? renameTitle.trim() : undefined,
      category: renameCategory.trim() || 'General',
      tags: renameTags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
    });
    setRenameItemModal(null);
  };

  const handleMoveItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!moveItemModal) return;
    updateSpaceItem(moveItemModal.id, {folderId: moveTargetFolderId});
    setMoveItemModal(null);
  };

  const renderItemIcon = (item: SpaceItem) => {
    if (item.itemType === 'note') {
      return {Icon: StickyNote, bg: 'bg-[#FFF3E6] text-[#9A5928] dark:bg-amber-950/60 dark:text-amber-300'};
    }
    if (item.itemType === 'link') {
      return item.isYoutube
        ? {Icon: Video, bg: 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'}
        : {Icon: Globe, bg: 'bg-[#E6F1F6] text-os-primary dark:bg-sky-950/60 dark:text-sky-300'};
    }
    switch (item.fileKind) {
      case 'pdf':
        return {Icon: FileText, bg: 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'};
      case 'word':
        return {Icon: FileText, bg: 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'};
      case 'excel':
        return {Icon: FileSpreadsheet, bg: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'};
      case 'ppt':
        return {Icon: Presentation, bg: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'};
      case 'image':
        return {Icon: ImageIcon, bg: 'bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300'};
      default:
        return {Icon: FileText, bg: 'bg-os-surface-soft text-os-ink-secondary dark:bg-slate-800 dark:text-slate-300'};
    }
  };

  const youtubePreviewId =
    previewItem?.itemType === 'link' && previewItem.url
      ? extractYoutubeId(previewItem.url)
      : null;

  return (
    <div className="space-y-4">
      {/* Storage Honesty Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-os-border dark:border-slate-800 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-os-surface-soft dark:bg-slate-800 text-os-primary dark:text-sky-300 flex items-center justify-center shrink-0">
            <HardDrive className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-os-ink dark:text-slate-100">
              My Space – Personal Digital Library
            </p>
            <p className="text-[11px] text-os-muted dark:text-slate-400">
              {supabaseStatus.configured
                ? 'Supabase Storage ready.'
                : 'Using private local browser storage (IndexedDB). Cloud sync activates once Supabase is configured.'}
            </p>
          </div>
        </div>
        <span className="text-[11px] font-mono-num text-os-ink-secondary dark:text-sky-300 shrink-0">
          {data.folders.length} Folders · {data.spaceItems.length} Items
        </span>
      </div>

      {/* Primary Action Toolbar */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-os-border dark:border-slate-800 p-3.5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Organization Views */}
          <div className="inline-flex flex-wrap p-1 rounded-xl bg-os-surface-soft dark:bg-slate-800 gap-1">
            {[
              {id: 'browse' as const, label: 'Folders'},
              {id: 'favorites' as const, label: 'Favorites'},
              {id: 'recent' as const, label: 'Recent'},
              {id: 'all' as const, label: 'All Items'},
            ].map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setViewMode(v.id)}
                className={`min-h-[36px] px-3 rounded-lg text-xs font-semibold transition-colors ${
                  viewMode === v.id
                    ? 'bg-white dark:bg-slate-900 text-os-ink dark:text-white shadow-sm'
                    : 'text-os-muted dark:text-slate-400 hover:text-os-ink'
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>

          {/* Create / Upload Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.txt,.md,.json,image/*"
              onChange={handleFilesSelected}
              className="hidden"
            />
            <button
              type="button"
              onClick={openCreateFolder}
              className="min-h-[42px] px-3 rounded-xl border border-os-border-strong dark:border-slate-700 hover:bg-os-surface-soft dark:hover:bg-slate-800 text-xs font-semibold text-os-ink-secondary dark:text-slate-200 inline-flex items-center gap-1.5"
            >
              <FolderPlus className="w-4 h-4" />
              <span>New Folder</span>
            </button>
            <button
              type="button"
              onClick={openNewLink}
              className="min-h-[42px] px-3 rounded-xl border border-os-border-strong dark:border-slate-700 hover:bg-os-surface-soft dark:hover:bg-slate-800 text-xs font-semibold text-os-ink-secondary dark:text-slate-200 inline-flex items-center gap-1.5"
            >
              <Link2 className="w-4 h-4" />
              <span>Add Link</span>
            </button>
            <button
              type="button"
              onClick={openNewNote}
              className="min-h-[42px] px-3 rounded-xl border border-os-border-strong dark:border-slate-700 hover:bg-os-surface-soft dark:hover:bg-slate-800 text-xs font-semibold text-os-ink-secondary dark:text-slate-200 inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>New Note</span>
            </button>
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
              className="min-h-[42px] px-4 rounded-xl bg-os-primary hover:bg-os-primary-hover text-white text-xs font-semibold inline-flex items-center gap-1.5 disabled:opacity-60"
            >
              <Upload className="w-4 h-4" />
              <span>{uploading ? 'Saving...' : 'Upload File'}</span>
            </button>
          </div>
        </div>

        {/* Search & Type/Tag Filters */}
        <div className="flex flex-col md:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-os-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              placeholder="Search files, notes, links, or tags across My Space..."
              className="w-full min-h-[40px] pl-9 pr-3 rounded-xl border border-os-border-strong dark:border-slate-700 bg-os-surface-soft dark:bg-slate-800 text-xs text-os-ink dark:text-slate-100"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as SpaceTypeFilter)}
              aria-label="Filter by content type"
              className="min-h-[40px] px-3 rounded-xl border border-os-border-strong dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-os-ink-secondary dark:text-slate-200"
            >
              <option value="all">All Types</option>
              <option value="pdf">PDF Files</option>
              <option value="word">Word Docs</option>
              <option value="excel">Excel Sheets</option>
              <option value="ppt">PowerPoint</option>
              <option value="image">Images</option>
              <option value="link">Web Links</option>
              <option value="youtube">YouTube / Videos</option>
              <option value="note">Personal Notes</option>
            </select>

            {allTags.length > 0 && (
              <select
                value={tagFilter}
                onChange={(e) => setTagFilter(e.target.value)}
                aria-label="Filter by tag"
                className="min-h-[40px] px-3 rounded-xl border border-os-border-strong dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-os-ink-secondary dark:text-slate-200"
              >
                <option value="All">All Tags</option>
                {allTags.map((t) => (
                  <option key={t} value={t}>
                    #{t}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      </div>

      {/* Breadcrumb Navigation when in Folder Browse mode */}
      {viewMode === 'browse' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-os-border dark:border-slate-800 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2">
          <nav aria-label="Folder breadcrumbs" className="flex flex-wrap items-center gap-1 text-xs">
            <button
              type="button"
              onClick={() => setCurrentFolderId(null)}
              className={`min-h-[34px] px-2 rounded-lg font-semibold transition-colors ${
                currentFolderId === null
                  ? 'bg-os-surface-soft dark:bg-slate-800 text-os-primary dark:text-sky-300'
                  : 'text-os-muted hover:text-os-ink'
              }`}
            >
              My Space
            </button>
            {breadcrumbs.map((folder) => (
              <React.Fragment key={folder.id}>
                <ChevronRight className="w-3.5 h-3.5 text-[#8AA5B3]" />
                <button
                  type="button"
                  onClick={() => setCurrentFolderId(folder.id)}
                  className={`min-h-[34px] px-2 rounded-lg font-semibold transition-colors ${
                    folder.id === currentFolderId
                      ? 'bg-os-surface-soft dark:bg-slate-800 text-os-primary dark:text-sky-300'
                      : 'text-os-muted hover:text-os-ink'
                  }`}
                >
                  {folder.name}
                </button>
              </React.Fragment>
            ))}
          </nav>

          {currentFolder && (
            <div className="flex items-center gap-1.5 text-xs text-os-muted dark:text-slate-400">
              {currentFolder.description && (
                <span className="hidden sm:inline truncate max-w-xs">
                  {currentFolder.description}
                </span>
              )}
              <button
                type="button"
                onClick={() => openEditFolder(currentFolder)}
                className="min-h-[34px] px-2.5 rounded-lg hover:bg-os-surface-soft dark:hover:bg-slate-800 text-os-primary dark:text-sky-300 font-medium"
              >
                Rename
              </button>
            </div>
          )}
        </div>
      )}

      {/* Subfolders Grid */}
      {viewMode === 'browse' && childFolders.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {childFolders.map((folder) => {
            const subFolderCount = data.folders.filter((f) => f.parentId === folder.id).length;
            const itemCount = data.spaceItems.filter((i) => i.folderId === folder.id).length;
            return (
              <div
                key={folder.id}
                className="bg-white dark:bg-slate-900 rounded-xl border border-os-border dark:border-slate-800 p-3.5 hover:border-[#8AB0C2] transition-colors flex items-start justify-between gap-2"
              >
                <button
                  type="button"
                  onClick={() => setCurrentFolderId(folder.id)}
                  className="flex-1 min-w-0 text-left flex items-start gap-3"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#E8F2F7] dark:bg-slate-800 text-os-primary dark:text-sky-300 flex items-center justify-center shrink-0">
                    <Folder className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-display font-bold text-os-ink dark:text-slate-100 truncate">
                      {folder.name}
                    </p>
                    <p className="text-[11px] text-os-muted dark:text-slate-400 mt-0.5">
                      {subFolderCount} folders · {itemCount} items
                    </p>
                    {folder.description && (
                      <p className="text-xs text-os-muted dark:text-slate-400 mt-1 line-clamp-1">
                        {folder.description}
                      </p>
                    )}
                  </div>
                </button>
                <div className="flex items-center shrink-0">
                  <button
                    type="button"
                    onClick={() => openEditFolder(folder)}
                    aria-label="Rename folder"
                    className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg text-os-muted hover:text-os-primary"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      requestConfirm({
                        title: 'Delete Folder',
                        message: `Delete "${folder.name}" and all nested subfolders and saved items inside it?`,
                        onConfirm: () => deleteFolder(folder.id),
                      })
                    }
                    aria-label="Delete folder"
                    className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg text-os-muted hover:text-rose-600"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Items List (Files, Links, Videos, Notes) */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-os-border dark:border-slate-800 p-4">
        {visibleItems.length === 0 ? (
          childFolders.length > 0 && viewMode === 'browse' && !localSearch ? (
            <p className="text-xs text-os-muted dark:text-slate-400 text-center py-4">
              No files, links, or notes directly inside this folder yet. Open a subfolder above or
              add content using the buttons above.
            </p>
          ) : (
            <EmptyState
              icon={Folder}
              title="No saved items here yet"
              description="Upload PDFs, Word/Excel/PowerPoint docs, images, save website & YouTube links, or write personal notes."
              actionLabel="Upload File"
              onAction={() => fileInputRef.current?.click()}
            />
          )
        ) : (
          <div className="divide-y divide-os-surface-soft dark:divide-slate-800">
            {visibleItems.map((item) => {
              const {Icon, bg} = renderItemIcon(item);
              const folderLabel = getFolderPathLabel(item.folderId);

              return (
                <div
                  key={item.id}
                  className="py-3 first:pt-1 last:pb-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <button
                    type="button"
                    onClick={() => handleOpenPreview(item)}
                    className="flex-1 min-w-0 flex items-start sm:items-center gap-3 text-left"
                  >
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${bg}`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-os-ink dark:text-slate-100 truncate">
                        {item.title}
                      </p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-os-muted dark:text-slate-400">
                        <span>{item.category}</span>
                        <span>·</span>
                        <span>{folderLabel}</span>
                        {item.itemType === 'file' && (
                          <>
                            <span>·</span>
                            <span className="font-mono-num">{formatBytes(item.fileSize)}</span>
                          </>
                        )}
                        <span>·</span>
                        <span>{formatDisplayDate(item.createdAt.slice(0, 10))}</span>
                        {item.tags.length > 0 && (
                          <>
                            <span>·</span>
                            <span className="text-os-ink-secondary dark:text-sky-300">
                              {item.tags.map((t) => `#${t}`).join(' ')}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </button>

                  {/* Item Actions */}
                  <div className="flex items-center justify-end gap-1 shrink-0 flex-wrap">
                    <button
                      type="button"
                      onClick={() => handleOpenPreview(item)}
                      aria-label="View item"
                      title="View / Preview"
                      className="min-h-[40px] px-2.5 flex items-center justify-center gap-1 rounded-xl text-xs font-semibold text-os-primary dark:text-sky-300 bg-os-surface-soft dark:bg-slate-800 hover:bg-[#DFECF2] dark:hover:bg-slate-700"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenShare(item)}
                      aria-label="Share item"
                      title="Share on WhatsApp or anywhere"
                      className="min-h-[40px] px-2.5 flex items-center justify-center gap-1 rounded-xl text-xs font-semibold text-[#1F5441] dark:text-emerald-300 bg-[#E7F3EE] dark:bg-emerald-950/50 hover:bg-[#D5ECE2] dark:hover:bg-emerald-900/50"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Share</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => updateSpaceItem(item.id, {favorite: !item.favorite})}
                      aria-label={item.favorite ? 'Remove favorite' : 'Mark favorite'}
                      className={`min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl transition-colors ${
                        item.favorite
                          ? 'text-amber-500'
                          : 'text-[#89A5B2] hover:text-amber-500'
                      }`}
                    >
                      <Star className={`w-4 h-4 ${item.favorite ? 'fill-current' : ''}`} />
                    </button>

                    {item.itemType === 'file' && (
                      <button
                        type="button"
                        onClick={() => handleDownloadFile(item)}
                        aria-label="Download file"
                        className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-os-muted hover:text-os-primary hover:bg-os-surface-soft dark:hover:bg-slate-800"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    )}

                    {item.itemType === 'link' && item.url && (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => touchSpaceItem(item.id)}
                        aria-label="Open external link"
                        className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-os-muted hover:text-os-primary hover:bg-os-surface-soft dark:hover:bg-slate-800"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setMoveItemModal(item);
                        setMoveTargetFolderId(item.folderId);
                      }}
                      aria-label="Move to folder"
                      className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-os-muted hover:text-os-primary hover:bg-os-surface-soft dark:hover:bg-slate-800"
                    >
                      <FolderInput className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (item.itemType === 'link') openEditLink(item);
                        else if (item.itemType === 'note') openEditNote(item);
                        else openRenameModal(item);
                      }}
                      aria-label="Edit item"
                      className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-os-muted hover:text-os-primary hover:bg-os-surface-soft dark:hover:bg-slate-800"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        requestConfirm({
                          title: 'Delete Item',
                          message: `Permanently delete "${item.title}" from My Space?`,
                          onConfirm: () => deleteSpaceItem(item.id),
                        })
                      }
                      aria-label="Delete item"
                      className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-os-muted hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
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

      {/* Create / Rename Folder Modal */}
      <ModalShell
        open={folderModalOpen}
        onClose={() => setFolderModalOpen(false)}
        title={editingFolder ? 'Rename & Edit Folder' : 'Create New Folder'}
        subtitle={
          editingFolder
            ? undefined
            : `Inside: ${getFolderPathLabel(currentFolderId)}`
        }
      >
        <form onSubmit={handleSaveFolder} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-os-primary dark:text-slate-300 mb-1.5">
              Folder Name
            </label>
            <input
              type="text"
              required
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              placeholder="e.g. Subject Notes"
              className="w-full min-h-[44px] px-3.5 rounded-xl border border-os-border-strong dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-os-ink dark:text-slate-100"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-os-primary dark:text-slate-300 mb-1.5">
              Description (optional)
            </label>
            <textarea
              rows={2}
              value={folderDesc}
              onChange={(e) => setFolderDesc(e.target.value)}
              placeholder="What do you keep inside this folder?"
              className="w-full p-3 rounded-xl border border-os-border-strong dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-os-ink dark:text-slate-100"
            />
          </div>
          <div className="pt-2 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setFolderModalOpen(false)}
              className="min-h-[44px] px-4 rounded-xl border border-os-border-strong dark:border-slate-700 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="min-h-[44px] px-5 rounded-xl bg-os-primary text-white text-xs font-semibold"
            >
              {editingFolder ? 'Save Folder' : 'Create Folder'}
            </button>
          </div>
        </form>
      </ModalShell>

      {/* Add / Edit Link Modal */}
      <ModalShell
        open={linkModalOpen}
        onClose={() => setLinkModalOpen(false)}
        title={editingLinkItem ? 'Edit Saved Link' : 'Save Website or YouTube Link'}
      >
        <form onSubmit={handleSaveLink} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-os-primary dark:text-slate-300 mb-1.5">
              URL (Website or YouTube)
            </label>
            <input
              type="text"
              required
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://youtube.com/watch?v=..."
              className="w-full min-h-[44px] px-3.5 rounded-xl border border-os-border-strong dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-os-ink dark:text-slate-100"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-os-primary dark:text-slate-300 mb-1.5">
              Custom Title
            </label>
            <input
              type="text"
              required
              value={linkTitle}
              onChange={(e) => setLinkTitle(e.target.value)}
              placeholder="e.g. Neural Networks Visual Lecture"
              className="w-full min-h-[44px] px-3.5 rounded-xl border border-os-border-strong dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-os-ink dark:text-slate-100"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-os-primary dark:text-slate-300 mb-1.5">
              Description (optional)
            </label>
            <textarea
              rows={2}
              value={linkDesc}
              onChange={(e) => setLinkDesc(e.target.value)}
              className="w-full p-3 rounded-xl border border-os-border-strong dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-os-ink dark:text-slate-100"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-os-primary dark:text-slate-300 mb-1.5">
                Category
              </label>
              <input
                type="text"
                value={linkCat}
                onChange={(e) => setLinkCat(e.target.value)}
                className="w-full min-h-[44px] px-3.5 rounded-xl border border-os-border-strong dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-os-ink dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-os-primary dark:text-slate-300 mb-1.5">
                Tags (comma separated)
              </label>
              <input
                type="text"
                value={linkTags}
                onChange={(e) => setLinkTags(e.target.value)}
                placeholder="AI, Lecture"
                className="w-full min-h-[44px] px-3.5 rounded-xl border border-os-border-strong dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-os-ink dark:text-slate-100"
              />
            </div>
          </div>
          <div className="pt-2 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setLinkModalOpen(false)}
              className="min-h-[44px] px-4 rounded-xl border border-os-border-strong dark:border-slate-700 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="min-h-[44px] px-5 rounded-xl bg-os-primary text-white text-xs font-semibold"
            >
              Save Link
            </button>
          </div>
        </form>
      </ModalShell>

      {/* Add / Edit Note Modal */}
      <ModalShell
        open={noteModalOpen}
        onClose={() => setNoteModalOpen(false)}
        title={editingNoteItem ? 'Edit Personal Note' : 'Create Personal Note'}
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleSaveNote} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-os-primary dark:text-slate-300 mb-1.5">
              Note Title
            </label>
            <input
              type="text"
              required
              value={noteTitle}
              onChange={(e) => setNoteTitle(e.target.value)}
              placeholder="e.g. Exam Formula Cheat Sheet"
              className="w-full min-h-[44px] px-3.5 rounded-xl border border-os-border-strong dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-os-ink dark:text-slate-100"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-os-primary dark:text-slate-300 mb-1.5">
              Summary / Description
            </label>
            <input
              type="text"
              value={noteDesc}
              onChange={(e) => setNoteDesc(e.target.value)}
              placeholder="Short summary"
              className="w-full min-h-[44px] px-3.5 rounded-xl border border-os-border-strong dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-os-ink dark:text-slate-100"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-os-primary dark:text-slate-300 mb-1.5">
              Note Content
            </label>
            <textarea
              rows={6}
              required
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              placeholder="Write your notes here..."
              className="w-full p-3.5 rounded-xl border border-os-border-strong dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-os-ink dark:text-slate-100"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-os-primary dark:text-slate-300 mb-1.5">
                Category
              </label>
              <input
                type="text"
                value={noteCat}
                onChange={(e) => setNoteCat(e.target.value)}
                className="w-full min-h-[44px] px-3.5 rounded-xl border border-os-border-strong dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-os-ink dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-os-primary dark:text-slate-300 mb-1.5">
                Tags (comma separated)
              </label>
              <input
                type="text"
                value={noteTags}
                onChange={(e) => setNoteTags(e.target.value)}
                placeholder="Study, QuickRef"
                className="w-full min-h-[44px] px-3.5 rounded-xl border border-os-border-strong dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-os-ink dark:text-slate-100"
              />
            </div>
          </div>
          <div className="pt-2 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setNoteModalOpen(false)}
              className="min-h-[44px] px-4 rounded-xl border border-os-border-strong dark:border-slate-700 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="min-h-[44px] px-5 rounded-xl bg-os-primary text-white text-xs font-semibold"
            >
              Save Note
            </button>
          </div>
        </form>
      </ModalShell>

      {/* Rename / Tag File Modal */}
      <ModalShell
        open={Boolean(renameItemModal)}
        onClose={() => setRenameItemModal(null)}
        title="Rename & Organize File"
      >
        <form onSubmit={handleSaveRename} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-os-primary dark:text-slate-300 mb-1.5">
              File Name
            </label>
            <input
              type="text"
              required
              value={renameTitle}
              onChange={(e) => setRenameTitle(e.target.value)}
              className="w-full min-h-[44px] px-3.5 rounded-xl border border-os-border-strong dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-os-ink dark:text-slate-100"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-os-primary dark:text-slate-300 mb-1.5">
              Category
            </label>
            <input
              type="text"
              value={renameCategory}
              onChange={(e) => setRenameCategory(e.target.value)}
              className="w-full min-h-[44px] px-3.5 rounded-xl border border-os-border-strong dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-os-ink dark:text-slate-100"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-os-primary dark:text-slate-300 mb-1.5">
              Tags (comma separated)
            </label>
            <input
              type="text"
              value={renameTags}
              onChange={(e) => setRenameTags(e.target.value)}
              className="w-full min-h-[44px] px-3.5 rounded-xl border border-os-border-strong dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-os-ink dark:text-slate-100"
            />
          </div>
          <div className="pt-2 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setRenameItemModal(null)}
              className="min-h-[44px] px-4 rounded-xl border border-os-border-strong dark:border-slate-700 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="min-h-[44px] px-5 rounded-xl bg-os-primary text-white text-xs font-semibold"
            >
              Save Changes
            </button>
          </div>
        </form>
      </ModalShell>

      {/* Move Item Between Folders Modal */}
      <ModalShell
        open={Boolean(moveItemModal)}
        onClose={() => setMoveItemModal(null)}
        title="Move Item to Folder"
        subtitle={moveItemModal?.title}
      >
        <form onSubmit={handleMoveItem} className="space-y-4">
          <div className="max-h-64 overflow-y-auto space-y-1.5 border border-os-border dark:border-slate-800 rounded-xl p-2">
            <button
              type="button"
              onClick={() => setMoveTargetFolderId(null)}
              className={`w-full min-h-[42px] px-3 rounded-lg text-left text-xs font-semibold flex items-center gap-2 ${
                moveTargetFolderId === null
                  ? 'bg-os-primary text-white'
                  : 'hover:bg-os-surface-soft dark:hover:bg-slate-800 text-os-ink dark:text-slate-200'
              }`}
            >
              <Folder className="w-4 h-4" />
              <span>My Space (Root)</span>
            </button>
            {data.folders.map((folder) => (
              <button
                key={folder.id}
                type="button"
                onClick={() => setMoveTargetFolderId(folder.id)}
                className={`w-full min-h-[42px] px-3 rounded-lg text-left text-xs font-semibold flex items-center gap-2 ${
                  moveTargetFolderId === folder.id
                    ? 'bg-os-primary text-white'
                    : 'hover:bg-os-surface-soft dark:hover:bg-slate-800 text-os-ink dark:text-slate-200'
                }`}
              >
                <Folder className="w-4 h-4 shrink-0" />
                <span className="truncate">{getFolderPathLabel(folder.id)}</span>
              </button>
            ))}
          </div>
          <div className="flex justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setMoveItemModal(null)}
              className="min-h-[44px] px-4 rounded-xl border border-os-border-strong dark:border-slate-700 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="min-h-[44px] px-5 rounded-xl bg-os-primary text-white text-xs font-semibold"
            >
              Move Here
            </button>
          </div>
        </form>
      </ModalShell>

      {/* Item Preview Modal (Images, PDFs, Word, Excel, PowerPoint, Text, YouTube Embed, Notes) */}
      <ModalShell
        open={Boolean(previewItem)}
        onClose={() => {
          setPreviewItem(null);
          setPreviewBlob(null);
          if (previewBlobUrl) {
            URL.revokeObjectURL(previewBlobUrl);
            setPreviewBlobUrl(null);
          }
        }}
        title={previewItem?.title ?? 'Preview'}
        subtitle={previewItem?.description || previewItem?.category}
        maxWidth="max-w-3xl"
      >
        {previewItem && (
          <div className="space-y-4">
            {previewItem.itemType === 'note' && (
              <div className="space-y-3">
                <div className="p-4 rounded-xl bg-os-surface-soft dark:bg-slate-800 border border-os-border dark:border-slate-700 whitespace-pre-wrap text-sm text-os-ink dark:text-slate-100 leading-relaxed">
                  {previewItem.noteContent}
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const target = previewItem;
                      setPreviewItem(null);
                      openEditNote(target);
                    }}
                    className="min-h-[42px] px-4 rounded-xl border border-os-border-strong dark:border-slate-700 text-xs font-semibold text-os-ink-secondary dark:text-slate-200 inline-flex items-center gap-1.5"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit Note</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenShare(previewItem)}
                    className="min-h-[42px] px-4 rounded-xl bg-os-primary text-white text-xs font-semibold inline-flex items-center gap-1.5"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Share Note</span>
                  </button>
                </div>
              </div>
            )}

            {previewItem.itemType === 'link' && previewItem.url && (
              <div className="space-y-3">
                {youtubePreviewId ? (
                  <div className="aspect-video rounded-xl overflow-hidden bg-slate-900 border border-os-border-strong dark:border-slate-700">
                    <iframe
                      title={previewItem.title}
                      src={`https://www.youtube.com/embed/${youtubePreviewId}`}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                ) : null}
                <div className="p-3.5 rounded-xl bg-os-surface-soft dark:bg-slate-800 border border-os-border dark:border-slate-700 space-y-3">
                  <p className="text-xs text-os-ink-secondary dark:text-sky-300 break-all">
                    {previewItem.url}
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <a
                      href={previewItem.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="min-h-[42px] px-4 rounded-xl bg-os-primary text-white text-xs font-semibold inline-flex items-center gap-1.5"
                    >
                      <span>Open Link</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                    <button
                      type="button"
                      onClick={() => handleOpenShare(previewItem)}
                      className="min-h-[42px] px-4 rounded-xl bg-[#E7F3EE] dark:bg-emerald-950/60 text-[#1F5441] dark:text-emerald-300 text-xs font-semibold inline-flex items-center gap-1.5"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Share on WhatsApp / Anywhere</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {previewItem.itemType === 'file' && (
              <div className="space-y-3">
                <DocumentViewer
                  item={previewItem}
                  blob={previewBlob}
                  blobUrl={previewBlobUrl}
                  loading={previewLoading}
                />

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1 text-xs text-os-muted dark:text-slate-400">
                  <span className="font-mono-num">
                    Size: {formatBytes(previewItem.fileSize)} · Uploaded{' '}
                    {formatDisplayDate(previewItem.createdAt.slice(0, 10))}
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    {previewBlobUrl && (
                      <a
                        href={previewBlobUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="min-h-[42px] px-3.5 rounded-xl border border-os-border-strong dark:border-slate-700 text-os-ink-secondary dark:text-slate-200 font-semibold inline-flex items-center gap-1.5"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Open in Viewer</span>
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDownloadFile(previewItem)}
                      className="min-h-[42px] px-3.5 rounded-xl border border-os-border-strong dark:border-slate-700 text-os-ink-secondary dark:text-slate-200 font-semibold inline-flex items-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenShare(previewItem)}
                      className="min-h-[42px] px-4 rounded-xl bg-os-primary text-white font-semibold inline-flex items-center gap-1.5"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Share</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </ModalShell>

      {/* Share Modal (WhatsApp, Native Device Share, Email, Copy Link/Details) */}
      <ModalShell
        open={Boolean(shareItemModal)}
        onClose={() => setShareItemModal(null)}
        title="Share Item"
        subtitle={shareItemModal?.title}
      >
        {shareItemModal && (
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-os-surface-soft dark:bg-slate-800 border border-os-border dark:border-slate-700 text-xs text-os-ink-secondary dark:text-slate-300 space-y-1">
              <p className="font-semibold text-os-ink dark:text-slate-100">
                {shareItemModal.title}
              </p>
              {shareItemModal.itemType === 'link' && shareItemModal.url && (
                <p className="break-all text-os-primary dark:text-sky-300">
                  {shareItemModal.url}
                </p>
              )}
              {shareItemModal.itemType === 'file' && (
                <p className="text-os-muted dark:text-slate-400">
                  {shareItemModal.fileKind?.toUpperCase()} · {formatBytes(shareItemModal.fileSize)}
                </p>
              )}
            </div>

            {shareItemModal.itemType === 'file' && !supabaseStatus.configured && (
              <p className="text-[11px] text-os-muted dark:text-slate-400 leading-relaxed">
                This file is stored locally on your device (Supabase Cloud Storage is not yet
                connected, so no public web URL exists yet). Use <strong>Share File via Apps</strong>{' '}
                to send the actual file directly to WhatsApp or another app on mobile, or download
                the file first.
              </p>
            )}

            <div className="space-y-2.5">
              {isWebShareSupported() && (
                <button
                  type="button"
                  disabled={sharingNative}
                  onClick={() => handleNativeShare(shareItemModal)}
                  className="w-full min-h-[46px] px-4 rounded-xl bg-os-primary hover:bg-os-primary-hover text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
                >
                  <Share2 className="w-4 h-4" />
                  <span>
                    {sharingNative
                      ? 'Opening Share Sheet...'
                      : shareItemModal.itemType === 'file'
                        ? 'Share Actual File via Device Apps'
                        : 'Share via Device Apps'}
                  </span>
                </button>
              )}

              <a
                href={buildWhatsAppShareUrl(buildShareText(shareItemModal))}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full min-h-[46px] px-4 rounded-xl bg-[#25D366] hover:bg-[#1EB857] text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                <span>
                  {shareItemModal.itemType === 'file'
                    ? 'Send File Details on WhatsApp'
                    : 'Share on WhatsApp'}
                </span>
              </a>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => handleCopyShare(shareItemModal)}
                  className="min-h-[44px] px-4 rounded-xl border border-os-border-strong dark:border-slate-700 hover:bg-os-surface-soft dark:hover:bg-slate-800 text-xs font-semibold text-os-ink-secondary dark:text-slate-200 flex items-center justify-center gap-2"
                >
                  <Copy className="w-4 h-4" />
                  <span>
                    {shareItemModal.itemType === 'link' ? 'Copy Link' : 'Copy Details'}
                  </span>
                </button>

                <a
                  href={buildMailtoShareUrl(
                    shareItemModal.title,
                    buildShareText(shareItemModal)
                  )}
                  className="min-h-[44px] px-4 rounded-xl border border-os-border-strong dark:border-slate-700 hover:bg-os-surface-soft dark:hover:bg-slate-800 text-xs font-semibold text-os-ink-secondary dark:text-slate-200 flex items-center justify-center gap-2"
                >
                  <Mail className="w-4 h-4" />
                  <span>Share via Email</span>
                </a>
              </div>

              {shareItemModal.itemType === 'file' && (
                <button
                  type="button"
                  onClick={() => handleDownloadFile(shareItemModal)}
                  className="w-full min-h-[44px] px-4 rounded-xl bg-os-surface-soft dark:bg-slate-800 hover:bg-[#DFECF2] dark:hover:bg-slate-700 text-xs font-semibold text-os-ink-secondary dark:text-slate-200 flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Download File to Device</span>
                </button>
              )}
            </div>
          </div>
        )}
      </ModalShell>
    </div>
  );
}
