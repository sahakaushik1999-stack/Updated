import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ThemeMode } from '../types/portfolio';
import { soundManager } from '../utils/audio';
import {
  processImageFile,
  uploadImageFileToServer,
  saveImageOverride,
} from '../utils/imageStorage';
import {
  uploadVideoToServer,
  fetchServerVideos,
  deleteServerVideo,
  isVideoUrl,
  resolveImageUrl,
  formatFileSize,
  ServerVideoItem,
} from '../utils/mediaUpload';
import { useMasterEdit } from '../context/MasterEditContext';
import {
  X,
  Upload,
  Link as LinkIcon,
  RotateCcw,
  Check,
  Sparkles,
  Image as ImageIcon,
  CheckCircle2,
  Trash2,
  Video,
  Play,
  HardDrive,
  Film,
} from 'lucide-react';

interface CircleEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  circleId: string;
  initialTitle: string;
  initialImageUrl: string;
  initialVideoUrl?: string;
  initialMediaType?: 'image' | 'video';
  galleryImages?: string[];
  theme: ThemeMode;
  onSave: (title: string, imageUrl: string, videoUrl?: string, mediaType?: 'image' | 'video') => void | Promise<void>;
  onReset?: () => void;
  onDeleteCircle?: (circleId: string) => void;
}

const PRESET_THUMBNAILS = [
  { title: 'Better Candle', url: '/projects/better-candle.png' },
  { title: 'Harmony Acoustic', url: '/projects/harmony-brand-design.png' },
  { title: 'Biocule Skincare', url: '/projects/rebranding-for-biocule.png' },
  { title: 'The Trost Ads', url: '/projects/the-trost.webp' },
  { title: 'All About Horology', url: '/projects/all-about-horology.webp' },
  { title: 'Superdry Movement', url: '/projects/superdry-campaign.webp' },
  { title: 'Combine Sports', url: '/projects/combine-sports.webp' },
  { title: 'Cha Tea Brochure', url: '/projects/cha-brochure.webp' },
  { title: 'Tokyo Eyewear Lookbook', url: '/projects/the-world-collection-tokyo.webp' },
  { title: 'Soledition Sneaker Fest', url: '/projects/soledition-2024.webp' },
  { title: 'Masala Synergy Apothecary', url: '/projects/masala-synergy.webp' },
  { title: 'Shuchi Industrial CAD', url: '/projects/shuchi-beltings.webp' },
  { title: 'Abstract 3D Liquid', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80' },
  { title: 'Prism Geometry', url: 'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?auto=format&fit=crop&w=600&q=80' },
  { title: 'Cyberpunk Neon', url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=600&q=80' },
];

// Curated high quality motion video presets for testing & instant use
const PRESET_VIDEOS = [
  {
    title: '3D Liquid Chrome Loop',
    url: 'https://assets.mixkit.co/videos/preview/mixkit-abstract-liquid-reflections-in-motion-42514-large.mp4',
    subtitle: 'Metallic fluid simulation',
  },
  {
    title: 'Neon Light Tunnel 60fps',
    url: 'https://assets.mixkit.co/videos/preview/mixkit-futuristic-tunnel-with-neon-lights-42516-large.mp4',
    subtitle: 'Cyberpunk geometric tunnel',
  },
  {
    title: 'Digital Particles Wave',
    url: 'https://assets.mixkit.co/videos/preview/mixkit-digital-particles-in-motion-42517-large.mp4',
    subtitle: 'Kinetic particle swarm',
  },
];

export const CircleEditModal: React.FC<CircleEditModalProps> = ({
  isOpen,
  onClose,
  circleId,
  initialTitle,
  initialImageUrl,
  initialVideoUrl,
  initialMediaType,
  galleryImages = [],
  theme,
  onSave,
  onReset,
  onDeleteCircle,
}) => {
  const [title, setTitle] = useState<string>(initialTitle);
  const [mediaUrl, setMediaUrl] = useState<string>(initialVideoUrl || initialImageUrl);
  const [mediaType, setMediaType] = useState<'image' | 'video'>(
    initialMediaType || (isVideoUrl(initialVideoUrl || initialImageUrl) ? 'video' : 'image')
  );
  const isInitialVideo = initialMediaType === 'video' || isVideoUrl(initialVideoUrl || initialImageUrl);
  const [activeTab, setActiveTab] = useState<'video-url' | 'image-url'>(
    isInitialVideo ? 'video-url' : 'image-url'
  );
  const [videoUrlInput, setVideoUrlInput] = useState<string>('');
  const [imageUrlInput, setImageUrlInput] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [serverVideos, setServerVideos] = useState<ServerVideoItem[]>([]);
  const [isLoadingServerVideos, setIsLoadingServerVideos] = useState<boolean>(false);
  const [serverStatusNotice, setServerStatusNotice] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setTitle(initialTitle);
      const initialMedia = initialVideoUrl || initialImageUrl;
      setMediaUrl(initialMedia);
      const isVid = isVideoUrl(initialMedia) || initialMediaType === 'video';
      setMediaType(isVid ? 'video' : 'image');
      setActiveTab(isVid ? 'video-url' : 'image-url');
      setVideoUrlInput(isVid ? initialMedia : '');
      setImageUrlInput(!isVid ? initialMedia : '');
      setSavedSuccess(false);
      setUploadProgress(0);
      setServerStatusNotice(null);
    }
  }, [isOpen, initialTitle, initialImageUrl, initialVideoUrl, initialMediaType]);

  const loadServerVideos = async () => {
    setIsLoadingServerVideos(true);
    const videos = await fetchServerVideos();
    setServerVideos(videos);
    setIsLoadingServerVideos(false);
  };

  const { isEditMode } = useMasterEdit();
  if (!isOpen || !isEditMode) return null;

  const [isVideoDragging, setIsVideoDragging] = useState<boolean>(false);

  // Handle uploading a video directly to the Express server
  const handleVideoFile = async (file: File) => {
    if (!file) return;

    try {
      setIsProcessing(true);
      setUploadProgress(10);
      setServerStatusNotice(null);
      soundManager.playSlide?.();

      const result = await uploadVideoToServer(file, {
        circleId,
        projectId: circleId,
        setAsCover: true,
        addToGallery: true,
        onProgress: (percent) => setUploadProgress(percent),
      });

      if (result.success && result.url) {
        setMediaUrl(result.url);
        setMediaType('video');
        setServerStatusNotice(`✓ Video uploaded & stored on server: ${result.filename}`);
        await loadServerVideos();
      } else {
        setServerStatusNotice(result.error || 'Failed to upload video to server');
      }
    } catch (err: any) {
      console.error('Failed to upload video to server:', err);
      setServerStatusNotice(`Error: ${err.message || 'Failed to upload video file'}`);
    } finally {
      setIsProcessing(false);
      setUploadProgress(0);
    }
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await handleVideoFile(file);
      e.target.value = '';
    }
  };

  const [isImageDragging, setIsImageDragging] = useState<boolean>(false);

  // Handle regular image file upload with direct server upload & progress
  const handleImageFile = async (file: File) => {
    if (!file || !file.type.startsWith('image/')) return;

    try {
      setIsProcessing(true);
      setUploadProgress(20);
      soundManager.playSlide?.();

      // 1. Upload directly to backend server uploads/images/
      const serverUrl = await uploadImageFileToServer(file, circleId);
      setUploadProgress(70);

      if (serverUrl) {
        setMediaUrl(serverUrl);
        setMediaType('image');
        setUploadProgress(100);
        setServerStatusNotice(`Image uploaded directly to server: ${file.name}`);
      } else {
        // Fallback: high-res base64 processing and backend save
        const compressedUrl = await processImageFile(file, 2048);
        setMediaUrl(compressedUrl);
        setMediaType('image');
        setUploadProgress(100);
        setServerStatusNotice(`Image processed: ${file.name}`);
      }
    } catch (err) {
      console.error('Failed to process image file:', err);
    } finally {
      setIsProcessing(false);
      setUploadProgress(0);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleImageFile(file);
  };

  const handleApplyVideoUrl = () => {
    if (!videoUrlInput.trim()) return;
    soundManager.playClick();
    const cleanUrl = videoUrlInput.trim();
    const resolved = resolveImageUrl(cleanUrl);
    setMediaUrl(resolved);
    setMediaType('video');
    setServerStatusNotice(`Applied video URL: ${resolved.slice(0, 45)}...`);
  };

  const handleApplyImageUrl = () => {
    if (!imageUrlInput.trim()) return;
    soundManager.playClick();
    const cleanUrl = imageUrlInput.trim();
    const resolved = resolveImageUrl(cleanUrl);
    setMediaUrl(resolved);
    setMediaType('image');
    setServerStatusNotice(`Applied image URL: ${resolved.slice(0, 45)}...`);
  };

  const handlePasteClipboard = async (type: 'video' | 'image') => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        const text = await navigator.clipboard.readText();
        if (text && text.trim()) {
          const resolved = resolveImageUrl(text.trim());
          if (type === 'video') {
            setVideoUrlInput(resolved);
            setMediaUrl(resolved);
            setMediaType('video');
          } else {
            setImageUrlInput(resolved);
            setMediaUrl(resolved);
            setMediaType('image');
          }
          setServerStatusNotice(`Pasted ${type} link from clipboard`);
        }
      }
    } catch {
      // Ignore clipboard read permission failures
    }
  };

  const handleDeleteServerVideo = async (filename: string, e: React.MouseEvent) => {
    e.stopPropagation();
    soundManager.playClick();
    const ok = await deleteServerVideo(filename);
    if (ok) {
      setServerVideos((curr) => curr.filter((v) => v.filename !== filename));
      if (mediaUrl.includes(filename)) {
        setMediaUrl(initialImageUrl);
        setMediaType('image');
      }
    }
  };

  const handleSave = async () => {
    soundManager.playClick();
    const finalTitle = title.trim() || initialTitle;
    try {
      if (mediaType === 'video' || isVideoUrl(mediaUrl)) {
        await saveImageOverride(circleId, mediaUrl);
        const altId = circleId.startsWith('pg-') ? circleId.replace(/^pg-/, '') : `pg-${circleId}`;
        await saveImageOverride(altId, mediaUrl);
        await onSave(finalTitle, mediaUrl, mediaUrl, 'video');
      } else {
        await saveImageOverride(circleId, mediaUrl);
        const altId = circleId.startsWith('pg-') ? circleId.replace(/^pg-/, '') : `pg-${circleId}`;
        await saveImageOverride(altId, mediaUrl);
        await onSave(finalTitle, mediaUrl, undefined, 'image');
      }
    } catch (e) {
      console.warn('Failed to save customization:', e);
    }
    setSavedSuccess(true);
    setTimeout(() => {
      onClose();
    }, 400);
  };

  const isCurrentVideo = mediaType === 'video' || isVideoUrl(mediaUrl);

  return (
    <AnimatePresence>
      <div
        onClick={onClose}
        className="fixed inset-0 z-50 overflow-y-auto overscroll-contain bg-black/85 backdrop-blur-md px-3 sm:px-6 py-8 flex items-center justify-center min-h-screen cursor-pointer"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 15 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          onClick={(e) => e.stopPropagation()}
          className={`relative max-w-xl w-full rounded-2xl border shadow-2xl overflow-hidden cursor-default transition-colors ${
            theme === 'light'
              ? 'bg-[#fbfbfa] text-[#0c0c0e] border-neutral-300'
              : 'bg-[#101014] text-white border-neutral-800'
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-black/10 dark:border-white/10">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#e62b1e]" />
              <h2 className="font-unbounded font-black text-sm sm:text-base uppercase tracking-tight">
                Customize Circle Media & Name
              </h2>
            </div>
            <button
              onClick={() => {
                soundManager.playClick();
                onClose();
              }}
              className="w-8 h-8 flex items-center justify-center rounded-full text-neutral-500 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-6 space-y-6">
            {/* Live Circle Preview Card */}
            <div className="flex items-center gap-4 sm:gap-5 p-4 rounded-xl bg-black/[0.03] dark:bg-white/[0.03] border border-black/10 dark:border-white/10">
              <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden shrink-0 border-2 border-[#e62b1e] ring-4 ring-[#e62b1e]/30 shadow-lg bg-black">
                {isCurrentVideo ? (
                  <video
                    src={mediaUrl}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full h-full object-cover object-center"
                  />
                ) : (
                  <img
                    src={mediaUrl}
                    alt={title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover object-center"
                  />
                )}
                {/* Video tag overlay badge */}
                {isCurrentVideo && (
                  <div className="absolute top-1.5 right-1.5 z-10 w-4 h-4 rounded-full bg-black/80 flex items-center justify-center text-white">
                    <Play className="w-2 h-2 fill-white ml-0.5" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/15 to-white/30 pointer-events-none rounded-full" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono-tabular font-bold uppercase tracking-wider text-[#e62b1e]">
                    LIVE PREVIEW
                  </span>
                  {isCurrentVideo && (
                    <span className="px-1.5 py-0.2 rounded bg-[#e62b1e] text-white text-[9px] font-mono font-bold uppercase">
                      VIDEO
                    </span>
                  )}
                </div>
                <h3 className="font-unbounded font-black text-base truncate mt-0.5">
                  {title || 'Untitled Circle'}
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 font-mono-tabular mt-1 truncate">
                  {mediaUrl.startsWith('/uploads/') ? 'Stored on Server' : mediaUrl.slice(0, 45)}
                </p>
              </div>
            </div>

            {/* Field: Circle Name / Title */}
            <div>
              <label className="block text-xs font-mono-tabular font-bold uppercase tracking-wider mb-2 text-neutral-600 dark:text-neutral-300">
                Circle Name / Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter custom circle name..."
                className={`w-full px-4 py-2.5 rounded-lg border font-unbounded text-sm font-bold tracking-tight outline-none transition-all ${
                  theme === 'light'
                    ? 'bg-white border-neutral-300 focus:border-[#e62b1e] text-neutral-900'
                    : 'bg-[#18181e] border-neutral-700 focus:border-[#e62b1e] text-white'
                }`}
              />
            </div>

            {/* Field: Choose or Upload Media */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-mono-tabular font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-300">
                  Circle Media (Videos & Images)
                </label>
                <span className="text-[11px] font-mono font-semibold text-[#e62b1e]">
                  Server Storage Enabled
                </span>
              </div>

              {/* Navigation Tabs: ONLY Video URL and Image URL */}
              <div className="flex items-center gap-2 p-1 rounded-lg bg-black/[0.04] dark:bg-white/[0.04] border border-black/10 dark:border-white/10 mb-4 text-xs font-mono-tabular font-bold">
                <button
                  type="button"
                  onClick={() => {
                    soundManager.playClick();
                    setActiveTab('video-url');
                  }}
                  className={`flex-1 py-2 px-3 rounded-md transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeTab === 'video-url'
                      ? 'bg-[#e62b1e] text-white shadow-xs'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white'
                  }`}
                >
                  <Video className="w-3.5 h-3.5" />
                  <span>Video URL</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    soundManager.playClick();
                    setActiveTab('image-url');
                  }}
                  className={`flex-1 py-2 px-3 rounded-md transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeTab === 'image-url'
                      ? 'bg-[#e62b1e] text-white shadow-xs'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white'
                  }`}
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>Image URL</span>
                </button>
              </div>

              {/* Tab: Video URL */}
              {activeTab === 'video-url' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono font-bold text-neutral-500 uppercase">
                      Paste Public Video URL (MP4, WebM, MOV) or Stream:
                    </span>
                    <button
                      type="button"
                      onClick={() => handlePasteClipboard('video')}
                      className="text-[11px] font-mono font-bold text-[#e62b1e] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <LinkIcon className="w-3 h-3" />
                      Paste from Clipboard
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={videoUrlInput}
                      onChange={(e) => setVideoUrlInput(e.target.value)}
                      placeholder="https://.../video.mp4 or stream URL"
                      className={`flex-1 px-3.5 py-2 rounded-lg border text-xs font-mono outline-none ${
                        theme === 'light'
                          ? 'bg-white border-neutral-300 focus:border-[#e62b1e] text-neutral-900'
                          : 'bg-[#18181e] border-neutral-700 focus:border-[#e62b1e] text-white'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={handleApplyVideoUrl}
                      className="px-4 py-2 rounded-lg bg-[#e62b1e] hover:bg-[#d02418] text-white font-mono text-xs font-bold uppercase transition-colors cursor-pointer"
                    >
                      Apply
                    </button>
                  </div>
                  <span className="block text-[11px] text-neutral-500 font-mono-tabular">
                    Direct MP4, WebM, Mixkit, Google Drive video link, or server video. Automatically looped & muted inside the circle.
                  </span>

                  {serverStatusNotice && (
                    <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-mono font-bold flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                      <span className="truncate">{serverStatusNotice}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Tab: Image URL */}
              {activeTab === 'image-url' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono font-bold text-neutral-500 uppercase">
                      Paste Public Image URL or Google Drive Link:
                    </span>
                    <button
                      type="button"
                      onClick={() => handlePasteClipboard('image')}
                      className="text-[11px] font-mono font-bold text-[#e62b1e] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <LinkIcon className="w-3 h-3" />
                      Paste from Clipboard
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={imageUrlInput}
                      onChange={(e) => setImageUrlInput(e.target.value)}
                      placeholder="https://drive.google.com/file/d/... or https://..."
                      className={`flex-1 px-3.5 py-2 rounded-lg border text-xs font-mono outline-none ${
                        theme === 'light'
                          ? 'bg-white border-neutral-300 focus:border-[#e62b1e] text-neutral-900'
                          : 'bg-[#18181e] border-neutral-700 focus:border-[#e62b1e] text-white'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={handleApplyImageUrl}
                      className="px-4 py-2 rounded-lg bg-[#e62b1e] hover:bg-[#d02418] text-white font-mono text-xs font-bold uppercase transition-colors cursor-pointer"
                    >
                      Apply
                    </button>
                  </div>
                  <span className="block text-[11px] text-neutral-500 font-mono-tabular">
                    Supports Google Drive links (automatically resolved to high-speed CDN image), Unsplash, Behance, or direct PNG/WebP images.
                  </span>

                  {serverStatusNotice && (
                    <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-mono font-bold flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                      <span className="truncate">{serverStatusNotice}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02]">
            <div className="flex items-center gap-4">
              {onReset && (
                <button
                  type="button"
                  onClick={() => {
                    soundManager.playClick();
                    onReset();
                  }}
                  className="flex items-center gap-1.5 text-xs font-mono-tabular font-bold uppercase text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Default</span>
                </button>
              )}

              {onDeleteCircle && (
                <button
                  type="button"
                  onClick={() => {
                    soundManager.playClick();
                    onDeleteCircle(circleId);
                    onClose();
                  }}
                  className="flex items-center gap-1.5 text-xs font-mono-tabular font-bold uppercase text-red-500 hover:text-red-600 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove Circle</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => {
                  soundManager.playClick();
                  onClose();
                }}
                className="px-4 py-2 rounded-lg border border-black/15 dark:border-white/15 text-xs font-mono-tabular font-bold uppercase hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={savedSuccess}
                className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-[#e62b1e] hover:bg-[#d02418] text-white text-xs font-mono-tabular font-bold uppercase shadow-lg transition-all cursor-pointer disabled:opacity-75"
              >
                {savedSuccess ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Saved!</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
