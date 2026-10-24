import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ThemeMode } from '../types/portfolio';
import { soundManager } from '../utils/audio';
import { processImageFile } from '../utils/imageStorage';
import {
  uploadVideoToServer,
  fetchServerVideos,
  isVideoUrl,
  formatFileSize,
  ServerVideoItem,
} from '../utils/mediaUpload';
import { useMasterEdit } from '../context/MasterEditContext';
import {
  X,
  Upload,
  Link as LinkIcon,
  Sparkles,
  Check,
  Plus,
  Trash2,
  FolderPlus,
  Video,
  Play,
  HardDrive,
  Film,
} from 'lucide-react';

export type CategoryFilter =
  | 'All'
  | 'Campaigns & Festivals'
  | 'Logofolio & Branding'
  | 'Editorial & Lookbooks'
  | 'Packaging'
  | 'Motion & Video';

interface AddCircleModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: ThemeMode;
  onAddCircle: (circle: {
    title: string;
    subtitle: string;
    category: 'Campaigns & Festivals' | 'Logofolio & Branding' | 'Editorial & Lookbooks' | 'Packaging' | 'Motion & Video';
    imageUrl: string;
    videoUrl?: string;
    mediaType?: 'image' | 'video';
    client: string;
    year: string;
    gallery: string[];
  }) => void;
}

const PRESET_THUMBNAILS = [
  { title: 'Better Candle Box', url: '/projects/better-candle.png' },
  { title: 'Harmony Soundwave', url: '/projects/harmony-brand-design.png' },
  { title: 'Biocule Beauty', url: '/projects/rebranding-for-biocule.png' },
  { title: 'The Trost Social', url: '/projects/the-trost.webp' },
  { title: 'All About Horology', url: '/projects/all-about-horology.webp' },
  { title: 'Superdry Movement', url: '/projects/superdry-campaign.webp' },
  { title: 'Combine Athletics', url: '/projects/combine-sports.webp' },
  { title: 'Cha Tea Brochure', url: '/projects/cha-brochure.webp' },
  { title: 'Tokyo Titanium Glasses', url: '/projects/the-world-collection-tokyo.webp' },
  { title: 'Soledition Streetwear', url: '/projects/soledition-2024.webp' },
  { title: 'Masala Botanical Synergy', url: '/projects/masala-synergy.webp' },
  { title: 'Shuchi Conveyor CAD', url: '/projects/shuchi-beltings.webp' },
];

const PRESET_VIDEOS = [
  {
    title: '3D Liquid Chrome Loop',
    url: 'https://assets.mixkit.co/videos/preview/mixkit-abstract-liquid-reflections-in-motion-42514-large.mp4',
    category: 'Motion & Video' as const,
  },
  {
    title: 'Neon Light Tunnel 60fps',
    url: 'https://assets.mixkit.co/videos/preview/mixkit-futuristic-tunnel-with-neon-lights-42516-large.mp4',
    category: 'Motion & Video' as const,
  },
  {
    title: 'Digital Particles Wave',
    url: 'https://assets.mixkit.co/videos/preview/mixkit-digital-particles-in-motion-42517-large.mp4',
    category: 'Motion & Video' as const,
  },
];

const CATEGORIES: Array<'Campaigns & Festivals' | 'Logofolio & Branding' | 'Editorial & Lookbooks' | 'Packaging' | 'Motion & Video'> = [
  'Campaigns & Festivals',
  'Logofolio & Branding',
  'Editorial & Lookbooks',
  'Packaging',
  'Motion & Video',
];

export const AddCircleModal: React.FC<AddCircleModalProps> = ({
  isOpen,
  onClose,
  theme,
  onAddCircle,
}) => {
  const [title, setTitle] = useState<string>('');
  const [subtitle, setSubtitle] = useState<string>('');
  const [category, setCategory] = useState<'Campaigns & Festivals' | 'Logofolio & Branding' | 'Editorial & Lookbooks' | 'Packaging' | 'Motion & Video'>('Motion & Video');
  const [client, setClient] = useState<string>('Culture Boat / Fortune Studios');
  const [year, setYear] = useState<string>('2024');
  const [mediaUrl, setMediaUrl] = useState<string>(PRESET_VIDEOS[0].url);
  const [mediaType, setMediaType] = useState<'image' | 'video'>('video');
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'upload-video' | 'server-videos' | 'presets' | 'upload-image' | 'url'>('upload-video');
  const [urlInput, setUrlInput] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [serverVideos, setServerVideos] = useState<ServerVideoItem[]>([]);
  const [serverNotice, setServerNotice] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);
  const galleryFileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadServerVideos();
    }
  }, [isOpen]);

  const loadServerVideos = async () => {
    const vids = await fetchServerVideos();
    setServerVideos(vids);
  };

  const { isEditMode } = useMasterEdit();
  if (!isOpen || !isEditMode) return null;

  const [isVideoDragging, setIsVideoDragging] = useState<boolean>(false);

  // Handle uploading a video directly to the Express server
  const handleVideoFile = async (file: File) => {
    if (!file) return;

    try {
      setIsProcessing(true);
      setErrorMsg(null);
      setServerNotice(null);
      setUploadProgress(10);
      soundManager.playSlide?.();

      const result = await uploadVideoToServer(file, {
        onProgress: (percent) => setUploadProgress(percent),
      });

      if (result.success && result.url) {
        setMediaUrl(result.url);
        setMediaType('video');
        setCategory('Motion & Video');
        setServerNotice(`✓ Video stored on server: ${result.filename}`);
        await loadServerVideos();
      } else {
        setErrorMsg(result.error || 'Failed to upload video to server.');
      }
    } catch (err: any) {
      console.error('Failed to upload video to server:', err);
      setErrorMsg(`Upload failed: ${err.message || 'Failed to upload video to server.'}`);
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsProcessing(true);
      setErrorMsg(null);
      soundManager.playSlide?.();
      const compressedUrl = await processImageFile(file, 1600);
      setMediaUrl(compressedUrl);
      setMediaType('image');
    } catch (err) {
      console.error('Failed to process image file:', err);
      setErrorMsg('Failed to process image file. Please try another.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      setIsProcessing(true);
      soundManager.playSlide?.();
      const newUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const compressed = await processImageFile(files[i], 1600);
        newUrls.push(compressed);
      }
      setGalleryImages((prev) => [...prev, ...newUrls]);
    } catch (err) {
      console.error('Failed to upload gallery images:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApplyUrl = () => {
    if (!urlInput.trim()) return;
    soundManager.playClick();
    const clean = urlInput.trim();
    setMediaUrl(clean);
    setMediaType(isVideoUrl(clean) ? 'video' : 'image');
    setUrlInput('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg('Please enter a circle title / project name.');
      return;
    }
    if (!mediaUrl) {
      setErrorMsg('Please select or upload a video or image.');
      return;
    }

    soundManager.playClick();

    // Prepare gallery list, including the primary media as first item
    const fullGallery = [mediaUrl, ...galleryImages.filter((g) => g !== mediaUrl)];

    onAddCircle({
      title: title.trim(),
      subtitle: subtitle.trim() || 'Custom creative project',
      category,
      imageUrl: mediaUrl,
      videoUrl: mediaType === 'video' ? mediaUrl : undefined,
      mediaType,
      client: client.trim() || 'Independent / Studio',
      year: year.trim() || '2024',
      gallery: fullGallery,
    });

    onClose();
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
          className={`relative max-w-2xl w-full rounded-2xl border shadow-2xl overflow-hidden cursor-default transition-colors ${
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
                Add Circle (Video & Image Supported)
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

          {/* Form Body */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[78vh] overflow-y-auto">
            {/* Error Banner */}
            {errorMsg && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-mono font-bold flex items-center gap-2">
                <span>⚠️ {errorMsg}</span>
              </div>
            )}

            {/* Live Visual Circle Preview */}
            <div className="flex items-center gap-5 p-4 rounded-xl bg-black/[0.03] dark:bg-white/[0.03] border border-black/10 dark:border-white/10">
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
                    alt="Circle Preview"
                    className="w-full h-full object-cover object-center"
                  />
                )}
                {isCurrentVideo && (
                  <div className="absolute top-1.5 right-1.5 z-10 w-4 h-4 rounded-full bg-black/80 flex items-center justify-center text-white">
                    <Play className="w-2 h-2 fill-white ml-0.5" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/15 to-white/30 pointer-events-none rounded-full" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#e62b1e]">
                    PREVIEW CIRCLE
                  </span>
                  {isCurrentVideo && (
                    <span className="px-1.5 py-0.2 rounded bg-[#e62b1e] text-white text-[9px] font-mono font-bold uppercase">
                      VIDEO
                    </span>
                  )}
                </div>
                <h3 className="font-unbounded font-black text-base truncate mt-0.5">
                  {title || 'Your Circle Title'}
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 font-mono-tabular mt-0.5">
                  {category} • {year || '2024'}
                </p>
                {mediaUrl.startsWith('/uploads/') && (
                  <p className="text-[10px] font-mono text-emerald-500 mt-1">
                    ✓ Video stored on server
                  </p>
                )}
              </div>
            </div>

            {/* Title & Subtitle */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-mono font-bold uppercase tracking-wider mb-1.5 text-neutral-600 dark:text-neutral-300">
                  Project Title *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. 3D CHROMATIC FLUID"
                  className={`w-full px-3.5 py-2 rounded-lg border font-unbounded text-xs font-bold outline-none transition-all ${
                    theme === 'light'
                      ? 'bg-white border-neutral-300 focus:border-[#e62b1e]'
                      : 'bg-[#18181e] border-neutral-700 focus:border-[#e62b1e]'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-bold uppercase tracking-wider mb-1.5 text-neutral-600 dark:text-neutral-300">
                  Subtitle / Role
                </label>
                <input
                  type="text"
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  placeholder="e.g. Kinetic typography animation reel"
                  className={`w-full px-3.5 py-2 rounded-lg border font-mono text-xs outline-none transition-all ${
                    theme === 'light'
                      ? 'bg-white border-neutral-300 focus:border-[#e62b1e]'
                      : 'bg-[#18181e] border-neutral-700 focus:border-[#e62b1e]'
                  }`}
                />
              </div>
            </div>

            {/* Category & Year */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-mono font-bold uppercase tracking-wider mb-1.5 text-neutral-600 dark:text-neutral-300">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className={`w-full px-3 py-2 rounded-lg border font-mono text-xs font-bold outline-none cursor-pointer ${
                    theme === 'light'
                      ? 'bg-white border-neutral-300 text-neutral-900'
                      : 'bg-[#18181e] border-neutral-700 text-white'
                  }`}
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono font-bold uppercase tracking-wider mb-1.5 text-neutral-600 dark:text-neutral-300">
                  Client / Studio
                </label>
                <input
                  type="text"
                  value={client}
                  onChange={(e) => setClient(e.target.value)}
                  placeholder="e.g. Fortune Studios"
                  className={`w-full px-3.5 py-2 rounded-lg border font-mono text-xs outline-none ${
                    theme === 'light'
                      ? 'bg-white border-neutral-300 focus:border-[#e62b1e]'
                      : 'bg-[#18181e] border-neutral-700 focus:border-[#e62b1e]'
                  }`}
                />
              </div>
            </div>

            {/* Choose Media / Upload Video Section */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-300">
                  Choose Circle Media (Video or Image)
                </label>
                <span className="text-[10px] font-mono text-[#e62b1e] font-bold">
                  Server Video Upload
                </span>
              </div>

              {/* Media Selection Tabs */}
              <div className="flex items-center gap-1 p-1 rounded-lg bg-black/[0.04] dark:bg-white/[0.04] border border-black/10 dark:border-white/10 mb-3 text-xs font-mono font-bold flex-wrap">
                <button
                  type="button"
                  onClick={() => setActiveTab('upload-video')}
                  className={`py-1.5 px-2.5 rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'upload-video'
                      ? 'bg-[#e62b1e] text-white shadow-xs'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white'
                  }`}
                >
                  <Video className="w-3.5 h-3.5" />
                  <span>Upload Video</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('server-videos');
                    loadServerVideos();
                  }}
                  className={`py-1.5 px-2.5 rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'server-videos'
                      ? 'bg-[#e62b1e] text-white shadow-xs'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white'
                  }`}
                >
                  <HardDrive className="w-3.5 h-3.5" />
                  <span>Server Videos ({serverVideos.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('presets')}
                  className={`py-1.5 px-2.5 rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'presets'
                      ? 'bg-[#e62b1e] text-white shadow-xs'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Presets</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('upload-image')}
                  className={`py-1.5 px-2.5 rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'upload-image'
                      ? 'bg-[#e62b1e] text-white shadow-xs'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Photo</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('url')}
                  className={`py-1.5 px-2.5 rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'url'
                      ? 'bg-[#e62b1e] text-white shadow-xs'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white'
                  }`}
                >
                  <LinkIcon className="w-3.5 h-3.5" />
                  <span>URL</span>
                </button>
              </div>

              {/* Tab: Upload Video to Server */}
              {activeTab === 'upload-video' && (
                <div>
                  <input
                    ref={videoInputRef}
                    type="file"
                    accept="video/*,.mp4,.mov,.webm,.ogg,.m4v,.mkv,.avi,video/mp4,video/webm,video/quicktime"
                    onChange={handleVideoUpload}
                    className="hidden"
                  />
                  <div
                    onClick={() => videoInputRef.current?.click()}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsVideoDragging(true);
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      setIsVideoDragging(false);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsVideoDragging(false);
                      const file = e.dataTransfer.files?.[0];
                      if (file) handleVideoFile(file);
                    }}
                    className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all text-center ${
                      isVideoDragging
                        ? 'border-[#e62b1e] bg-[#e62b1e]/15 scale-[1.01]'
                        : theme === 'light'
                        ? 'border-neutral-300 hover:border-[#e62b1e] bg-white hover:bg-neutral-50'
                        : 'border-neutral-700 hover:border-[#e62b1e] bg-[#18181e] hover:bg-[#1f1f27]'
                    }`}
                  >
                    <div className="w-12 h-12 rounded-full bg-[#e62b1e]/10 text-[#e62b1e] flex items-center justify-center">
                      <Video className="w-6 h-6" />
                    </div>
                    <span className="font-unbounded font-black text-xs uppercase tracking-tight">
                      {isProcessing ? `Uploading Video (${uploadProgress}%)...` : 'Click or Drop Video to Upload'}
                    </span>
                    <span className="text-[11px] text-neutral-500 font-mono">
                      Supports MP4, MOV, WebM, MKV • Saved to server filesystem automatically
                    </span>

                    {isProcessing && (
                      <div className="w-full max-w-xs mt-3 h-2 bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#e62b1e] transition-all duration-200 rounded-full"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    )}
                  </div>

                  {serverNotice && (
                    <div className="mt-2.5 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-mono font-bold flex items-center gap-2">
                      <Check className="w-4 h-4 shrink-0 text-emerald-500" />
                      <span className="truncate">{serverNotice}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Tab: Server Videos List */}
              {activeTab === 'server-videos' && (
                <div className="space-y-2">
                  {serverVideos.length === 0 ? (
                    <div className="p-6 text-center border border-dashed rounded-xl text-neutral-500 text-xs font-mono">
                      No videos on server yet. Click "Upload Video" to add one!
                    </div>
                  ) : (
                    <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                      {serverVideos.map((vid) => {
                        const isSelected = mediaUrl === vid.url;
                        return (
                          <div
                            key={vid.filename}
                            onClick={() => {
                              soundManager.playSlide?.();
                              setMediaUrl(vid.url);
                              setMediaType('video');
                              setCategory('Motion & Video');
                            }}
                            className={`flex items-center justify-between p-2 rounded-lg border cursor-pointer text-xs font-mono transition-all ${
                              isSelected
                                ? 'border-[#e62b1e] bg-[#e62b1e]/10'
                                : 'border-black/10 dark:border-white/10 hover:border-[#e62b1e]/50'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-8 h-8 rounded-full bg-black shrink-0 overflow-hidden relative flex items-center justify-center">
                                <video src={vid.url} muted playsInline className="w-full h-full object-cover" />
                                <Play className="w-2.5 h-2.5 text-white absolute" />
                              </div>
                              <span className="truncate max-w-[200px] font-bold">{vid.filename}</span>
                            </div>
                            <span className="text-[10px] text-neutral-500 shrink-0">
                              {formatFileSize(vid.size)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Tab: Presets */}
              {activeTab === 'presets' && (
                <div className="space-y-3">
                  <div>
                    <span className="block text-[11px] font-mono font-bold text-neutral-500 uppercase mb-2">
                      Preset Videos (Motion Loops)
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {PRESET_VIDEOS.map((preset, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            soundManager.playSlide?.();
                            setMediaUrl(preset.url);
                            setMediaType('video');
                            setCategory('Motion & Video');
                          }}
                          className={`p-2 rounded-xl border text-left flex items-center gap-2 cursor-pointer transition-all ${
                            mediaUrl === preset.url
                              ? 'border-[#e62b1e] bg-[#e62b1e]/10'
                              : 'border-black/10 dark:border-white/10 hover:border-[#e62b1e]/50'
                          }`}
                        >
                          <div className="w-8 h-8 rounded-full overflow-hidden bg-black shrink-0 relative flex items-center justify-center">
                            <video src={preset.url} muted playsInline className="w-full h-full object-cover" />
                            <Play className="w-2.5 h-2.5 text-white absolute" />
                          </div>
                          <span className="text-[11px] font-mono font-bold truncate">
                            {preset.title}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className="block text-[11px] font-mono font-bold text-neutral-500 uppercase mb-2">
                      Preset Images
                    </span>
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-36 overflow-y-auto p-1">
                      {PRESET_THUMBNAILS.map((preset, idx) => {
                        const isSelected = mediaUrl === preset.url;
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              soundManager.playSlide?.();
                              setMediaUrl(preset.url);
                              setMediaType('image');
                            }}
                            className={`group relative aspect-square rounded-full overflow-hidden border-2 transition-all cursor-pointer ${
                              isSelected
                                ? 'border-[#e62b1e] scale-105 ring-2 ring-[#e62b1e]/50'
                                : 'border-transparent hover:scale-105 opacity-80 hover:opacity-100'
                            }`}
                          >
                            <img src={preset.url} alt={preset.title} className="w-full h-full object-cover" />
                            {isSelected && (
                              <div className="absolute inset-0 bg-[#e62b1e]/40 flex items-center justify-center text-white">
                                <Check className="w-3.5 h-3.5" />
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Tab: Upload Photo */}
              {activeTab === 'upload-image' && (
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all text-center ${
                      theme === 'light'
                        ? 'border-neutral-300 hover:border-[#e62b1e] bg-white hover:bg-neutral-50'
                        : 'border-neutral-700 hover:border-[#e62b1e] bg-[#18181e] hover:bg-[#1f1f27]'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-[#e62b1e]/10 text-[#e62b1e] flex items-center justify-center">
                      <Upload className="w-5 h-5" />
                    </div>
                    <span className="font-unbounded font-black text-xs uppercase tracking-tight">
                      {isProcessing ? 'Processing Image...' : 'Click to Upload Image'}
                    </span>
                    <span className="text-[11px] text-neutral-500 font-mono">
                      PNG, WebP, JPG, SVG up to 10MB
                    </span>
                  </div>
                </div>
              )}

              {/* Tab: URL */}
              {activeTab === 'url' && (
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="Paste video or image URL (https://... or /uploads/...)"
                    className={`flex-1 px-3.5 py-2 rounded-lg border text-xs font-mono outline-none ${
                      theme === 'light'
                        ? 'bg-white border-neutral-300 focus:border-[#e62b1e]'
                        : 'bg-[#18181e] border-neutral-700 focus:border-[#e62b1e]'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={handleApplyUrl}
                    className="px-4 py-2 bg-[#e62b1e] hover:bg-[#d02418] text-white font-mono text-xs font-bold rounded cursor-pointer"
                  >
                    Apply
                  </button>
                </div>
              )}
            </div>

            {/* Optional: Add Project Gallery Images */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-300">
                  Additional Gallery Images / Videos (Optional)
                </label>
                <input
                  ref={galleryFileInputRef}
                  type="file"
                  multiple
                  accept="image/*,video/*"
                  onChange={handleGalleryUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => galleryFileInputRef.current?.click()}
                  className="text-xs font-mono text-[#e62b1e] hover:underline flex items-center gap-1 cursor-pointer font-bold"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Media to Gallery</span>
                </button>
              </div>

              {galleryImages.length > 0 ? (
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-28 overflow-y-auto p-1">
                  {galleryImages.map((img, idx) => (
                    <div
                      key={idx}
                      className="group relative aspect-video rounded-md overflow-hidden border border-black/10 dark:border-white/10"
                    >
                      <img src={img} alt="Gallery item" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setGalleryImages((prev) => prev.filter((_, i) => i !== idx))}
                        className="absolute inset-0 bg-red-600/80 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-neutral-500 font-mono">
                  You can also add more photos and videos to this circle later inside the project gallery.
                </p>
              )}
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-black/10 dark:border-white/10">
              <button
                type="button"
                onClick={() => {
                  soundManager.playClick();
                  onClose();
                }}
                className="px-4 py-2 rounded-lg border border-black/15 dark:border-white/15 text-xs font-mono font-bold uppercase hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex items-center gap-1.5 px-6 py-2 rounded-lg bg-[#e62b1e] hover:bg-[#d02418] text-white text-xs font-mono font-bold uppercase shadow-lg transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Create Circle</span>
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
