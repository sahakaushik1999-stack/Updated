import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Upload,
  Cloud,
  FolderDown,
  Layers,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Play,
  Volume2,
  VolumeX,
  Trash2,
  RefreshCw,
  Search,
  Filter,
  Check,
  ChevronDown,
  ArrowUpDown,
  MoveUp,
  MoveDown,
  Star,
  Film,
  Image as ImageIcon,
  ExternalLink,
  ShieldCheck,
  Folder,
  Database,
  ArrowRight,
  Info,
  Clock,
} from 'lucide-react';
import { soundManager } from '../utils/audio';
import { useMasterEdit } from '../context/MasterEditContext';
import {
  MediaLibraryRecord,
  R2BucketObject,
  fetchR2BucketObjects,
  fetchMediaLibrary,
  importR2Objects,
  bulkUploadToR2,
  updateMediaItem,
  reorderMediaLibrary,
  deletePortfolioMedia,
  syncSoleditionR2,
} from '../utils/mediaLibraryApi';
import { isVideoUrl } from '../utils/mediaUpload';
import { PLAYGROUND_PORTFOLIO_ITEMS } from './PlaygroundView';

export interface MediaLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'library' | 'upload' | 'import';
  targetCircleId?: string;
  onMediaChanged?: () => void;
}

const CATEGORIES = [
  'All',
  'Campaigns & Festivals',
  'Motion & Video',
  'Logofolio & Branding',
  'Editorial & Lookbooks',
  'Packaging',
];

interface UploadQueueItem {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  isVideo: boolean;
  status: 'queued' | 'uploading' | 'done' | 'error';
  progress: number;
  error?: string;
}

export const MediaLibraryModal: React.FC<MediaLibraryModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'library',
  targetCircleId,
  onMediaChanged,
}) => {
  const { isEditMode, requireEditAccess, showToast } = useMasterEdit();
  const [activeTab, setActiveTab] = useState<'library' | 'upload' | 'import'>(initialTab);

  // Tab 1: Library state
  const [libraryItems, setLibraryItems] = useState<MediaLibraryRecord[]>([]);
  const [isLoadingLibrary, setIsLoadingLibrary] = useState<boolean>(false);
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [mediaTypeFilter, setMediaTypeFilter] = useState<'all' | 'video' | 'image'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());

  // Tab 2: Upload state
  const [uploadQueue, setUploadQueue] = useState<UploadQueueItem[]>([]);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [overallProgress, setOverallProgress] = useState<number>(0);
  const [uploadFolder, setUploadFolder] = useState<string>('uploads');
  const [uploadCategory, setUploadCategory] = useState<string>('Campaigns & Festivals');
  const [uploadCircleId, setUploadCircleId] = useState<string>(targetCircleId || '');
  const [addToCircle, setAddToCircle] = useState<boolean>(Boolean(targetCircleId));
  const [setAsCover, setSetAsCover] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Tab 3: R2 Bucket Import state
  const [bucketObjects, setBucketObjects] = useState<R2BucketObject[]>([]);
  const [folders, setFolders] = useState<string[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string>('all');
  const [isLoadingBucket, setIsLoadingBucket] = useState<boolean>(false);
  const [bucketError, setBucketError] = useState<string | null>(null);
  const [nextContinuationToken, setNextContinuationToken] = useState<string | undefined>(undefined);
  const [selectedKeysForImport, setSelectedKeysForImport] = useState<Set<string>>(new Set());
  const [importCategory, setImportCategory] = useState<string>('Campaigns & Festivals');
  const [importCircleId, setImportCircleId] = useState<string>(targetCircleId || '');
  const [isImporting, setIsImporting] = useState<boolean>(false);

  // Sync state when modal opens
  useEffect(() => {
    if (isOpen) {
      loadLibrary();
      if (initialTab === 'import' || activeTab === 'import') {
        loadBucketObjects();
      }
    }
  }, [isOpen, initialTab]);

  const loadLibrary = async () => {
    setIsLoadingLibrary(true);
    try {
      const res = await fetchMediaLibrary();
      setLibraryItems(res.items || []);
    } catch (err: any) {
      console.warn('Could not load media library:', err);
    } finally {
      setIsLoadingLibrary(false);
    }
  };

  const loadBucketObjects = async (continuationToken?: string) => {
    setIsLoadingBucket(true);
    setBucketError(null);
    try {
      const prefix = selectedFolder !== 'all' ? `${selectedFolder}/` : undefined;
      const res = await fetchR2BucketObjects({
        prefix,
        continuationToken,
        maxKeys: 500,
      });

      if (res.success) {
        const supported = (res.objects || []).filter((o) => o.isVideo || o.isImage);
        if (continuationToken) {
          setBucketObjects((prev) => [...prev, ...supported]);
        } else {
          setBucketObjects(supported);
        }
        setFolders(res.folders || []);
        setNextContinuationToken(res.nextContinuationToken);
      } else {
        setBucketError(res.error || 'Failed to list bucket objects');
      }
    } catch (err: any) {
      setBucketError(err.message || 'Network error listing Cloudflare R2 bucket');
    } finally {
      setIsLoadingBucket(false);
    }
  };

  // Re-fetch bucket objects when folder changes
  useEffect(() => {
    if (isOpen && activeTab === 'import') {
      loadBucketObjects();
    }
  }, [selectedFolder, activeTab]);

  // Filtered Library Items
  const filteredLibraryItems = useMemo(() => {
    return libraryItems.filter((item) => {
      // Category filter
      if (categoryFilter !== 'All' && item.category !== categoryFilter) return false;
      // Media type filter
      if (mediaTypeFilter === 'video' && item.mediaType !== 'video') return false;
      if (mediaTypeFilter === 'image' && item.mediaType !== 'image') return false;
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesFilename = item.filename?.toLowerCase().includes(q);
        const matchesKey = item.r2Key?.toLowerCase().includes(q);
        const matchesTitle = item.title?.toLowerCase().includes(q);
        if (!matchesFilename && !matchesKey && !matchesTitle) return false;
      }
      return true;
    });
  }, [libraryItems, categoryFilter, mediaTypeFilter, searchQuery]);

  // Bulk Selection Handlers in Library
  const handleToggleSelect = (id: string) => {
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAllFiltered = () => {
    const allIds = filteredLibraryItems.map((item) => item.id);
    setSelectedItemIds(new Set(allIds));
  };

  const handleDeselectAll = () => {
    setSelectedItemIds(new Set());
  };

  // Bulk actions on selected library items
  const handleBulkChangeCategory = async (newCategory: string) => {
    requireEditAccess(async () => {
      soundManager.playClick();
      const ids = Array.from(selectedItemIds);
      if (ids.length === 0) return;

      for (const id of ids) {
        await updateMediaItem(id, { category: newCategory });
      }
      showToast(`Updated category to "${newCategory}" for ${ids.length} items.`);
      loadLibrary();
      onMediaChanged?.();
    });
  };

  const handleBulkAssignCircle = async (circleId: string) => {
    requireEditAccess(async () => {
      soundManager.playClick();
      const ids = Array.from(selectedItemIds);
      if (ids.length === 0) return;

      for (const id of ids) {
        await updateMediaItem(id, { circleId });
      }
      showToast(`Assigned ${ids.length} items to ${circleId}.`);
      loadLibrary();
      onMediaChanged?.();
    });
  };

  // Delete confirmation modal state
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    ids: string[];
    deleteFromR2: boolean;
  } | null>(null);

  const executeDelete = async (ids: string[], deleteFromR2: boolean) => {
    try {
      const res = await deletePortfolioMedia({
        ids,
        deleteFromR2,
      });
      showToast(res.message);
      setSelectedItemIds(new Set());
      setDeleteConfirmation(null);
      loadLibrary();
      onMediaChanged?.();
    } catch (err: any) {
      showToast(`Failed to remove media: ${err.message}`);
    }
  };

  const handleBulkDeleteFromPortfolio = (deleteFromR2: boolean = false) => {
    requireEditAccess(() => {
      soundManager.playClick();
      const ids = Array.from(selectedItemIds);
      if (ids.length === 0) return;
      setDeleteConfirmation({
        isOpen: true,
        ids,
        deleteFromR2,
      });
    });
  };

  const handleSingleDelete = (id: string, deleteFromR2: boolean = false) => {
    requireEditAccess(() => {
      soundManager.playClick();
      setDeleteConfirmation({
        isOpen: true,
        ids: [id],
        deleteFromR2,
      });
    });
  };

  const handleSetItemCover = async (item: MediaLibraryRecord) => {
    requireEditAccess(async () => {
      soundManager.playClick();
      try {
        await updateMediaItem(item.id, { isCover: true });
        showToast(`Set "${item.filename}" as main project cover.`);
        loadLibrary();
        onMediaChanged?.();
      } catch (err: any) {
        showToast(`Failed to set cover: ${err.message}`);
      }
    });
  };

  // Item reordering
  const handleMoveItem = async (index: number, direction: 'up' | 'down') => {
    requireEditAccess(async () => {
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= filteredLibraryItems.length) return;

      const itemsCopy = [...filteredLibraryItems];
      const temp = itemsCopy[index];
      itemsCopy[index] = itemsCopy[targetIndex];
      itemsCopy[targetIndex] = temp;

      setLibraryItems(itemsCopy);
      const orderedIds = itemsCopy.map((i) => i.id);
      await reorderMediaLibrary(orderedIds);
      onMediaChanged?.();
    });
  };

  // Dropzone and file selection for Bulk Upload
  const handleFilesSelected = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const newItems: UploadQueueItem[] = Array.from(files).map((file) => {
      const isVid = isVideoUrl(file.name) || file.type.startsWith('video/');
      return {
        id: `upload-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        file,
        name: file.name,
        size: file.size,
        type: file.type || (isVid ? 'video/mp4' : 'image/jpeg'),
        isVideo: isVid,
        status: 'queued',
        progress: 0,
      };
    });

    setUploadQueue((prev) => [...prev, ...newItems]);
    soundManager.playClick();
  };

  const handleStartBulkUpload = async () => {
    requireEditAccess(async () => {
      if (uploadQueue.length === 0 || isUploading) return;
      setIsUploading(true);
      setOverallProgress(0);

      const files = uploadQueue.map((item) => item.file);
      try {
        setUploadQueue((prev) =>
          prev.map((item) => ({ ...item, status: 'uploading', progress: 50 }))
        );

        const res = await bulkUploadToR2(files, {
          folder: uploadFolder,
          category: uploadCategory,
          circleId: uploadCircleId || undefined,
          addToCircleGallery: addToCircle,
          setCover: setAsCover,
          onProgress: (percent) => {
            setOverallProgress(percent);
            setUploadQueue((prev) =>
              prev.map((item) => ({ ...item, progress: percent }))
            );
          },
        });

        setUploadQueue((prev) =>
          prev.map((item) => ({ ...item, status: 'done', progress: 100 }))
        );
        showToast(`✓ Bulk upload complete: ${res.uploadedCount} files stored in Cloudflare R2!`);
        loadLibrary();
        onMediaChanged?.();
      } catch (err: any) {
        setUploadQueue((prev) =>
          prev.map((item) => ({ ...item, status: 'error', error: err.message }))
        );
        showToast(`Upload failed: ${err.message}`);
      } finally {
        setIsUploading(false);
      }
    });
  };

  // R2 Bucket Import handlers
  const handleToggleSelectR2Key = (key: string) => {
    setSelectedKeysForImport((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleSelectAllUnimportedR2 = () => {
    const unimported = bucketObjects.filter((o) => !o.isImported).map((o) => o.key);
    setSelectedKeysForImport(new Set(unimported));
  };

  const handleConfirmImport = async () => {
    requireEditAccess(async () => {
      const keys = Array.from(selectedKeysForImport);
      if (keys.length === 0) return;

      setIsImporting(true);
      soundManager.playClick();

      try {
        const itemsToImport = bucketObjects
          .filter((obj) => selectedKeysForImport.has(obj.key))
          .map((obj) => ({
            key: obj.key,
            url: obj.url,
            filename: obj.filename,
            size: obj.size,
            isVideo: obj.isVideo,
            contentType: obj.contentType,
            category: importCategory,
            circleId: importCircleId || undefined,
          }));

        const res = await importR2Objects({
          items: itemsToImport,
          category: importCategory,
          circleId: importCircleId || undefined,
        });

        showToast(`✓ ${res.message}`);
        setSelectedKeysForImport(new Set());
        loadBucketObjects();
        loadLibrary();
        onMediaChanged?.();
      } catch (err: any) {
        showToast(`Import error: ${err.message}`);
      } finally {
        setIsImporting(false);
      }
    });
  };

  const handleQuickSyncSoledition = async () => {
    requireEditAccess(async () => {
      setIsImporting(true);
      soundManager.playClick();
      try {
        const res = await syncSoleditionR2();
        showToast(`✓ Successfully imported ${res.count} videos from Solediton folder!`);
        loadLibrary();
        loadBucketObjects();
        onMediaChanged?.();
      } catch (err: any) {
        showToast(`Sync failed: ${err.message}`);
      } finally {
        setIsImporting(false);
      }
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-5 select-none overflow-hidden font-sans">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 15 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-6xl h-[92vh] flex flex-col rounded-2xl bg-[#0b0b0e] border border-white/15 text-white shadow-2xl overflow-hidden"
      >
        {/* ================= MODAL HEADER ================= */}
        <header className="px-5 py-4 border-b border-white/10 flex items-center justify-between shrink-0 bg-[#101015]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#e62b1e]/15 border border-[#e62b1e]/30 flex items-center justify-center text-[#e62b1e]">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] font-bold text-[#e62b1e] uppercase tracking-wider">
                  CLOUDFLARE R2
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  ACTIVE BUCKET
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-unbounded font-black tracking-tight text-white leading-tight">
                Bulk Media Manager & R2 Importer
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick Soledition Sync button */}
            <button
              onClick={handleQuickSyncSoledition}
              disabled={isImporting}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#e62b1e]/20 hover:bg-[#e62b1e] text-white border border-[#e62b1e]/40 text-xs font-mono font-bold transition-all cursor-pointer"
              title="Auto-detect & sync all 10 videos in Solediton bucket folder"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isImporting ? 'animate-spin' : ''}`} />
              <span>Sync Soledition (10 Videos)</span>
            </button>

            {/* Close Button */}
            <button
              onClick={() => {
                soundManager.playClick();
                onClose();
              }}
              className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* ================= NAVIGATION TABS ================= */}
        <div className="px-5 py-2.5 border-b border-white/10 bg-[#0e0e12] flex items-center justify-between shrink-0 flex-wrap gap-2">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                soundManager.playClick();
                setActiveTab('library');
              }}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg font-mono text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'library'
                  ? 'bg-white text-black shadow-md'
                  : 'text-neutral-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              <span>Media Library ({libraryItems.length})</span>
            </button>

            <button
              onClick={() => {
                soundManager.playClick();
                setActiveTab('upload');
              }}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg font-mono text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'upload'
                  ? 'bg-[#e62b1e] text-white shadow-md'
                  : 'text-neutral-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Bulk Upload ({uploadQueue.length})</span>
            </button>

            <button
              onClick={() => {
                soundManager.playClick();
                setActiveTab('import');
                if (bucketObjects.length === 0) loadBucketObjects();
              }}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg font-mono text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'import'
                  ? 'bg-white text-black shadow-md'
                  : 'text-neutral-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <FolderDown className="w-3.5 h-3.5" />
              <span>Import from Cloudflare R2</span>
            </button>
          </div>

          <div className="text-[11px] font-mono text-neutral-400 hidden md:block">
            Bucket: <span className="text-neutral-200">kaushik-portfolio-media</span>
          </div>
        </div>

        {/* ================= TAB 1: PORTFOLIO MEDIA LIBRARY ================= */}
        {activeTab === 'library' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Filters Bar */}
            <div className="p-4 border-b border-white/10 bg-[#0e0e12] flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                {/* Search */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search media..."
                    className="pl-8 pr-3 py-1.5 rounded-lg bg-black/60 border border-white/15 text-xs text-white placeholder:text-neutral-600 focus:border-[#e62b1e] outline-none w-36 sm:w-48 font-mono"
                  />
                </div>

                {/* Categories */}
                <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setCategoryFilter(cat)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-mono whitespace-nowrap cursor-pointer transition-colors ${
                        categoryFilter === cat
                          ? 'bg-neutral-200 text-black font-bold'
                          : 'text-neutral-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* Media Type Toggle */}
                <div className="flex items-center rounded-lg bg-black/40 border border-white/10 p-0.5">
                  <button
                    onClick={() => setMediaTypeFilter('all')}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono cursor-pointer ${
                      mediaTypeFilter === 'all' ? 'bg-white/20 text-white font-bold' : 'text-neutral-400'
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setMediaTypeFilter('video')}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono cursor-pointer flex items-center gap-1 ${
                      mediaTypeFilter === 'video' ? 'bg-white/20 text-white font-bold' : 'text-neutral-400'
                    }`}
                  >
                    <Film className="w-2.5 h-2.5" />
                    Videos
                  </button>
                  <button
                    onClick={() => setMediaTypeFilter('image')}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono cursor-pointer flex items-center gap-1 ${
                      mediaTypeFilter === 'image' ? 'bg-white/20 text-white font-bold' : 'text-neutral-400'
                    }`}
                  >
                    <ImageIcon className="w-2.5 h-2.5" />
                    Images
                  </button>
                </div>
              </div>

              {/* Bulk Actions */}
              <div className="flex items-center gap-2">
                {selectedItemIds.size > 0 ? (
                  <div className="flex items-center gap-2 bg-[#1a1a22] px-3 py-1 rounded-lg border border-white/15">
                    <span className="text-[11px] font-mono text-neutral-300 font-bold">
                      {selectedItemIds.size} selected
                    </span>

                    {/* Change category */}
                    <select
                      onChange={(e) => {
                        if (e.target.value) handleBulkChangeCategory(e.target.value);
                      }}
                      defaultValue=""
                      className="bg-black/80 border border-white/20 rounded px-2 py-1 text-[10px] font-mono text-white outline-none cursor-pointer"
                    >
                      <option value="" disabled>
                        Set Category...
                      </option>
                      {CATEGORIES.filter((c) => c !== 'All').map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>

                    {/* Assign Circle */}
                    <select
                      onChange={(e) => {
                        if (e.target.value) handleBulkAssignCircle(e.target.value);
                      }}
                      defaultValue=""
                      className="bg-black/80 border border-white/20 rounded px-2 py-1 text-[10px] font-mono text-white outline-none cursor-pointer"
                    >
                      <option value="" disabled>
                        Assign Circle...
                      </option>
                      <option value="pg-soledition">SOLEDITION (pg-soledition)</option>
                      <option value="pg-themonk-frames">THEMONK EYEWEAR (pg-themonk-frames)</option>
                      <option value="pg-superdry-outlet">SUPERDRY OUTLET</option>
                      <option value="pg-video-reels">COMMERCIAL REEL</option>
                      <option value="pg-combine">COMBINE SPORTS</option>
                      <option value="pg-cha-drops">CHA TEA DROPS</option>
                    </select>

                    {/* Remove from portfolio */}
                    <button
                      onClick={() => handleBulkDeleteFromPortfolio(false)}
                      className="px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white text-[10px] font-mono font-bold cursor-pointer transition-colors"
                      title="Remove from portfolio list without deleting file from Cloudflare R2 bucket"
                    >
                      Remove
                    </button>

                    {/* Permanent delete from R2 */}
                    <button
                      onClick={() => handleBulkDeleteFromPortfolio(true)}
                      className="p-1 rounded bg-red-950/80 hover:bg-red-700 text-red-300 hover:text-white cursor-pointer transition-colors"
                      title="PERMANENTLY delete object from Cloudflare R2 bucket"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={handleDeselectAll}
                      className="text-[10px] font-mono text-neutral-400 hover:text-white underline cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleSelectAllFiltered}
                    className="text-xs font-mono text-neutral-400 hover:text-white px-2 py-1 rounded hover:bg-white/5 cursor-pointer"
                  >
                    Select All ({filteredLibraryItems.length})
                  </button>
                )}
              </div>
            </div>

            {/* Media Grid */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5">
              {isLoadingLibrary ? (
                <div className="flex flex-col items-center justify-center h-64 gap-3 text-neutral-400">
                  <RefreshCw className="w-6 h-6 animate-spin text-[#e62b1e]" />
                  <span className="font-mono text-xs">Loading media library...</span>
                </div>
              ) : filteredLibraryItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 gap-4 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-neutral-500">
                    <Cloud className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="font-unbounded font-bold text-white text-base">No Media Found</h3>
                    <p className="text-xs text-neutral-400 max-w-sm mt-1">
                      No media matches your current filter. Click "Import from Cloudflare R2" to import files from your bucket or "Bulk Upload" to add new files.
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setActiveTab('import')}
                      className="px-4 py-2 rounded-xl bg-white text-black font-mono text-xs font-bold hover:bg-neutral-200 transition-all cursor-pointer"
                    >
                      Import from R2 Bucket
                    </button>
                    <button
                      onClick={() => setActiveTab('upload')}
                      className="px-4 py-2 rounded-xl bg-[#e62b1e] text-white font-mono text-xs font-bold hover:bg-[#d02418] transition-all cursor-pointer"
                    >
                      Bulk Upload Files
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
                  {filteredLibraryItems.map((item, idx) => {
                    const isSelected = selectedItemIds.has(item.id);
                    const isVid = item.mediaType === 'video';

                    return (
                      <div
                        key={item.id}
                        onClick={() => handleToggleSelect(item.id)}
                        className={`group relative rounded-xl overflow-hidden border transition-all cursor-pointer bg-[#14141a] flex flex-col ${
                          isSelected
                            ? 'border-[#e62b1e] ring-2 ring-[#e62b1e]/50 shadow-lg shadow-[#e62b1e]/20'
                            : 'border-white/10 hover:border-white/30'
                        }`}
                      >
                        {/* Media Preview Box */}
                        <div className="relative aspect-[4/3] bg-neutral-900 overflow-hidden flex items-center justify-center">
                          {isVid ? (
                            <MediaVideoPreview url={item.url} filename={item.filename} />
                          ) : (
                            <img
                              src={item.url}
                              alt={item.filename}
                              loading="lazy"
                              className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
                            />
                          )}

                          {/* Selection Checkbox */}
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleSelect(item.id);
                            }}
                            className={`absolute top-2 left-2 z-20 w-5 h-5 rounded-md flex items-center justify-center border transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-[#e62b1e] border-[#e62b1e] text-white'
                                : 'bg-black/60 border-white/40 text-transparent hover:border-white'
                            }`}
                          >
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </div>

                          {/* Media Type Badge */}
                          <div className="absolute top-2 right-2 z-10 px-1.5 py-0.5 rounded bg-black/70 backdrop-blur-md text-[9px] font-mono text-white flex items-center gap-1 border border-white/15">
                            {isVid ? <Film className="w-2.5 h-2.5 text-[#e62b1e]" /> : <ImageIcon className="w-2.5 h-2.5 text-blue-400" />}
                            <span>{isVid ? 'VIDEO' : 'IMAGE'}</span>
                          </div>

                          {/* Cover badge if item is active cover */}
                          {item.isCover && (
                            <div className="absolute bottom-2 left-2 z-20 px-2 py-0.5 rounded-md bg-amber-500/90 text-black font-mono text-[9px] font-bold flex items-center gap-1 shadow-md">
                              <Star className="w-2.5 h-2.5 fill-black" />
                              <span>COVER</span>
                            </div>
                          )}

                          {/* Quick Actions (Hover) */}
                          <div className="absolute bottom-2 right-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-black/85 backdrop-blur-md rounded-lg p-0.5 border border-white/20">
                            {/* Set as Cover */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSetItemCover(item);
                              }}
                              className={`p-1 hover:text-amber-400 cursor-pointer ${item.isCover ? 'text-amber-400' : 'text-neutral-400'}`}
                              title={item.isCover ? 'Current project cover' : 'Set as project cover'}
                            >
                              <Star className={`w-3 h-3 ${item.isCover ? 'fill-amber-400' : ''}`} />
                            </button>

                            {/* Move Up */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMoveItem(idx, 'up');
                              }}
                              disabled={idx === 0}
                              className="p-1 hover:text-[#e62b1e] text-neutral-400 disabled:opacity-30 cursor-pointer"
                              title="Move item earlier"
                            >
                              <MoveUp className="w-3 h-3" />
                            </button>

                            {/* Move Down */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMoveItem(idx, 'down');
                              }}
                              disabled={idx === filteredLibraryItems.length - 1}
                              className="p-1 hover:text-[#e62b1e] text-neutral-400 disabled:opacity-30 cursor-pointer"
                              title="Move item later"
                            >
                              <MoveDown className="w-3 h-3" />
                            </button>

                            {/* Remove from portfolio */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSingleDelete(item.id, false);
                              }}
                              className="p-1 hover:text-red-400 text-neutral-400 cursor-pointer"
                              title="Remove from portfolio (keep in Cloudflare R2 bucket)"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        {/* Metadata Footer */}
                        <div className="p-2.5 bg-[#0f0f14] flex flex-col gap-1 flex-1 justify-between">
                          <div>
                            <div className="text-[11px] font-mono font-bold text-white truncate" title={item.filename}>
                              {item.filename}
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] font-mono text-neutral-400 mt-0.5">
                              <span className="truncate">{item.category}</span>
                              {item.circleId && (
                                <>
                                  <span>•</span>
                                  <span className="text-[#e62b1e] font-semibold truncate">{item.circleId.replace('pg-', '')}</span>
                                </>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-1 border-t border-white/5 text-[9px] font-mono text-neutral-500">
                            <span>{item.size ? `${(item.size / (1024 * 1024)).toFixed(1)} MB` : 'Cloud'}</span>
                            <a
                              href={item.url}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-neutral-400 hover:text-white flex items-center gap-0.5"
                              title="Open original CDN URL"
                            >
                              <span>CDN</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= TAB 2: BULK UPLOAD TO CLOUDFLARE R2 ================= */}
        {activeTab === 'upload' && (
          <div className="flex-1 flex flex-col overflow-y-auto p-5 sm:p-7 gap-5">
            {/* Top Config Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-[#111117] border border-white/10">
              {/* Category */}
              <div>
                <label className="block text-[10px] font-mono uppercase text-neutral-400 mb-1 font-bold">
                  Portfolio Category
                </label>
                <select
                  value={uploadCategory}
                  onChange={(e) => setUploadCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-black/60 border border-white/20 text-xs font-mono text-white outline-none focus:border-[#e62b1e]"
                >
                  {CATEGORIES.filter((c) => c !== 'All').map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Target Circle */}
              <div>
                <label className="block text-[10px] font-mono uppercase text-neutral-400 mb-1 font-bold">
                  Assign to Project / Circle (Optional)
                </label>
                <select
                  value={uploadCircleId}
                  onChange={(e) => {
                    setUploadCircleId(e.target.value);
                    if (e.target.value) setAddToCircle(true);
                  }}
                  className="w-full px-3 py-2 rounded-lg bg-black/60 border border-white/20 text-xs font-mono text-white outline-none focus:border-[#e62b1e]"
                >
                  <option value="">Unassigned (Media Library Only)</option>
                  <option value="pg-soledition">SOLEDITION (pg-soledition)</option>
                  <option value="pg-themonk-frames">THEMONK EYEWEAR (pg-themonk-frames)</option>
                  <option value="pg-superdry-outlet">SUPERDRY OUTLET</option>
                  <option value="pg-video-reels">COMMERCIAL REEL</option>
                  <option value="pg-combine">COMBINE SPORTS</option>
                  <option value="pg-cha-drops">CHA TEA DROPS</option>
                </select>
              </div>

              {/* Bucket Folder */}
              <div>
                <label className="block text-[10px] font-mono uppercase text-neutral-400 mb-1 font-bold">
                  R2 Bucket Folder
                </label>
                <input
                  type="text"
                  value={uploadFolder}
                  onChange={(e) => setUploadFolder(e.target.value)}
                  placeholder="e.g. uploads, soledition, videos"
                  className="w-full px-3 py-2 rounded-lg bg-black/60 border border-white/20 text-xs font-mono text-white outline-none focus:border-[#e62b1e]"
                />
              </div>
            </div>

            {/* Checkbox Options */}
            <div className="flex items-center gap-6 text-xs font-mono text-neutral-300">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={addToCircle}
                  onChange={(e) => setAddToCircle(e.target.checked)}
                  className="rounded border-white/30 text-[#e62b1e] focus:ring-0"
                />
                <span>Add uploaded media to project gallery</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={setAsCover}
                  onChange={(e) => setSetAsCover(e.target.checked)}
                  className="rounded border-white/30 text-[#e62b1e] focus:ring-0"
                />
                <span>Set first item as main project cover</span>
              </label>
            </div>

            {/* Drag & Drop Zone */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                handleFilesSelected(e.dataTransfer.files);
              }}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-white/20 hover:border-[#e62b1e] rounded-2xl p-8 flex flex-col items-center justify-center text-center bg-[#0d0d12] hover:bg-white/[0.02] transition-colors cursor-pointer group"
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,video/*"
                onChange={(e) => handleFilesSelected(e.target.files)}
                className="hidden"
              />
              <div className="w-14 h-14 rounded-2xl bg-white/5 group-hover:bg-[#e62b1e]/15 border border-white/10 group-hover:border-[#e62b1e]/40 flex items-center justify-center text-white group-hover:text-[#e62b1e] transition-colors mb-3">
                <Upload className="w-7 h-7" />
              </div>
              <h3 className="font-unbounded font-black text-white text-base">
                Drag & Drop Multiple Images & Videos
              </h3>
              <p className="text-xs text-neutral-400 mt-1 max-w-md">
                Select hundreds of files at once. All items are permanently uploaded to Cloudflare R2 and indexed in your persistent portfolio database.
              </p>
              <span className="mt-4 px-4 py-2 rounded-xl bg-white/10 group-hover:bg-[#e62b1e] text-white font-mono text-xs font-bold transition-all">
                Browse Files
              </span>
            </div>

            {/* Upload Queue List */}
            {uploadQueue.length > 0 && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-white uppercase">
                    Upload Queue ({uploadQueue.length} files)
                  </span>
                  <button
                    onClick={() => setUploadQueue([])}
                    className="text-xs font-mono text-neutral-400 hover:text-red-400 cursor-pointer"
                  >
                    Clear Queue
                  </button>
                </div>

                {/* Overall Progress Bar */}
                {isUploading && (
                  <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-[#e62b1e] h-full transition-all duration-300"
                      style={{ width: `${overallProgress}%` }}
                    />
                  </div>
                )}

                <div className="max-h-64 overflow-y-auto rounded-xl border border-white/10 bg-[#0e0e14] divide-y divide-white/5">
                  {uploadQueue.map((item) => (
                    <div key={item.id} className="p-3 flex items-center justify-between text-xs font-mono">
                      <div className="flex items-center gap-3 truncate">
                        {item.isVideo ? (
                          <Film className="w-4 h-4 text-[#e62b1e] shrink-0" />
                        ) : (
                          <ImageIcon className="w-4 h-4 text-blue-400 shrink-0" />
                        )}
                        <span className="text-white truncate">{item.name}</span>
                        <span className="text-neutral-500">({(item.size / (1024 * 1024)).toFixed(1)} MB)</span>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        {item.status === 'queued' && (
                          <span className="text-neutral-400 text-[10px]">Queued</span>
                        )}
                        {item.status === 'uploading' && (
                          <span className="text-[#e62b1e] text-[10px] animate-pulse">Uploading {item.progress}%</span>
                        )}
                        {item.status === 'done' && (
                          <span className="text-emerald-400 text-[10px] flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Uploaded
                          </span>
                        )}
                        {item.status === 'error' && (
                          <span className="text-red-400 text-[10px] flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5" /> Failed
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Action Button */}
                <div className="flex justify-end pt-2">
                  <button
                    onClick={handleStartBulkUpload}
                    disabled={isUploading}
                    className="px-6 py-3 rounded-xl bg-[#e62b1e] hover:bg-[#d02418] disabled:opacity-50 text-white font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-[#e62b1e]/25 transition-all cursor-pointer"
                  >
                    {isUploading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Uploading ({overallProgress}%)...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        <span>Start Bulk Upload to Cloudflare R2</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 3: IMPORT FROM CLOUDFLARE R2 ================= */}
        {activeTab === 'import' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Top Toolbar */}
            <div className="p-4 border-b border-white/10 bg-[#0e0e12] flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                {/* Folder filter */}
                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-mono text-neutral-400 uppercase font-bold">Folder:</span>
                  <select
                    value={selectedFolder}
                    onChange={(e) => setSelectedFolder(e.target.value)}
                    className="px-2.5 py-1 rounded bg-black/60 border border-white/20 text-xs font-mono text-white outline-none cursor-pointer"
                  >
                    <option value="all">All Bucket Objects</option>
                    {folders.map((f) => (
                      <option key={f} value={f}>
                        {f}/
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={() => loadBucketObjects()}
                  disabled={isLoadingBucket}
                  className="p-1.5 rounded bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white cursor-pointer transition-colors"
                  title="Refresh bucket objects from Cloudflare"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingBucket ? 'animate-spin' : ''}`} />
                </button>

                <div className="text-[11px] font-mono text-neutral-400">
                  Found: <span className="text-white font-bold">{bucketObjects.length}</span> objects
                </div>
              </div>

              {/* Selection & Import Action Controls */}
              <div className="flex items-center gap-3 flex-wrap">
                <button
                  onClick={handleSelectAllUnimportedR2}
                  className="text-xs font-mono text-neutral-300 hover:text-white underline cursor-pointer"
                >
                  Select All Unimported
                </button>

                {/* Target Category for Import */}
                <select
                  value={importCategory}
                  onChange={(e) => setImportCategory(e.target.value)}
                  className="px-2 py-1 rounded bg-black/80 border border-white/20 text-xs font-mono text-white outline-none cursor-pointer"
                >
                  {CATEGORIES.filter((c) => c !== 'All').map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>

                {/* Target Circle for Import */}
                <select
                  value={importCircleId}
                  onChange={(e) => setImportCircleId(e.target.value)}
                  className="px-2 py-1 rounded bg-black/80 border border-white/20 text-xs font-mono text-white outline-none cursor-pointer"
                >
                  <option value="">No Circle (Library Only)</option>
                  <option value="pg-soledition">SOLEDITION (pg-soledition)</option>
                  <option value="pg-themonk-frames">THEMONK EYEWEAR (pg-themonk-frames)</option>
                  <option value="pg-superdry-outlet">SUPERDRY OUTLET</option>
                  <option value="pg-video-reels">COMMERCIAL REEL</option>
                  <option value="pg-combine">COMBINE SPORTS</option>
                  <option value="pg-cha-drops">CHA TEA DROPS</option>
                </select>

                {/* Confirm Import Button */}
                <button
                  onClick={handleConfirmImport}
                  disabled={selectedKeysForImport.size === 0 || isImporting}
                  className="px-4 py-1.5 rounded-xl bg-[#e62b1e] hover:bg-[#d02418] disabled:opacity-40 text-white font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
                >
                  {isImporting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Importing...</span>
                    </>
                  ) : (
                    <>
                      <FolderDown className="w-3.5 h-3.5" />
                      <span>Import ({selectedKeysForImport.size})</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Bucket Grid */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5">
              {isLoadingBucket && bucketObjects.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 gap-3 text-neutral-400">
                  <RefreshCw className="w-6 h-6 animate-spin text-[#e62b1e]" />
                  <span className="font-mono text-xs">Querying Cloudflare R2 bucket with ListObjectsV2...</span>
                </div>
              ) : bucketError ? (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 font-mono text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{bucketError}</span>
                </div>
              ) : bucketObjects.length === 0 ? (
                <div className="text-center py-16 text-neutral-400 font-mono text-xs">
                  No objects found in Cloudflare R2 bucket for this folder.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
                  {bucketObjects.map((obj) => {
                    const isSelected = selectedKeysForImport.has(obj.key);
                    const isImported = obj.isImported;

                    return (
                      <div
                        key={obj.key}
                        onClick={() => handleToggleSelectR2Key(obj.key)}
                        className={`group relative rounded-xl overflow-hidden border transition-all cursor-pointer bg-[#14141a] flex flex-col ${
                          isSelected
                            ? 'border-[#e62b1e] ring-2 ring-[#e62b1e]/50 shadow-lg'
                            : isImported
                            ? 'border-emerald-500/30 opacity-80'
                            : 'border-white/10 hover:border-white/30'
                        }`}
                      >
                        {/* Preview Box */}
                        <div className="relative aspect-[4/3] bg-neutral-900 overflow-hidden flex items-center justify-center">
                          {obj.isVideo ? (
                            <MediaVideoPreview url={obj.url} filename={obj.filename} />
                          ) : (
                            <img
                              src={obj.url}
                              alt={obj.filename}
                              loading="lazy"
                              className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
                            />
                          )}

                          {/* Checkbox */}
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleSelectR2Key(obj.key);
                            }}
                            className={`absolute top-2 left-2 z-20 w-5 h-5 rounded-md flex items-center justify-center border transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-[#e62b1e] border-[#e62b1e] text-white'
                                : 'bg-black/60 border-white/40 text-transparent hover:border-white'
                            }`}
                          >
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </div>

                          {/* Imported Badge */}
                          {isImported && (
                            <div className="absolute top-2 right-2 z-10 px-1.5 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/40 text-[9px] font-mono text-emerald-300 flex items-center gap-1">
                              <CheckCircle2 className="w-2.5 h-2.5" />
                              <span>Imported</span>
                            </div>
                          )}
                        </div>

                        {/* Metadata Footer */}
                        <div className="p-2.5 bg-[#0f0f14] flex flex-col gap-1 flex-1 justify-between">
                          <div>
                            <div className="text-[11px] font-mono font-bold text-white truncate" title={obj.filename}>
                              {obj.filename}
                            </div>
                            <div className="text-[10px] font-mono text-neutral-400 mt-0.5 truncate">
                              Folder: {obj.folder}
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-1 border-t border-white/5 text-[9px] font-mono text-neutral-500">
                            <span>{obj.size ? `${(obj.size / (1024 * 1024)).toFixed(1)} MB` : ''}</span>
                            <span className="uppercase text-[8px] px-1 py-0.5 rounded bg-white/5">
                              {obj.isVideo ? 'VIDEO' : 'IMAGE'}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Load More Pagination */}
              {nextContinuationToken && (
                <div className="flex justify-center pt-6 pb-2">
                  <button
                    onClick={() => loadBucketObjects(nextContinuationToken)}
                    disabled={isLoadingBucket}
                    className="px-6 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-mono text-xs font-bold transition-all cursor-pointer flex items-center gap-2"
                  >
                    {isLoadingBucket ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                    <span>Load Next 500 Bucket Objects</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* In-Modal Delete Confirmation Overlay (Clean, immune to iframe dialog blocking) */}
        <AnimatePresence>
          {deleteConfirmation && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 select-none"
            >
              <div className="w-full max-w-md bg-[#131318] border border-white/20 rounded-2xl p-6 text-center shadow-2xl flex flex-col items-center gap-4">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    deleteConfirmation.deleteFromR2
                      ? 'bg-red-500/20 text-red-500 border border-red-500/30'
                      : 'bg-neutral-800 text-neutral-300 border border-white/10'
                  }`}
                >
                  <Trash2 className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-unbounded font-bold text-base text-white">
                    {deleteConfirmation.deleteFromR2 ? 'Permanently Delete From R2?' : 'Remove From Portfolio?'}
                  </h4>
                  <p className="text-xs text-neutral-400 mt-2 font-mono leading-relaxed">
                    {deleteConfirmation.deleteFromR2
                      ? `This will PERMANENTLY remove ${deleteConfirmation.ids.length} object(s) from your Cloudflare R2 bucket. This cannot be undone.`
                      : `This will remove ${deleteConfirmation.ids.length} item(s) from your portfolio display. The media files will remain safely stored in your Cloudflare R2 bucket.`}
                  </p>
                </div>
                <div className="flex items-center gap-3 w-full pt-2">
                  <button
                    onClick={() => setDeleteConfirmation(null)}
                    className="flex-1 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-mono text-xs font-bold transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => executeDelete(deleteConfirmation.ids, deleteConfirmation.deleteFromR2)}
                    className={`flex-1 py-2.5 rounded-xl font-mono text-xs font-bold transition-colors cursor-pointer text-white ${
                      deleteConfirmation.deleteFromR2 ? 'bg-red-600 hover:bg-red-700' : 'bg-[#e62b1e] hover:bg-[#d02418]'
                    }`}
                  >
                    {deleteConfirmation.deleteFromR2 ? 'Delete Permanently' : 'Confirm Remove'}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

/**
 * Lazy Video Preview Pin with Hover-to-Play, Poster Snap, and Audio Unmute Toggle
 * Prevents black video preview frames (Requirement 19)
 */
const MediaVideoPreview: React.FC<{ url: string; filename: string }> = ({ url, filename }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isAudioActive, setIsAudioActive] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Auto seek to 0.5s to generate poster frame immediately and avoid black frame
  const handleLoadedMetadata = () => {
    if (videoRef.current && !isPlaying) {
      try {
        videoRef.current.currentTime = 0.5;
      } catch (_) {}
    }
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
    if (videoRef.current && !hasError) {
      videoRef.current.muted = true;
      videoRef.current
        .play()
        .then(() => {
          setIsPlaying(true);
          if (isAudioActive && videoRef.current) {
            videoRef.current.muted = false;
          }
        })
        .catch(() => {});
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    if (videoRef.current) {
      videoRef.current.pause();
      setIsPlaying(false);
      try {
        videoRef.current.currentTime = 0.5;
      } catch (_) {}
    }
  };

  const toggleAudio = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      const nextAudio = !isAudioActive;
      videoRef.current.muted = !nextAudio;
      setIsAudioActive(nextAudio);
    }
  };

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="relative w-full h-full bg-black overflow-hidden flex items-center justify-center"
    >
      {hasError ? (
        <div className="w-full h-full flex flex-col items-center justify-center bg-neutral-900 text-neutral-500 p-2 text-center select-none">
          <Film className="w-6 h-6 text-[#e62b1e] mb-1 opacity-70" />
          <span className="text-[10px] font-mono truncate max-w-[120px]">{filename}</span>
        </div>
      ) : (
        <video
          ref={videoRef}
          src={`${url}#t=0.5`}
          playsInline
          loop
          muted
          preload="metadata"
          onLoadedMetadata={handleLoadedMetadata}
          onError={() => setHasError(true)}
          className="w-full h-full object-cover object-center pointer-events-none"
        />
      )}

      {/* Play Icon if Not Playing */}
      {!isPlaying && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-8 h-8 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center text-white border border-white/20">
            <Play className="w-3.5 h-3.5 fill-white text-white ml-0.5" />
          </div>
        </div>
      )}

      {/* Audio Button on Hover */}
      {isHovered && isPlaying && !hasError && (
        <button
          onClick={toggleAudio}
          className="absolute bottom-2 left-2 z-30 p-1.5 rounded-full bg-black/80 hover:bg-[#e62b1e] text-white backdrop-blur-md transition-colors cursor-pointer"
          title={isAudioActive ? 'Mute Audio' : 'Unmute Audio'}
        >
          {isAudioActive ? <Volume2 className="w-3 h-3" /> : <VolumeX className="w-3 h-3" />}
        </button>
      )}
    </div>
  );
};
