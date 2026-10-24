import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Project, ThemeMode, ViewMode } from '../types/portfolio';
import { PlaygroundItem } from './PlaygroundView';
import {
  saveImageOverride,
  removeImageOverride,
  resetAllImageOverrides,
  processImageFile,
  uploadImageFileToServer,
} from '../utils/imageStorage';
import { saveCircleCustomization, resetCircleCustomization } from '../utils/circleStorage';
import { resolveImageUrl, uploadVideoToServer, isVideoUrl } from '../utils/mediaUpload';
import { soundManager } from '../utils/audio';
import { useMasterEdit } from '../context/MasterEditContext';
import {
  Upload,
  Link as LinkIcon,
  RotateCcw,
  Check,
  X,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
  Database,
  Trash2,
  Sparkles,
  Layers,
  CircleDot,
  CheckCircle2,
  Video,
} from 'lucide-react';

export interface ImageCustomizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: Project[];
  recentWorks?: PlaygroundItem[];
  currentView?: ViewMode;
  theme: ThemeMode;
  initialProjectId?: string;
  customOverrides: Record<string, string>;
  defaultTab?: 'video-url' | 'image-url' | 'upload' | 'url' | 'library';
}

export interface CustomizerItem {
  id: string;
  index: string;
  title: string;
  subtitle: string;
  client: string;
  category: string;
  imageUrl: string;
  group: 'work' | 'recent';
}

// Built-in library presets covering both Work Page and Recent Works
const PRESET_LIBRARY = [
  {
    id: 'holiday-sale',
    title: 'Holiday Sale Creative',
    url: 'https://lh3.googleusercontent.com/d/14AWG2JsZzgdRATdPjqSg8m0FFv37KBBe',
  },
  {
    id: 'harmony',
    title: 'Harmony Audio Lifestyle',
    url: 'https://lh3.googleusercontent.com/d/1agzVDpcq8vSrnOGT_BEJ7e1MHZ8hFEj8',
  },
  {
    id: 'biocule',
    title: 'Biocule Skincare Clean Science',
    url: 'https://lh3.googleusercontent.com/d/1XTLWQHeecXDiqDj6s47NGrH5etbHYwJC',
  },
  {
    id: 'cha-tea-drops',
    title: 'Cha Tea Drops Apothecary',
    url: 'https://lh3.googleusercontent.com/d/1YN1oXYTc36xEkab8V8sI6ukuwWxT2whv',
  },
  {
    id: 'the-trost',
    title: 'The Trost (Meta Ads)',
    url: 'https://lh3.googleusercontent.com/d/1fa7b5lZ7TJxBeiDy-LkMcDHwYwX7rTyE',
  },
  {
    id: 'horology',
    title: 'All About Horology Luxury Monogram',
    url: 'https://lh3.googleusercontent.com/d/1x4_g_GGWR-xaKnY3frEV_7042tVRe1Ex',
  },
  {
    id: 'superdry',
    title: 'Superdry Urban Movement',
    url: 'https://lh3.googleusercontent.com/d/1bGvq0zgXMph9GHxUY035eSTh-N0NpyeD',
  },
  {
    id: 'combine-sports',
    title: 'Combine Sports Identity',
    url: 'https://lh3.googleusercontent.com/d/14r_oZJ4vsQqxCmcfI-vxmqlnS09MTFh-',
  },
  {
    id: 'video-projects',
    title: 'Video Projects & Motion Teasers',
    url: 'https://lh3.googleusercontent.com/d/1fnjvR3EPw5FL6kELoN0FdqbCzs4nALgs',
  },
  {
    id: 'better-candle',
    title: 'Better Candle Packaging',
    url: '/projects/better-candle.png',
  },
  {
    id: 'soledition',
    title: 'Soledition Sneaker Fest',
    url: '/projects/soledition-2024.webp',
  },
  {
    id: 'shuchi',
    title: 'Shuchi Conveyor Beltings',
    url: '/projects/shuchi-beltings.webp',
  },
  {
    id: 'masala-synergy',
    title: 'Masala Synergy Apothecary',
    url: '/projects/masala-synergy.webp',
  },
  {
    id: 'themonk-tokyo',
    title: 'Tokyo Eyewear Lookbook',
    url: '/projects/the-world-collection-tokyo.webp',
  },
  {
    id: 'cha-brochure',
    title: 'Cha Botanical Storybook',
    url: '/projects/cha-brochure.webp',
  },
];

export const ImageCustomizerModal: React.FC<ImageCustomizerModalProps> = ({
  isOpen,
  onClose,
  projects,
  recentWorks = [],
  currentView = 'work',
  theme,
  initialProjectId,
  customOverrides,
  defaultTab = 'upload',
}) => {
  // Normalize both sets into a unified list
  const workItems: CustomizerItem[] = useMemo(() => {
    return projects.map((p) => ({
      id: p.id,
      index: p.index || '01',
      title: p.title,
      subtitle: p.subtitle || '',
      client: p.client || '',
      category: p.category || 'WORK',
      imageUrl: customOverrides[p.id] || p.imageUrl || '',
      group: 'work' as const,
    }));
  }, [projects, customOverrides]);

  const recentItems: CustomizerItem[] = useMemo(() => {
    return recentWorks.map((rw) => {
      const key = rw.id.replace('pg-', '');
      const currentUrl =
        customOverrides[rw.id] ||
        customOverrides[key] ||
        rw.imageUrl ||
        '';
      return {
        id: rw.id,
        index: rw.index || '01',
        title: rw.title,
        subtitle: rw.subtitle || '',
        client: rw.client || '',
        category: rw.category || 'RECENT',
        imageUrl: currentUrl,
        group: 'recent' as const,
      };
    });
  }, [recentWorks, customOverrides]);

  // Determine initial scope ('work' | 'recent')
  const determineInitialScope = (): 'work' | 'recent' => {
    if (initialProjectId) {
      if (
        initialProjectId.startsWith('pg-') ||
        recentItems.some((r) => r.id === initialProjectId || r.id === `pg-${initialProjectId}` || r.id.replace('pg-', '') === initialProjectId)
      ) {
        return 'recent';
      }
      return 'work';
    }
    return currentView === 'playground' ? 'recent' : 'work';
  };

  const [activeScope, setActiveScope] = useState<'work' | 'recent'>(determineInitialScope);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'video-url' | 'image-url'>(
    defaultTab === 'video-url' ? 'video-url' : 'image-url'
  );
  const [urlInput, setUrlInput] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync state whenever the modal opens or target changes
  useEffect(() => {
    if (isOpen) {
      const nextScope = determineInitialScope();
      setActiveScope(nextScope);
      setActiveTab(defaultTab === 'video-url' ? 'video-url' : 'image-url');
      setUrlInput('');
      setUploadProgress(0);

      const candidateList = nextScope === 'recent' ? recentItems : workItems;
      if (initialProjectId) {
        const exact = candidateList.find((item) => item.id === initialProjectId);
        if (exact) {
          setSelectedProjectId(exact.id);
        } else {
          const altId = initialProjectId.startsWith('pg-')
            ? initialProjectId.replace('pg-', '')
            : `pg-${initialProjectId}`;
          const alt = candidateList.find((item) => item.id === altId);
          setSelectedProjectId(alt ? alt.id : candidateList[0]?.id || '');
        }
      } else {
        setSelectedProjectId(candidateList[0]?.id || '');
      }
    }
  }, [isOpen, initialProjectId, currentView, defaultTab]);

  // Current scope items list
  const currentScopeItems = activeScope === 'recent' ? recentItems : workItems;

  // Selected item
  const selectedItem: CustomizerItem =
    currentScopeItems.find((item) => item.id === selectedProjectId) ||
    currentScopeItems[0] || {
      id: 'default',
      index: '01',
      title: 'Project',
      subtitle: '',
      client: '',
      category: 'GENERAL',
      imageUrl: '',
      group: 'work',
    };

  const currentActiveUrl =
    customOverrides[selectedItem.id] ||
    customOverrides[selectedItem.id.replace('pg-', '')] ||
    selectedItem.imageUrl;

  const hasOverride = Boolean(
    customOverrides[selectedItem.id] ||
    customOverrides[selectedItem.id.replace('pg-', '')]
  );

  const customCount = Object.keys(customOverrides).length;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3200);
  };

  // Keyboard escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Handle file drop or selection
  const handleFile = async (file: File) => {
    const isVideo = file && (file.type.startsWith('video/') || Boolean(file.name.match(/\.(mp4|webm|mov|ogg|m4v)$/i)));
    if (!file || (!file.type.startsWith('image/') && !isVideo)) {
      showToast('Please select a valid image or video file (PNG, JPG, WebP, MP4, WebM)');
      return;
    }

    if (isVideo) {
      try {
        setIsProcessing(true);
        setUploadProgress(15);
        soundManager.playClick();
        const vidResult = await uploadVideoToServer(file, (pct) => setUploadProgress(pct));
        if (vidResult.success && vidResult.url) {
          const videoUrl = vidResult.url;
          if (selectedItem.id.startsWith('pg-') || activeScope === 'recent') {
            saveCircleCustomization(selectedItem.id, { imageUrl: videoUrl, videoUrl, mediaType: 'video' });
            const altId = selectedItem.id.startsWith('pg-') ? selectedItem.id.replace('pg-', '') : `pg-${selectedItem.id}`;
            saveCircleCustomization(altId, { imageUrl: videoUrl, videoUrl, mediaType: 'video' });
            await saveImageOverride(altId, videoUrl);
          }
          await saveImageOverride(selectedItem.id, videoUrl);
          setUploadProgress(100);
          showToast(`✓ Video uploaded & saved to server for "${selectedItem.title}"!`);
        } else {
          showToast('Failed to upload video to server.');
        }
      } catch (err) {
        console.error('Video upload error:', err);
        showToast('Failed to process video file.');
      } finally {
        setIsProcessing(false);
        setUploadProgress(0);
      }
      return;
    }
    try {
      setIsProcessing(true);
      setUploadProgress(20);
      soundManager.playClick();

      // 1. Upload directly to backend server
      const serverUrl = await uploadImageFileToServer(file, selectedItem.id);
      setUploadProgress(70);

      if (serverUrl) {
        // If recent works circle, also sync circle storage
        if (selectedItem.id.startsWith('pg-') || activeScope === 'recent') {
          saveCircleCustomization(selectedItem.id, { imageUrl: serverUrl, mediaType: 'image' });
          const altId = selectedItem.id.startsWith('pg-') ? selectedItem.id.replace('pg-', '') : `pg-${selectedItem.id}`;
          saveCircleCustomization(altId, { imageUrl: serverUrl, mediaType: 'image' });
          await saveImageOverride(altId, serverUrl);
        }
        await saveImageOverride(selectedItem.id, serverUrl);
        setUploadProgress(100);
        showToast(`✓ Image uploaded & saved to server for "${selectedItem.title}"!`);
      } else {
        // Fallback: high-res base64 processing and backend sync
        const processedDataUrl = await processImageFile(file, 2048);
        if (selectedItem.id.startsWith('pg-') || activeScope === 'recent') {
          saveCircleCustomization(selectedItem.id, { imageUrl: processedDataUrl, mediaType: 'image' });
          const altId = selectedItem.id.startsWith('pg-') ? selectedItem.id.replace('pg-', '') : `pg-${selectedItem.id}`;
          saveCircleCustomization(altId, { imageUrl: processedDataUrl, mediaType: 'image' });
          await saveImageOverride(altId, processedDataUrl);
        }
        await saveImageOverride(selectedItem.id, processedDataUrl);
        setUploadProgress(100);
        showToast(`✓ Image processed & saved for "${selectedItem.title}"!`);
      }
    } catch (err) {
      console.error('File upload error:', err);
      showToast('Failed to process image file. Please try another image.');
    } finally {
      setIsProcessing(false);
      setUploadProgress(0);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleMediaUrlSubmit = async (urlToSave: string, targetType: 'image' | 'video') => {
    if (!urlToSave.trim()) return;
    try {
      setIsProcessing(true);
      soundManager.playClick();
      const resolved = resolveImageUrl(urlToSave.trim());

      if (selectedItem.id.startsWith('pg-') || activeScope === 'recent') {
        saveCircleCustomization(selectedItem.id, {
          imageUrl: resolved,
          videoUrl: targetType === 'video' ? resolved : undefined,
          mediaType: targetType,
        });
        const altId = selectedItem.id.startsWith('pg-') ? selectedItem.id.replace('pg-', '') : `pg-${selectedItem.id}`;
        saveCircleCustomization(altId, {
          imageUrl: resolved,
          videoUrl: targetType === 'video' ? resolved : undefined,
          mediaType: targetType,
        });
        await saveImageOverride(altId, resolved);
      }
      await saveImageOverride(selectedItem.id, resolved);
      showToast(`✓ ${targetType === 'video' ? 'Video' : 'Image'} link saved to backend for "${selectedItem.title}"!`);
      setUrlInput('');
    } catch (err) {
      console.error('URL save error:', err);
      showToast('Failed to save URL.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;
    try {
      setIsProcessing(true);
      soundManager.playClick();
      const resolved = resolveImageUrl(urlInput.trim());

      if (selectedItem.id.startsWith('pg-') || activeScope === 'recent') {
        saveCircleCustomization(selectedItem.id, { imageUrl: resolved, mediaType: 'image' });
        const altId = selectedItem.id.startsWith('pg-') ? selectedItem.id.replace('pg-', '') : `pg-${selectedItem.id}`;
        saveCircleCustomization(altId, { imageUrl: resolved, mediaType: 'image' });
        await saveImageOverride(altId, resolved);
      }
      await saveImageOverride(selectedItem.id, resolved);
      showToast(`✓ Image link saved to backend for "${selectedItem.title}"!`);
      setUrlInput('');
    } catch (err) {
      console.error('URL save error:', err);
      showToast('Failed to save image URL.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePasteFromClipboard = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        const text = await navigator.clipboard.readText();
        if (text && text.trim()) {
          const trimmed = text.trim();
          setUrlInput(trimmed);
          setIsProcessing(true);
          soundManager.playClick();
          const resolved = resolveImageUrl(trimmed);

          if (selectedItem.id.startsWith('pg-') || activeScope === 'recent') {
            saveCircleCustomization(selectedItem.id, { imageUrl: resolved, mediaType: 'image' });
            const altId = selectedItem.id.startsWith('pg-') ? selectedItem.id.replace('pg-', '') : `pg-${selectedItem.id}`;
            saveCircleCustomization(altId, { imageUrl: resolved, mediaType: 'image' });
            await saveImageOverride(altId, resolved);
          }
          await saveImageOverride(selectedItem.id, resolved);
          showToast(`✓ Image link pasted & saved to server for "${selectedItem.title}"!`);
          setIsProcessing(false);
          return;
        }
      }
      showToast('Clipboard is empty or permission denied. Paste manually below.');
    } catch {
      showToast('Please paste the URL directly into the input field below.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSelectPreset = async (presetUrl: string, presetTitle: string) => {
    try {
      soundManager.playClick();
      if (selectedItem.id.startsWith('pg-') || activeScope === 'recent') {
        saveCircleCustomization(selectedItem.id, { imageUrl: presetUrl, mediaType: 'image' });
        const altId = selectedItem.id.startsWith('pg-') ? selectedItem.id.replace('pg-', '') : `pg-${selectedItem.id}`;
        saveCircleCustomization(altId, { imageUrl: presetUrl, mediaType: 'image' });
        await saveImageOverride(altId, presetUrl);
      }
      await saveImageOverride(selectedItem.id, presetUrl);
      showToast(`✓ Applied & saved "${presetTitle}" to server!`);
    } catch (err) {
      console.error(err);
      showToast('Failed to apply preset.');
    }
  };

  const handleResetCurrent = async () => {
    if (!selectedItem) return;
    try {
      soundManager.playClick();
      if (selectedItem.id.startsWith('pg-') || activeScope === 'recent') {
        resetCircleCustomization(selectedItem.id);
        const altId = selectedItem.id.startsWith('pg-') ? selectedItem.id.replace('pg-', '') : `pg-${selectedItem.id}`;
        resetCircleCustomization(altId);
        await removeImageOverride(altId);
      }
      await removeImageOverride(selectedItem.id);
      showToast(`✓ Reset "${selectedItem.title}" to default image.`);
    } catch (err) {
      console.error(err);
    }
  };

  const handleResetAll = async () => {
    try {
      soundManager.playClick();
      await resetAllImageOverrides();
      showToast('✓ All images reset to default portfolio values.');
    } catch (err) {
      console.error(err);
    }
  };

  const currentIndex = currentScopeItems.findIndex((p) => p.id === selectedProjectId);
  const handlePrevItem = () => {
    if (currentScopeItems.length === 0) return;
    const prev = (currentIndex - 1 + currentScopeItems.length) % currentScopeItems.length;
    setSelectedProjectId(currentScopeItems[prev].id);
  };
  const handleNextItem = () => {
    if (currentScopeItems.length === 0) return;
    const next = (currentIndex + 1) % currentScopeItems.length;
    setSelectedProjectId(currentScopeItems[next].id);
  };

  const { isEditMode } = useMasterEdit();

  return (
    <AnimatePresence>
      {isOpen && isEditMode && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 md:p-8 bg-black/85 backdrop-blur-md overflow-y-auto"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.96, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: 15 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className={`relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl shadow-2xl overflow-hidden border ${
              theme === 'light'
                ? 'bg-[#fbfbf8] border-neutral-300 text-neutral-900'
                : 'bg-[#121216] border-neutral-800 text-neutral-100'
            }`}
          >
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between px-5 sm:px-7 py-4 border-b border-neutral-200 dark:border-neutral-800 gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#e62b1e]/10 text-[#e62b1e] flex items-center justify-center font-bold">
                  <ImageIcon size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-syne text-lg sm:text-xl font-black uppercase tracking-tight">
                      Website Image Manager
                    </h2>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20">
                      <Database size={10} /> Server Synced
                    </span>
                  </div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    Upload and customize images and videos for both the <strong>Work Page</strong> and <strong>Recent Work</strong>.
                  </p>
                </div>
              </div>

              {/* Scope Switcher: Work Page vs Recent Work */}
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <div className="flex items-center p-1 rounded-xl bg-neutral-200/70 dark:bg-neutral-800/80 border border-neutral-300 dark:border-neutral-700">
                  <button
                    type="button"
                    onClick={() => {
                      soundManager.playClick();
                      setActiveScope('work');
                      setSelectedProjectId(workItems[0]?.id || '');
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-mono text-xs font-bold transition-all cursor-pointer ${
                      activeScope === 'work'
                        ? 'bg-black text-white dark:bg-white dark:text-black shadow-xs'
                        : 'text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white'
                    }`}
                  >
                    <Layers size={13} />
                    <span>Work Page ({workItems.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      soundManager.playClick();
                      setActiveScope('recent');
                      setSelectedProjectId(recentItems[0]?.id || '');
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-mono text-xs font-bold transition-all cursor-pointer ${
                      activeScope === 'recent'
                        ? 'bg-[#e62b1e] text-white shadow-xs'
                        : 'text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white'
                    }`}
                  >
                    <CircleDot size={13} />
                    <span>Recent Work ({recentItems.length})</span>
                  </button>
                </div>

                {customCount > 0 && (
                  <button
                    onClick={handleResetAll}
                    title="Reset all custom images"
                    className="hidden lg:flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-mono font-semibold text-neutral-500 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={13} />
                    <span>Reset</span>
                  </button>
                )}

                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors text-neutral-500 hover:text-black dark:hover:text-white cursor-pointer ml-1"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Horizontal Project Carousel Strip */}
            <div className="px-5 sm:px-7 py-3 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-900/40 overflow-x-auto scrollbar-thin">
              <div className="flex items-center gap-2 min-w-max">
                <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-neutral-400 mr-1 select-none">
                  {activeScope === 'recent' ? 'Recent Work:' : 'Work Card:'}
                </span>
                {currentScopeItems.map((item) => {
                  const isSelected = item.id === selectedProjectId;
                  const isCustomized = Boolean(
                    customOverrides[item.id] || customOverrides[item.id.replace('pg-', '')]
                  );
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        soundManager.playClick();
                        setSelectedProjectId(item.id);
                      }}
                      className={`relative flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                        isSelected
                          ? activeScope === 'recent'
                            ? 'bg-[#e62b1e] text-white font-bold shadow-md scale-105'
                            : 'bg-black text-white dark:bg-white dark:text-black font-bold shadow-md scale-105'
                          : 'bg-neutral-200/60 dark:bg-neutral-800/60 hover:bg-neutral-300/80 dark:hover:bg-neutral-700/80 text-neutral-700 dark:text-neutral-300'
                      }`}
                    >
                      <span>{item.index}</span>
                      <span className="max-w-[140px] truncate">{item.title}</span>
                      {isCustomized && (
                        <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" title="Custom image active" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Body: Two columns (Left: Preview, Right: Upload Controls) */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-7 grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
              {/* Left Column: Preview */}
              <div className="md:col-span-5 flex flex-col items-center">
                <div className="w-full flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-neutral-500 uppercase">
                      {activeScope === 'recent' ? 'Recent Work Bubble' : 'Work Card'} ({selectedItem?.index})
                    </span>
                    {hasOverride && (
                      <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                        Custom Active
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={handlePrevItem}
                      className="p-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                      title="Previous"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button
                      onClick={handleNextItem}
                      className="p-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                      title="Next"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>

                {/* Card or Bubble Box */}
                {activeScope === 'recent' ? (
                  /* Recent Works: Circular Bubble Preview */
                  <div className="relative w-full max-w-[260px] aspect-square rounded-full overflow-hidden shadow-2xl border-4 border-neutral-300/80 dark:border-neutral-700/80 bg-neutral-900 group flex items-center justify-center p-1">
                    {currentActiveUrl ? (
                      <img
                        src={resolveImageUrl(currentActiveUrl)}
                        alt={selectedItem?.title}
                        className="w-full h-full object-cover rounded-full transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full rounded-full flex flex-col items-center justify-center p-4 text-center text-neutral-400">
                        <ImageIcon size={32} className="mb-2 opacity-50" />
                        <span className="text-xs font-mono">No Image</span>
                      </div>
                    )}

                    <div className="absolute inset-0 rounded-full bg-gradient-to-t from-black/80 via-transparent to-black/20 pointer-events-none flex flex-col justify-end p-5 text-center items-center">
                      <span className="font-syne font-black text-sm text-white leading-tight uppercase drop-shadow">
                        {selectedItem?.title}
                      </span>
                      <span className="text-[10px] font-mono text-neutral-300 uppercase mt-0.5">
                        {selectedItem?.category}
                      </span>
                    </div>
                  </div>
                ) : (
                  /* Work Page: 4:5 Card Preview */
                  <div className="relative w-full max-w-[270px] aspect-[4/5] rounded-xl overflow-hidden shadow-2xl border border-neutral-300/60 dark:border-neutral-700/60 bg-neutral-900 group">
                    {currentActiveUrl ? (
                      <img
                        src={resolveImageUrl(currentActiveUrl)}
                        alt={selectedItem?.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center text-neutral-400">
                        <ImageIcon size={32} className="mb-2 opacity-50" />
                        <span className="text-xs font-mono">No Image</span>
                      </div>
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 pointer-events-none flex flex-col justify-between p-4">
                      <div className="flex items-center justify-between">
                        <span className="font-syne font-black text-xl text-white drop-shadow">
                          {selectedItem?.index}
                        </span>
                        <span className="font-mono text-[10px] uppercase font-bold text-white/80 bg-black/50 px-2 py-0.5 rounded backdrop-blur-sm">
                          {selectedItem?.category}
                        </span>
                      </div>
                      <div>
                        <div className="text-[11px] font-mono text-white/70 uppercase">
                          {selectedItem?.client}
                        </div>
                        <h4 className="font-syne font-black text-base text-white leading-tight uppercase">
                          {selectedItem?.title}
                        </h4>
                      </div>
                    </div>
                  </div>
                )}

                {/* Reset single card button */}
                {hasOverride && (
                  <button
                    onClick={handleResetCurrent}
                    className="mt-3 flex items-center gap-1.5 text-xs font-mono text-neutral-500 hover:text-red-500 dark:text-neutral-400 dark:hover:text-red-400 transition-colors cursor-pointer"
                  >
                    <RotateCcw size={12} />
                    Reset to Default Image
                  </button>
                )}
              </div>

              {/* Right Column: Upload Tabs & Form */}
              <div className="md:col-span-7 flex flex-col gap-4">
                {/* Tab Navigation: ONLY Video URL and Image URL */}
                <div className="flex items-center gap-2 border-b border-neutral-200 dark:border-neutral-800 pb-2">
                  <button
                    onClick={() => {
                      soundManager.playClick();
                      setActiveTab('video-url');
                    }}
                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg font-mono text-xs font-bold transition-all cursor-pointer ${
                      activeTab === 'video-url'
                        ? 'bg-[#e62b1e] text-white shadow-sm'
                        : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                    }`}
                  >
                    <Video size={14} />
                    <span>Video URL</span>
                  </button>

                  <button
                    onClick={() => {
                      soundManager.playClick();
                      setActiveTab('image-url');
                    }}
                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg font-mono text-xs font-bold transition-all cursor-pointer ${
                      activeTab === 'image-url'
                        ? 'bg-[#e62b1e] text-white shadow-sm'
                        : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                    }`}
                  >
                    <ImageIcon size={14} />
                    <span>Image URL</span>
                  </button>
                </div>

                {/* Tab: Video URL */}
                {activeTab === 'video-url' && (
                  <form onSubmit={(e) => { e.preventDefault(); handleMediaUrlSubmit(urlInput, 'video'); }} className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-mono font-bold text-neutral-600 dark:text-neutral-400 uppercase">
                        Paste Public Video URL (MP4, WebM, MOV) or Stream:
                      </label>
                      <button
                        type="button"
                        onClick={handlePasteFromClipboard}
                        className="text-[11px] font-mono font-bold text-[#e62b1e] hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <LinkIcon size={11} />
                        1-Click Paste from Clipboard
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        autoFocus
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                        placeholder="https://.../video.mp4 or stream link"
                        className="flex-1 px-4 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-[#e62b1e]"
                      />
                      <button
                        type="button"
                        onClick={handlePasteFromClipboard}
                        className="px-3 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 font-mono text-xs font-bold hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer shrink-0"
                        title="Paste copied link from clipboard"
                      >
                        Paste
                      </button>
                      <button
                        type="submit"
                        disabled={!urlInput.trim() || isProcessing}
                        className="px-4 py-2.5 rounded-xl bg-black text-white dark:bg-white dark:text-black font-mono font-bold text-xs uppercase disabled:opacity-50 cursor-pointer shrink-0"
                      >
                        Apply
                      </button>
                    </div>
                    <p className="text-[11px] text-neutral-500">
                      Supports direct MP4, WebM, Google Drive video sharing links, Mixkit, or stream URLs. Automatically saved to server.
                    </p>
                  </form>
                )}

                {/* Tab: Image URL */}
                {activeTab === 'image-url' && (
                  <form onSubmit={(e) => { e.preventDefault(); handleMediaUrlSubmit(urlInput, 'image'); }} className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-mono font-bold text-neutral-600 dark:text-neutral-400 uppercase">
                        Paste Public Image URL or Google Drive Link:
                      </label>
                      <button
                        type="button"
                        onClick={handlePasteFromClipboard}
                        className="text-[11px] font-mono font-bold text-[#e62b1e] hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <LinkIcon size={11} />
                        1-Click Paste from Clipboard
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        autoFocus
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                        placeholder="https://drive.google.com/file/d/... or https://..."
                        className="flex-1 px-4 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-[#e62b1e]"
                      />
                      <button
                        type="button"
                        onClick={handlePasteFromClipboard}
                        className="px-3 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 font-mono text-xs font-bold hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer shrink-0"
                        title="Paste copied link from clipboard"
                      >
                        Paste
                      </button>
                      <button
                        type="submit"
                        disabled={!urlInput.trim() || isProcessing}
                        className="px-4 py-2.5 rounded-xl bg-black text-white dark:bg-white dark:text-black font-mono font-bold text-xs uppercase disabled:opacity-50 cursor-pointer shrink-0"
                      >
                        Apply
                      </button>
                    </div>
                    <p className="text-[11px] text-neutral-500">
                      Supports direct Google Drive links (sharing/view links), Unsplash, Behance, or any image URL. Google Drive links are automatically converted to direct high-speed CDN images.
                    </p>
                  </form>
                )}

                {/* Storage & Persistence Details */}
                <div className="mt-auto pt-4 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
                  <div className="flex items-center gap-1.5 font-mono text-[11px]">
                    <Database size={13} className="text-emerald-500" />
                    <span>Server Persisted & Universal for All Devices</span>
                  </div>
                  <button
                    onClick={onClose}
                    className="px-5 py-2 rounded-xl font-mono text-xs font-bold bg-black text-white dark:bg-white dark:text-black uppercase cursor-pointer hover:opacity-90 transition-opacity"
                  >
                    Done & Close
                  </button>
                </div>
              </div>
            </div>

            {/* Toast Notification */}
            <AnimatePresence>
              {toastMessage && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="absolute bottom-5 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl bg-black text-white dark:bg-white dark:text-black font-mono text-xs font-bold shadow-2xl flex items-center gap-2 border border-neutral-700"
                >
                  <Check size={14} className="text-emerald-400" />
                  {toastMessage}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
