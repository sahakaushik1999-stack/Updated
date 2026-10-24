import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ThemeMode } from '../types/portfolio';
import { soundManager } from '../utils/audio';
import { processImageFile } from '../utils/imageStorage';
import { saveCircleCustomization } from '../utils/circleStorage';
import {
  isVideoUrl,
  resolveImageUrl,
  getVideoEmbedInfo,
  uploadMediaToStorage,
  getR2Status,
  deleteMediaPermanently,
  saveReorderedGalleryToServer,
  R2StatusResult,
} from '../utils/mediaUpload';
import {
  X,
  Plus,
  Trash2,
  Star,
  Upload,
  Link as LinkIcon,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Sparkles,
  CheckCircle2,
  Play,
  Pause,
  ExternalLink,
  Video,
  Volume2,
  VolumeX,
  Image as ImageIcon,
  RefreshCw,
  Cloud,
  CloudOff,
  Info,
  ArrowLeft,
  ArrowRight,
} from 'lucide-react';
import { useMasterEdit } from '../context/MasterEditContext';
import { MasterEditButton } from './MasterAuthModal';
import { MediaLibraryModal } from './MediaLibraryModal';

export interface ProjectGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  circleId: string;
  projectId: string;
  title: string;
  category: string;
  client?: string;
  currentThumbnailUrl: string;
  galleryImages: string[];
  theme: ThemeMode;
  onUpdateGallery: (newImages: string[]) => void;
  onSetThumbnail: (imageUrl: string) => void;
  onUpdateTitle?: (newTitle: string) => void;
  onOpenCircleCustomizer?: () => void;
  onDeleteCircle?: (circleId: string) => void;
  onOpenImageCustomizer?: (circleId: string, initialTab?: 'upload' | 'url' | 'library') => void;
}

const PRESET_DESIGN_IMAGES = [
  'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1600&q=85',
  'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?auto=format&fit=crop&w=1600&q=85',
  'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1600&q=85',
  'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=1600&q=85',
  'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1600&q=85',
  'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1600&q=85',
  'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1600&q=85',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1600&q=85',
];

const CURATED_VIDEO_PRESETS = [
  {
    title: 'Kinetic 3D Commercial Reel',
    category: 'Commercial Cut',
    url: '/uploads/videos/reel-commercial.mp4',
  },
  {
    title: 'Typography & Motion Teaser',
    category: 'Kinetic Type',
    url: '/uploads/videos/reel-typography.mp4',
  },
  {
    title: '3D Spatial Dynamics Loop',
    category: '3D CGI Motion',
    url: '/uploads/videos/reel-commercial.mp4',
  },
  {
    title: 'Studio Showcase Reel',
    category: 'Editorial',
    url: '/videos/reel-commercial.mp4',
  },
];

/**
 * Pinterest-Style Video Pin Card with Hover-to-Play, Audio Toggle, Reordering, and Error Handling
 */
const PinterestVideoPin: React.FC<{
  url: string;
  index: number;
  total: number;
  isCover: boolean;
  isEditMode?: boolean;
  onSelect: () => void;
  onSetCover: (e: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent) => void;
  onMoveLeft?: (e: React.MouseEvent) => void;
  onMoveRight?: (e: React.MouseEvent) => void;
  onReplace?: (e: React.MouseEvent) => void;
}> = ({
  url,
  index,
  total,
  isCover,
  isEditMode = false,
  onSelect,
  onSetCover,
  onDelete,
  onMoveLeft,
  onMoveRight,
  onReplace,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isAudioActive, setIsAudioActive] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<number | null>(null);
  const embedInfo = getVideoEmbedInfo(url);
  const isEmbed = embedInfo.type === 'youtube' || embedInfo.type === 'vimeo' || embedInfo.type === 'drive';
  const embedRatio = url.includes('/shorts/') || url.includes('shorts') ? 9 / 16 : 16 / 9;
  const effectiveRatio = isEmbed ? embedRatio : aspectRatio;

  // Auto-detect and set aspect ratio as soon as video metadata is available
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleMeta = () => {
      if (video.videoWidth && video.videoHeight) {
        setAspectRatio(video.videoWidth / video.videoHeight);
      }
    };

    if (video.readyState >= 1) {
      handleMeta();
    } else {
      video.addEventListener('loadedmetadata', handleMeta);
      return () => video.removeEventListener('loadedmetadata', handleMeta);
    }
  }, [url]);

  const handleMouseEnter = () => {
    if (hasError) return;
    if (videoRef.current) {
      videoRef.current.muted = !isAudioActive;
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsPlaying(true);
          })
          .catch(() => {
            if (videoRef.current) {
              videoRef.current.muted = true;
              videoRef.current.play().then(() => {
                setIsPlaying(true);
                setIsAudioActive(false);
              }).catch(() => {});
            }
          });
      }
    }
  };

  const handleMouseLeave = () => {
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.muted = true;
      try {
        videoRef.current.currentTime = 0.1;
      } catch (_) {}
      setIsPlaying(false);
      setIsAudioActive(false);
    }
  };

  const toggleSound = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      const nextMuted = !videoRef.current.muted;
      videoRef.current.muted = nextMuted;
      setIsAudioActive(!nextMuted);
      if (videoRef.current.paused) {
        videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
      }
    }
  };

  // If video cannot load or 404s, show a graceful informative fallback rather than a black box
  if (hasError) {
    const cleanFilename = url.split('/').pop()?.split('?')[0] || 'video-file';
    return (
      <div className="break-inside-avoid mb-5 group relative rounded-2xl overflow-hidden bg-neutral-900/90 border border-red-500/30 p-5 flex flex-col items-center justify-center text-center min-h-[220px] transition-all duration-300">
        <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-[#e62b1e] mb-3">
          <Video className="w-5 h-5" />
        </div>
        <span className="font-mono text-xs font-bold text-white/90 truncate max-w-[200px] mb-1">
          {cleanFilename.slice(0, 24)}
        </span>
        <span className="text-[11px] text-neutral-400 mb-4">Video file offline or relocated</span>
        
        {isEditMode && (
          <div className="flex items-center gap-2">
            {onReplace && (
              <button
                type="button"
                onClick={onReplace}
                className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-mono text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3 h-3 text-[#e62b1e]" />
                <span>Replace</span>
              </button>
            )}
            <button
              type="button"
              onClick={onDelete}
              className="px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500 text-white font-mono text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3 h-3" />
              <span>Remove</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className="break-inside-avoid mb-5 group relative rounded-2xl overflow-hidden bg-neutral-900 border border-white/10 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1.5 cursor-pointer"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={onSelect}
    >
      <div
        className="relative w-full bg-neutral-950 overflow-hidden flex items-center justify-center transition-all duration-300"
        style={effectiveRatio ? { aspectRatio: `${effectiveRatio}` } : { minHeight: '180px' }}
      >
        {isEmbed ? (
          <div
            className="w-full h-full bg-black flex items-center justify-center"
            style={{ aspectRatio: `${embedRatio}` }}
          >
            <iframe
              src={embedInfo.embedUrl}
              className="w-full h-full border-0 pointer-events-none"
              allow="autoplay; encrypted-media"
            />
          </div>
        ) : (
          <video
            ref={(el) => {
              videoRef.current = el;
              if (el) {
                el.muted = true;
                el.defaultMuted = true;
              }
            }}
            src={`${url}#t=0.001`}
            loop
            playsInline
            preload="metadata"
            muted
            onLoadedMetadata={(e) => {
              const el = e.currentTarget;
              if (el.videoWidth && el.videoHeight) {
                setAspectRatio(el.videoWidth / el.videoHeight);
              }
              try {
                if (el.currentTime === 0 && el.duration > 0) {
                  el.currentTime = 0.001;
                }
              } catch (_) {}
            }}
            onError={() => {
              setHasError(true);
            }}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            style={effectiveRatio ? { aspectRatio: `${effectiveRatio}` } : undefined}
          />
        )}

        {/* Live Audio & Playing Indicator */}
        <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5 pointer-events-none">
          {isPlaying ? (
            <div className="px-2.5 py-1 rounded-full bg-black/85 backdrop-blur-md text-white border border-white/20 flex items-center gap-1.5 shadow-lg">
              <span className="w-2 h-2 rounded-full bg-[#e62b1e] animate-ping" />
              {isAudioActive ? (
                <>
                  <Volume2 className="w-3.5 h-3.5 text-[#e62b1e]" />
                  <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-white">
                    Audio Active
                  </span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-[#e62b1e] text-[#e62b1e]" />
                  <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-neutral-300">
                    Playing
                  </span>
                </>
              )}
            </div>
          ) : (
            <div className="px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md text-white/90 border border-white/15 flex items-center gap-1.5 group-hover:opacity-0 transition-opacity">
              <Play className="w-3 h-3 fill-white" />
              <span className="font-mono text-[9px] font-bold uppercase tracking-wider">
                Hover to Play
              </span>
            </div>
          )}
        </div>

        {/* Top-Right Badges & Controls */}
        <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5">
          {isPlaying && (
            <button
              type="button"
              onClick={toggleSound}
              className="w-8 h-8 rounded-full bg-black/80 hover:bg-black text-white flex items-center justify-center border border-white/20 backdrop-blur-md transition-all shadow-lg cursor-pointer"
              title={isAudioActive ? 'Mute Audio' : 'Unmute Audio'}
            >
              {isAudioActive ? <Volume2 className="w-3.5 h-3.5 text-[#e62b1e]" /> : <VolumeX className="w-3.5 h-3.5 text-neutral-400" />}
            </button>
          )}

          {isCover && (
            <span className="px-2.5 py-1 rounded-full bg-[#e62b1e] text-white font-mono text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-lg">
              <Star className="w-3 h-3 fill-white" />
              <span>Cover</span>
            </span>
          )}

          {!isCover && isEditMode && (
            <button
              type="button"
              onClick={onSetCover}
              className="opacity-0 group-hover:opacity-100 transition-opacity px-2.5 py-1 rounded-full bg-black/80 hover:bg-[#e62b1e] text-white font-mono text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 shadow-lg border border-white/15 cursor-pointer"
              title="Set as Circle Video Cover"
            >
              <Star className="w-3 h-3" />
              <span>Set Cover</span>
            </button>
          )}

          {isEditMode && onReplace && (
            <button
              type="button"
              onClick={onReplace}
              className="opacity-0 group-hover:opacity-100 transition-opacity w-8 h-8 rounded-full bg-black/80 hover:bg-[#e62b1e] text-white flex items-center justify-center shadow-lg transition-all hover:scale-110 border border-white/15 cursor-pointer"
              title="Replace Video"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}

          {isEditMode && (
            <button
              type="button"
              onClick={onDelete}
              className="opacity-0 group-hover:opacity-100 transition-opacity w-8 h-8 rounded-full bg-black/80 hover:bg-red-600 text-white flex items-center justify-center shadow-lg transition-all hover:scale-110 border border-white/15 cursor-pointer"
              title="Remove video from gallery"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Reordering Controls (Only in Edit Mode) */}
        {isEditMode && (
          <div className="absolute bottom-3 left-3 z-20 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {index > 0 && onMoveLeft && (
              <button
                type="button"
                onClick={onMoveLeft}
                className="w-7 h-7 rounded-full bg-black/80 hover:bg-white text-white hover:text-black flex items-center justify-center border border-white/20 backdrop-blur-md transition-colors cursor-pointer"
                title="Move pin earlier in order"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
            {index < total - 1 && onMoveRight && (
              <button
                type="button"
                onClick={onMoveRight}
                className="w-7 h-7 rounded-full bg-black/80 hover:bg-white text-white hover:text-black flex items-center justify-center border border-white/20 backdrop-blur-md transition-colors cursor-pointer"
                title="Move pin later in order"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {/* Play Icon Circle (visible when not hovered) */}
        {!isPlaying && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none group-hover:opacity-0 transition-opacity bg-black/20">
            <div className="w-12 h-12 rounded-full bg-black/75 backdrop-blur-xs flex items-center justify-center text-white border border-white/25 shadow-2xl">
              <Play className="w-5 h-5 fill-white ml-0.5" />
            </div>
          </div>
        )}

        {/* Bottom Expand Info Bar */}
        <div className="absolute bottom-3 right-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-20 pointer-events-none">
          <span className="px-2.5 py-1 rounded-full bg-black/80 backdrop-blur-md text-white font-mono text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 border border-white/15">
            <Maximize2 className="w-3 h-3 text-[#e62b1e]" />
            <span>Open Cinema</span>
          </span>
        </div>
      </div>
    </div>
  );
};

/**
 * Pinterest-Style Image Pin Card with Reordering, Replacement, and Cover Selection
 */
const PinterestImagePin: React.FC<{
  url: string;
  index: number;
  total: number;
  isCover: boolean;
  isEditMode?: boolean;
  onSelect: () => void;
  onSetCover: (e: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent) => void;
  onMoveLeft?: (e: React.MouseEvent) => void;
  onMoveRight?: (e: React.MouseEvent) => void;
  onReplace?: (e: React.MouseEvent) => void;
}> = ({
  url,
  index,
  total,
  isCover,
  isEditMode = false,
  onSelect,
  onSetCover,
  onDelete,
  onMoveLeft,
  onMoveRight,
  onReplace,
}) => {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    const cleanFilename = url.split('/').pop()?.split('?')[0] || 'image-file';
    return (
      <div className="break-inside-avoid mb-5 group relative rounded-2xl overflow-hidden bg-neutral-900/90 border border-neutral-700 p-5 flex flex-col items-center justify-center text-center min-h-[200px]">
        <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-neutral-400 mb-2">
          <ImageIcon className="w-5 h-5" />
        </div>
        <span className="font-mono text-xs font-bold text-white/80 truncate max-w-[180px] mb-1">
          {cleanFilename.slice(0, 20)}
        </span>
        <span className="text-[10px] text-neutral-500 mb-3">Image unavailable</span>
        {isEditMode && (
          <div className="flex items-center gap-2">
            {onReplace && (
              <button
                type="button"
                onClick={onReplace}
                className="px-2.5 py-1 rounded-md bg-white/10 hover:bg-white/20 text-white font-mono text-[10px] font-bold uppercase tracking-wider flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3 text-[#e62b1e]" />
                <span>Replace</span>
              </button>
            )}
            <button
              type="button"
              onClick={onDelete}
              className="px-2.5 py-1 rounded-md bg-red-500/20 hover:bg-red-500 text-white font-mono text-[10px] font-bold uppercase tracking-wider flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" />
              <span>Remove</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className="break-inside-avoid mb-5 group relative rounded-2xl overflow-hidden bg-neutral-900 border border-white/10 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1.5 cursor-pointer"
      onClick={onSelect}
    >
      <img
        src={url}
        alt={`Gallery pin ${index + 1}`}
        referrerPolicy="no-referrer"
        loading="lazy"
        onError={() => setHasError(true)}
        className="w-full h-auto object-cover group-hover:scale-[1.03] transition-transform duration-500 ease-out"
      />

      {/* Top Badges & Actions */}
      <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5">
        {isCover && (
          <span className="px-2.5 py-1 rounded-full bg-[#e62b1e] text-white font-mono text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-lg">
            <Star className="w-3 h-3 fill-white" />
            <span>Cover</span>
          </span>
        )}

        {!isCover && isEditMode && (
          <button
            type="button"
            onClick={onSetCover}
            className="opacity-0 group-hover:opacity-100 transition-opacity px-2.5 py-1 rounded-full bg-black/80 hover:bg-[#e62b1e] text-white font-mono text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 shadow-lg border border-white/15 cursor-pointer"
            title="Set as Circle Cover"
          >
            <Star className="w-3 h-3" />
            <span>Set Cover</span>
          </button>
        )}

        {isEditMode && onReplace && (
          <button
            type="button"
            onClick={onReplace}
            className="opacity-0 group-hover:opacity-100 transition-opacity w-8 h-8 rounded-full bg-black/80 hover:bg-[#e62b1e] text-white flex items-center justify-center shadow-lg transition-all hover:scale-110 border border-white/15 cursor-pointer"
            title="Replace Image"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        )}

        {isEditMode && (
          <button
            type="button"
            onClick={onDelete}
            className="opacity-0 group-hover:opacity-100 transition-opacity w-8 h-8 rounded-full bg-black/80 hover:bg-red-600 text-white flex items-center justify-center shadow-lg transition-all hover:scale-110 border border-white/15 cursor-pointer"
            title="Remove from gallery"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Reordering Controls (Only in Edit Mode) */}
      {isEditMode && (
        <div className="absolute bottom-3 left-3 z-20 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {index > 0 && onMoveLeft && (
            <button
              type="button"
              onClick={onMoveLeft}
              className="w-7 h-7 rounded-full bg-black/80 hover:bg-white text-white hover:text-black flex items-center justify-center border border-white/20 backdrop-blur-md transition-colors cursor-pointer"
              title="Move pin earlier"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
          {index < total - 1 && onMoveRight && (
            <button
              type="button"
              onClick={onMoveRight}
              className="w-7 h-7 rounded-full bg-black/80 hover:bg-white text-white hover:text-black flex items-center justify-center border border-white/20 backdrop-blur-md transition-colors cursor-pointer"
              title="Move pin later"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* Bottom Info Bar on hover */}
      <div className="absolute bottom-3 right-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-20 pointer-events-none">
        <span className="px-2.5 py-1 rounded-full bg-black/80 backdrop-blur-md text-white font-mono text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 border border-white/15">
          <Maximize2 className="w-3 h-3 text-[#e62b1e]" />
          <span>Expand</span>
        </span>
      </div>
    </div>
  );
};

export const ProjectGalleryModal: React.FC<ProjectGalleryModalProps> = ({
  isOpen,
  onClose,
  circleId,
  projectId,
  title,
  category,
  client,
  currentThumbnailUrl,
  galleryImages,
  theme,
  onUpdateGallery,
  onSetThumbnail,
  onDeleteCircle,
  onOpenImageCustomizer,
}) => {
  const { isEditMode } = useMasterEdit();
  const [images, setImages] = useState<string[]>(galleryImages);
  const [activeCoverUrl, setActiveCoverUrl] = useState<string>(currentThumbnailUrl);
  const [cinemaIndex, setCinemaIndex] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isImageUrlModalOpen, setIsImageUrlModalOpen] = useState<boolean>(false);
  const [imageUrlInput, setImageUrlInput] = useState<string>('');
  const [setImageAsCover, setSetImageAsCover] = useState<boolean>(false);
  const [isDraggingOver, setIsDraggingOver] = useState<boolean>(false);

  // Dedicated Video URL Modal state
  const [isVideoModalOpen, setIsVideoModalOpen] = useState<boolean>(false);
  const [videoUrlInput, setVideoUrlInput] = useState<string>('');
  const [setVideoAsCover, setSetVideoAsCover] = useState<boolean>(true);

  // Cloudflare R2 Storage State
  const [r2Status, setR2Status] = useState<R2StatusResult | null>(null);
  const [isR2InfoModalOpen, setIsR2InfoModalOpen] = useState<boolean>(false);
  const [replacingIndex, setReplacingIndex] = useState<number | null>(null);

  // Cloudflare R2 Media Library & Importer Modal state
  const [isMediaLibraryModalOpen, setIsMediaLibraryModalOpen] = useState<boolean>(false);
  const [mediaLibraryModalTab, setMediaLibraryModalTab] = useState<'library' | 'upload' | 'import'>('import');

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const videoFileInputRef = useRef<HTMLInputElement | null>(null);
  const replaceFileInputRef = useRef<HTMLInputElement | null>(null);

  // Fetch Cloudflare R2 configuration status on mount
  useEffect(() => {
    getR2Status().then(setR2Status).catch(() => {});
  }, []);

  // Synchronize incoming gallery & thumbnail
  useEffect(() => {
    if (galleryImages && galleryImages.length > 0) {
      setImages(galleryImages);
    }
  }, [galleryImages]);

  useEffect(() => {
    if (currentThumbnailUrl) {
      setActiveCoverUrl(currentThumbnailUrl);
    }
  }, [currentThumbnailUrl]);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3200);
  }, []);

  // Keyboard Navigation: Escape to close cinema lightbox or gallery
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (cinemaIndex !== null) {
          setCinemaIndex(null);
        } else if (isR2InfoModalOpen) {
          setIsR2InfoModalOpen(false);
        } else if (isVideoModalOpen) {
          setIsVideoModalOpen(false);
        } else if (isImageUrlModalOpen) {
          setIsImageUrlModalOpen(false);
        } else {
          onClose();
        }
      } else if (e.key === 'ArrowRight' || e.key === 'j') {
        if (cinemaIndex !== null && images.length > 1) {
          soundManager.playSlide?.();
          setCinemaIndex((curr) => (curr !== null ? (curr + 1) % images.length : 0));
        }
      } else if (e.key === 'ArrowLeft' || e.key === 'k') {
        if (cinemaIndex !== null && images.length > 1) {
          soundManager.playSlide?.();
          setCinemaIndex((curr) => (curr !== null ? (curr - 1 + images.length) % images.length : 0));
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, cinemaIndex, images.length, isImageUrlModalOpen, isVideoModalOpen, isR2InfoModalOpen, onClose]);

  if (!isOpen) return null;

  /**
   * Universal upload for image or video files directly to Cloudflare R2 (or local fallback)
   */
  const handleUploadFiles = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setUploadProgress('Preparing upload...');
    soundManager.playSlide?.();

    const uploadedUrls: string[] = [];
    let lastStorage: 'cloudflare-r2' | 'local-storage' = 'local-storage';

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setUploadProgress(`Uploading ${i + 1} of ${files.length}...`);

        const res = await uploadMediaToStorage(file, {
          circleId,
          projectId: circleId,
          addToGallery: true,
          setAsCover: i === 0,
          onProgress: (pct) => {
            setUploadProgress(`Uploading ${i + 1}/${files.length} (${pct}%)`);
          },
        });

        if (res.success && res.url) {
          uploadedUrls.push(res.url);
          lastStorage = res.storage;
        }
      }

      if (uploadedUrls.length > 0) {
        const updated = [...uploadedUrls, ...images.filter((img) => !uploadedUrls.includes(img))];
        setImages(updated);
        onUpdateGallery(updated);

        const firstItem = uploadedUrls[0];
        const isFirstItemVideo = isVideoUrl(firstItem);

        setActiveCoverUrl(firstItem);
        onSetThumbnail(firstItem);

        await saveCircleCustomization(circleId, {
          imageUrl: firstItem,
          videoUrl: isFirstItemVideo ? firstItem : undefined,
          mediaType: isFirstItemVideo ? 'video' : 'image',
          gallery: updated,
        });

        await saveReorderedGalleryToServer(
          circleId,
          updated,
          firstItem,
          isFirstItemVideo ? 'video' : 'image'
        );

        const storageLabel = lastStorage === 'cloudflare-r2' ? 'Cloudflare R2' : 'server';
        showToast(
          uploadedUrls.length === 1
            ? `✓ Media uploaded & saved permanently to ${storageLabel}!`
            : `✓ ${uploadedUrls.length} items saved permanently to ${storageLabel}!`
        );
      }
    } catch (err: any) {
      console.error('Gallery file upload error:', err);
      showToast(err.message || 'Failed to upload media to storage.');
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (videoFileInputRef.current) videoFileInputRef.current.value = '';
    }
  };

  /**
   * Reorder pin item in gallery (moves item earlier or later)
   */
  const handleMoveItem = async (fromIndex: number, direction: 'left' | 'right', e?: React.MouseEvent) => {
    e?.stopPropagation();
    const toIndex = fromIndex + (direction === 'left' ? -1 : 1);
    if (toIndex < 0 || toIndex >= images.length) return;

    soundManager.playClick();
    const reordered = [...images];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);

    setImages(reordered);
    onUpdateGallery(reordered);
    await saveReorderedGalleryToServer(circleId, reordered, activeCoverUrl);
    showToast('✓ Pin order updated');
  };

  /**
   * Replace an individual pin with a new file
   */
  const handleReplaceItem = (index: number, e?: React.MouseEvent) => {
    e?.stopPropagation();
    soundManager.playClick();
    setReplacingIndex(index);
    if (replaceFileInputRef.current) {
      replaceFileInputRef.current.click();
    }
  };

  const handleReplacementSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files[0];
    if (!file || replacingIndex === null) return;
    const targetIdx = replacingIndex;
    e.target.value = '';

    setIsUploading(true);
    setUploadProgress(`Uploading replacement...`);

    try {
      const res = await uploadMediaToStorage(file, {
        circleId,
        projectId: circleId,
        addToGallery: false,
        setAsCover: targetIdx === 0,
        onProgress: (pct) => setUploadProgress(`Replacing: ${pct}%`),
      });

      if (res.success && res.url) {
        const updated = [...images];
        const oldUrl = updated[targetIdx];
        updated[targetIdx] = res.url;
        setImages(updated);
        onUpdateGallery(updated);

        let newCover = activeCoverUrl;
        if (activeCoverUrl === oldUrl) {
          newCover = res.url;
          setActiveCoverUrl(newCover);
          onSetThumbnail(newCover);
        }

        await saveReorderedGalleryToServer(circleId, updated, newCover);
        const storageLabel = res.storage === 'cloudflare-r2' ? 'Cloudflare R2' : 'server';
        showToast(`✓ Replaced pin & saved to ${storageLabel}`);
      }
    } catch (err: any) {
      console.error('Replacement failed:', err);
      showToast('Failed to replace media');
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
      setReplacingIndex(null);
    }
  };

  /**
   * Remove media from gallery and delete permanently from storage
   */
  const handleDeleteImage = async (itemToRemove: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    soundManager.playClick();

    if (images.length <= 1) {
      showToast('A circle gallery must retain at least one media item.');
      return;
    }

    const updated = images.filter((img) => img !== itemToRemove);
    setImages(updated);
    onUpdateGallery(updated);

    let newCoverUrl = activeCoverUrl;
    if (activeCoverUrl === itemToRemove && updated.length > 0) {
      newCoverUrl = updated[0];
      setActiveCoverUrl(newCoverUrl);
      onSetThumbnail(newCoverUrl);
    }

    try {
      await deleteMediaPermanently(itemToRemove, circleId);
      await saveReorderedGalleryToServer(circleId, updated, newCoverUrl);
    } catch (err) {
      console.warn('Failed to delete media on server:', err);
    }

    if (cinemaIndex !== null && cinemaIndex >= updated.length) {
      setCinemaIndex(updated.length - 1);
    }
    showToast('✓ Item removed from gallery');
  };

  /**
   * Add a Video with URL (Directly saved to server backend and circle customizations)
   */
  const handleAddVideoUrl = async (customUrl?: string) => {
    const rawUrl = (customUrl || videoUrlInput).trim();
    if (!rawUrl) return;

    soundManager.playClick();
    const resolvedVideoUrl = resolveImageUrl(rawUrl);

    const updated = [resolvedVideoUrl, ...images.filter((img) => img !== resolvedVideoUrl)];
    setImages(updated);
    onUpdateGallery(updated);

    if (setVideoAsCover) {
      onSetThumbnail(resolvedVideoUrl);
      await saveCircleCustomization(circleId, {
        imageUrl: resolvedVideoUrl,
        videoUrl: resolvedVideoUrl,
        mediaType: 'video',
        gallery: updated,
      });
    } else {
      await saveCircleCustomization(circleId, {
        gallery: updated,
      });
    }

    try {
      await fetch(`/api/circle-gallery/${encodeURIComponent(circleId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: resolvedVideoUrl,
          setAsCover: setVideoAsCover,
          mediaType: 'video',
          gallery: updated,
        }),
      });

      // Also persist to /api/save-all-urls for maximum reliability across devices
      await fetch('/api/save-all-urls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          circleId,
          urls: updated,
          coverUrl: setVideoAsCover ? resolvedVideoUrl : undefined,
          mediaType: 'video',
        }),
      });
    } catch (err) {
      console.warn('Failed to sync video URL to server gallery:', err);
    }

    setVideoUrlInput('');
    setIsVideoModalOpen(false);
    showToast(
      setVideoAsCover
        ? '✓ Video URL saved to backend server & set as cover!'
        : '✓ Video URL saved to backend server gallery!'
    );
  };

  /**
   * Add image via direct URL / web link (Directly saved to server backend and circle customizations)
   */
  const handleAddImageUrl = async () => {
    const rawUrl = imageUrlInput.trim();
    if (!rawUrl) return;

    const resolved = resolveImageUrl(rawUrl);
    soundManager.playClick();

    const updated = [resolved, ...images.filter((img) => img !== resolved)];
    setImages(updated);
    onUpdateGallery(updated);

    if (setImageAsCover) {
      onSetThumbnail(resolved);
      await saveCircleCustomization(circleId, {
        imageUrl: resolved,
        mediaType: 'image',
        gallery: updated,
      });
    } else {
      await saveCircleCustomization(circleId, {
        gallery: updated,
      });
    }

    try {
      await fetch(`/api/circle-gallery/${encodeURIComponent(circleId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: resolved,
          setAsCover: setImageAsCover,
          mediaType: 'image',
          gallery: updated,
        }),
      });

      // Also persist to /api/save-all-urls for maximum reliability across devices
      await fetch('/api/save-all-urls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          circleId,
          urls: updated,
          coverUrl: setImageAsCover ? resolved : undefined,
          mediaType: 'image',
        }),
      });
    } catch (err) {
      console.warn('Failed to sync image URL to server gallery:', err);
    }

    setImageUrlInput('');
    setIsImageUrlModalOpen(false);
    showToast(
      setImageAsCover
        ? '✓ Image URL saved to backend server & set as cover!'
        : '✓ Image URL saved to backend server gallery!'
    );
  };

  /**
   * Add curated design preset
   */
  const handleAddPreset = async () => {
    soundManager.playClick();
    const unusedPresets = PRESET_DESIGN_IMAGES.filter((p) => !images.includes(p));
    const chosen =
      unusedPresets.length > 0
        ? unusedPresets[Math.floor(Math.random() * unusedPresets.length)]
        : PRESET_DESIGN_IMAGES[Math.floor(Math.random() * PRESET_DESIGN_IMAGES.length)];

    const updated = [chosen, ...images];
    setImages(updated);
    onUpdateGallery(updated);

    fetch(`/api/circle-gallery/${encodeURIComponent(circleId)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageUrl: chosen }),
    }).catch((e) => console.warn(e));

    showToast('High-resolution pin added to gallery!');
  };

  /**
   * Set selected item as the circle's cover thumbnail
   */
  const handleSetAsThumbnail = async (targetUrl: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    soundManager.playClick();
    setActiveCoverUrl(targetUrl);
    onSetThumbnail(targetUrl);

    const isTargetVideo = isVideoUrl(targetUrl);

    // Save customization with proper mediaType
    if (isTargetVideo) {
      await saveCircleCustomization(circleId, {
        imageUrl: targetUrl,
        videoUrl: targetUrl,
        mediaType: 'video',
        gallery: images,
      });
    } else {
      await saveCircleCustomization(circleId, {
        imageUrl: targetUrl,
        videoUrl: undefined,
        mediaType: 'image',
        gallery: images,
      });
    }

    try {
      await fetch(`/api/circle-gallery/${encodeURIComponent(circleId)}/thumbnail`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: targetUrl,
          mediaType: isTargetVideo ? 'video' : 'image',
        }),
      });
    } catch (err) {
      console.warn('Failed to set thumbnail on server:', err);
    }

    showToast(isTargetVideo ? '✓ Set as circle video cover!' : '✓ Set as circle cover image!');
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleUploadFiles(e.dataTransfer.files);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className="fixed inset-0 z-50 bg-[#070709]/95 backdrop-blur-2xl flex flex-col justify-between overflow-hidden select-none text-white"
      >
        {/* Hidden File Input for Native Image Uploads */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/*,.mp4,.mov,.webm,.ogg,.m4v,.mkv,.avi"
          onChange={(e) => {
            if (e.target.files) handleUploadFiles(e.target.files);
            e.target.value = '';
          }}
          className="hidden"
        />

        {/* Hidden File Input for Dedicated Video Uploads */}
        <input
          ref={videoFileInputRef}
          type="file"
          accept="video/*,.mp4,.mov,.webm,.ogg,.m4v,.mkv,.avi,video/mp4,video/webm,video/quicktime"
          onChange={(e) => {
            if (e.target.files) handleUploadFiles(e.target.files);
            e.target.value = '';
          }}
          className="hidden"
        />

        {/* Hidden File Input for In-Place Pin Replacement */}
        <input
          ref={replaceFileInputRef}
          type="file"
          accept="image/*,video/*,.mp4,.mov,.webm,.ogg,.m4v,.mkv,.avi"
          onChange={handleReplacementSelected}
          className="hidden"
        />

        {/* Drag & Drop Visual Overlay */}
        {isDraggingOver && (
          <div className="absolute inset-0 z-50 bg-black/85 backdrop-blur-md border-4 border-dashed border-[#e62b1e] flex flex-col items-center justify-center pointer-events-none">
            <Upload className="w-16 h-16 text-[#e62b1e] animate-bounce mb-4" />
            <span className="font-unbounded font-black text-2xl uppercase tracking-wider text-white">
              Drop images or videos to upload
            </span>
            <span className="font-mono text-sm text-neutral-400 mt-2">
              Media will be stored permanently in {r2Status?.configured ? 'Cloudflare R2' : 'backend storage'}
            </span>
          </div>
        )}

        {/* ================= TOP NAVIGATION BAR ================= */}
        <header className="w-full px-4 sm:px-8 py-4 sm:py-5 flex items-center justify-between border-b border-white/10 shrink-0 z-30 bg-black/60 backdrop-blur-md">
          {/* Left: Project Branding & Meta */}
          <div className="flex items-center gap-3.5 min-w-0 pr-4">
            <span className="w-2.5 h-2.5 rounded-full bg-[#e62b1e] shrink-0 shadow-[0_0_12px_#e62b1e]" />
            <div className="min-w-0">
              <h1 className="font-unbounded font-black text-base sm:text-xl lg:text-2xl tracking-tight text-white uppercase truncate leading-none">
                {title}
              </h1>
              <div className="flex items-center gap-2 font-mono text-[11px] sm:text-xs text-neutral-400 mt-1.5 uppercase font-medium">
                <span className="text-[#e62b1e] font-bold">{category}</span>
                {client && <span className="hidden sm:inline text-neutral-600">•</span>}
                {client && <span className="hidden sm:inline truncate">{client}</span>}
                <span className="text-neutral-600">•</span>
                <span className="text-neutral-300 font-mono-tabular">
                  {images.length} {images.length === 1 ? 'PIN' : 'PINS'}
                </span>
                <span className="hidden sm:inline text-neutral-600">•</span>
                <span className="hidden sm:inline text-neutral-400 text-[10px]">
                  Hover video to play with audio
                </span>
              </div>
            </div>
          </div>

          {/* Right: Actions & Close */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Cloudflare R2 Connection Status Indicator */}
            <button
              type="button"
              onClick={() => setIsR2InfoModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white font-mono text-[11px] font-bold tracking-wider transition-all cursor-pointer"
              title="Click to view Cloudflare R2 connection details"
            >
              {r2Status?.configured ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <Cloud className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="hidden sm:inline text-emerald-300">R2 Connected</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  <CloudOff className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden sm:inline text-amber-300">Local (R2 Ready)</span>
                </>
              )}
            </button>

            {/* Master Edit Toggle Button */}
            <MasterEditButton theme="dark" variant="compact" />

            {/* R2 BUCKET IMPORT / BULK UPLOAD BUTTON (Only in Master Edit Mode) */}
            {isEditMode && (
              <button
                type="button"
                onClick={() => {
                  soundManager.playClick();
                  setMediaLibraryModalTab('import');
                  setIsMediaLibraryModalOpen(true);
                }}
                className="flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-4 py-2 rounded-full bg-[#e62b1e]/20 hover:bg-[#e62b1e] text-white font-mono text-xs font-bold uppercase tracking-wider border border-[#e62b1e]/40 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer shadow-md"
                title="Import files from Cloudflare R2 bucket directly to this circle"
              >
                <Cloud className="w-3.5 h-3.5 text-[#e62b1e]" />
                <span>R2 Import</span>
              </button>
            )}

            {/* VIDEO URL BUTTON (Only in Master Edit Mode) */}
            {isEditMode && (
              <button
                type="button"
                onClick={() => {
                  soundManager.playClick();
                  setIsVideoModalOpen(true);
                }}
                className="flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white font-mono text-xs font-bold uppercase tracking-wider border border-white/15 hover:border-white/30 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                title="Add Video with URL"
              >
                <Video className="w-3.5 h-3.5 text-[#e62b1e]" />
                <span>Video URL</span>
              </button>
            )}

            {/* IMAGE URL BUTTON (Only in Master Edit Mode) */}
            {isEditMode && (
              <button
                type="button"
                onClick={() => {
                  soundManager.playClick();
                  setIsImageUrlModalOpen(true);
                }}
                className="flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white font-mono text-xs font-bold uppercase tracking-wider border border-white/15 hover:border-white/30 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                title="Add Image with URL"
              >
                <ImageIcon className="w-3.5 h-3.5 text-[#e62b1e]" />
                <span>Image URL</span>
              </button>
            )}

            {/* Close Button */}
            <button
              type="button"
              onClick={() => {
                soundManager.playClick();
                onClose();
              }}
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center border border-white/10 transition-colors cursor-pointer ml-1"
              title="Close gallery (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* ================= TOAST NOTIFICATION ================= */}
        <AnimatePresence>
          {toastMessage && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="fixed top-24 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-[#16161a] border border-white/15 text-white font-mono text-xs font-bold shadow-2xl flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4 text-[#e62b1e]" />
              <span>{toastMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ================= PINTEREST MASONRY GALLERY ================= */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6">
          <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-5 [column-fill:_balance] pb-16 max-w-[1920px] mx-auto">
            {/* Pinterest "+ Import from Cloudflare R2" Drop Card (Only in Master Edit Mode) */}
            {isEditMode && (
              <div
                onClick={() => {
                  soundManager.playClick();
                  setMediaLibraryModalTab('import');
                  setIsMediaLibraryModalOpen(true);
                }}
                className="break-inside-avoid mb-5 p-6 rounded-2xl border-2 border-dashed border-[#e62b1e]/60 hover:border-[#e62b1e] bg-[#e62b1e]/10 hover:bg-[#e62b1e]/20 flex flex-col items-center justify-center gap-3 text-white cursor-pointer transition-all min-h-[200px]"
              >
                <div className="w-12 h-12 rounded-full bg-[#e62b1e]/30 border border-[#e62b1e]/50 flex items-center justify-center text-white">
                  <Cloud className="w-6 h-6 text-[#e62b1e]" />
                </div>
                <span className="font-unbounded font-bold text-xs uppercase tracking-wider text-white text-center">
                  Import from Cloudflare R2
                </span>
                <span className="font-mono text-[10px] text-neutral-300 text-center">
                  Select and import all videos & images from bucket
                </span>
              </div>
            )}

            {/* Pinterest "+ Add Video URL Pin" Drop Card (Only in Master Edit Mode) */}
            {isEditMode && (
              <div
                onClick={() => {
                  soundManager.playClick();
                  setIsVideoModalOpen(true);
                }}
                className="break-inside-avoid mb-5 p-6 rounded-2xl border-2 border-dashed border-[#e62b1e]/40 hover:border-[#e62b1e] bg-[#e62b1e]/5 hover:bg-[#e62b1e]/10 flex flex-col items-center justify-center gap-3 text-[#e62b1e] hover:text-white cursor-pointer transition-all min-h-[200px]"
              >
                <div className="w-12 h-12 rounded-full bg-[#e62b1e]/20 border border-[#e62b1e]/30 flex items-center justify-center text-[#e62b1e]">
                  <Video className="w-6 h-6" />
                </div>
                <span className="font-unbounded font-bold text-xs uppercase tracking-wider text-white">
                  Add Video URL
                </span>
                <span className="font-mono text-[10px] text-neutral-300 text-center">
                  Paste MP4 / WebM video link
                </span>
              </div>
            )}

            {/* Pinterest "+ Add Image URL Pin" Drop Card (Only in Master Edit Mode) */}
            {isEditMode && (
              <div
                onClick={() => {
                  soundManager.playClick();
                  setIsImageUrlModalOpen(true);
                }}
                className="break-inside-avoid mb-5 p-6 rounded-2xl border-2 border-dashed border-white/20 hover:border-[#e62b1e] bg-white/[0.02] hover:bg-[#e62b1e]/5 flex flex-col items-center justify-center gap-3 text-neutral-400 hover:text-white cursor-pointer transition-all min-h-[200px]"
              >
                <div className="w-12 h-12 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white">
                  <ImageIcon className="w-6 h-6 text-[#e62b1e]" />
                </div>
                <span className="font-unbounded font-bold text-xs uppercase tracking-wider text-white">
                  Add Image URL
                </span>
                <span className="font-mono text-[10px] text-neutral-400 text-center">
                  Paste web link or Google Drive image URL
                </span>
              </div>
            )}

            {/* Pinterest Pins */}
            {images.map((itemUrl, idx) => {
              const isCover = itemUrl === activeCoverUrl || itemUrl === currentThumbnailUrl;
              const isVid = isVideoUrl(itemUrl);

              if (isVid) {
                return (
                  <PinterestVideoPin
                    key={`pin-${itemUrl}-${idx}`}
                    url={itemUrl}
                    index={idx}
                    total={images.length}
                    isCover={isCover}
                    isEditMode={isEditMode}
                    onSelect={() => {
                      soundManager.playClick();
                      setCinemaIndex(idx);
                    }}
                    onSetCover={(e) => handleSetAsThumbnail(itemUrl, e)}
                    onDelete={(e) => handleDeleteImage(itemUrl, e)}
                    onMoveLeft={(e) => handleMoveItem(idx, 'left', e)}
                    onMoveRight={(e) => handleMoveItem(idx, 'right', e)}
                    onReplace={(e) => handleReplaceItem(idx, e)}
                  />
                );
              }

              return (
                <PinterestImagePin
                  key={`pin-${itemUrl}-${idx}`}
                  url={itemUrl}
                  index={idx}
                  total={images.length}
                  isCover={isCover}
                  isEditMode={isEditMode}
                  onSelect={() => {
                    soundManager.playClick();
                    setCinemaIndex(idx);
                  }}
                  onSetCover={(e) => handleSetAsThumbnail(itemUrl, e)}
                  onDelete={(e) => handleDeleteImage(itemUrl, e)}
                  onMoveLeft={(e) => handleMoveItem(idx, 'left', e)}
                  onMoveRight={(e) => handleMoveItem(idx, 'right', e)}
                  onReplace={(e) => handleReplaceItem(idx, e)}
                />
              );
            })}
          </div>
        </div>

        {/* ================= FULLSCREEN CINEMA EXPANDED LIGHTBOX ================= */}
        {cinemaIndex !== null && images[cinemaIndex] && (() => {
          const activeMedia = images[cinemaIndex];
          const isCover = activeMedia === activeCoverUrl || activeMedia === currentThumbnailUrl;
          const isVid = isVideoUrl(activeMedia);
          const embedInfo = getVideoEmbedInfo(activeMedia);

          return (
            <div
              className="fixed inset-0 z-50 bg-black/95 backdrop-blur-2xl flex flex-col justify-between p-4 sm:p-8"
              onClick={() => setCinemaIndex(null)}
            >
              {/* Top Bar */}
              <div className="flex items-center justify-between z-20" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center gap-3">
                  <span className="font-unbounded text-sm sm:text-base font-black uppercase text-white truncate max-w-sm">
                    {title}
                  </span>
                  <span className="font-mono text-xs text-neutral-400">
                    {cinemaIndex + 1} / {images.length}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {isCover ? (
                    <span className="px-3 py-1 rounded-full bg-[#e62b1e] text-white font-mono text-xs font-bold uppercase flex items-center gap-1.5">
                      <Star className="w-3.5 h-3.5 fill-white" />
                      <span>Circle Cover</span>
                    </span>
                  ) : isEditMode ? (
                    <button
                      type="button"
                      onClick={(e) => handleSetAsThumbnail(activeMedia, e)}
                      className="px-3 py-1 rounded-full bg-white/10 hover:bg-[#e62b1e] text-white font-mono text-xs font-bold uppercase flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Star className="w-3.5 h-3.5" />
                      <span>Set as Cover</span>
                    </button>
                  ) : null}

                  {isEditMode && (
                    <button
                      type="button"
                      onClick={(e) => handleDeleteImage(activeMedia, e)}
                      className="p-2 rounded-full bg-white/10 hover:bg-red-600 text-white transition-colors cursor-pointer"
                      title="Delete item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setCinemaIndex(null)}
                    className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Main Media Stage */}
              <div className="flex-1 flex items-center justify-center relative my-4" onClick={(e) => e.stopPropagation()}>
                {/* Prev Slide Arrow */}
                {images.length > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      soundManager.playSlide?.();
                      setCinemaIndex((curr) => (curr !== null ? (curr - 1 + images.length) % images.length : 0));
                    }}
                    className="absolute left-2 sm:left-4 z-20 w-12 h-12 rounded-full bg-black/70 hover:bg-black text-white border border-white/20 flex items-center justify-center backdrop-blur-md transition-all hover:scale-110 cursor-pointer"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                )}

                {/* Media Container */}
                <div className="relative max-h-full max-w-6xl w-full flex items-center justify-center">
                  {isVid ? (
                    embedInfo.type === 'youtube' || embedInfo.type === 'vimeo' || embedInfo.type === 'drive' ? (
                      <div className="w-full aspect-video max-h-[75vh] rounded-2xl overflow-hidden shadow-2xl bg-black">
                        <iframe
                          src={embedInfo.embedUrl}
                          className="w-full h-full border-0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                          allowFullScreen
                        />
                      </div>
                    ) : (
                      <video
                        key={activeMedia}
                        src={activeMedia}
                        controls
                        autoPlay
                        loop
                        playsInline
                        className="max-h-[75vh] max-w-full w-auto object-contain rounded-2xl shadow-2xl bg-black"
                      />
                    )
                  ) : (
                    <img
                      src={activeMedia}
                      alt={title}
                      referrerPolicy="no-referrer"
                      className="max-h-[75vh] max-w-full w-auto object-contain rounded-2xl shadow-2xl"
                    />
                  )}
                </div>

                {/* Next Slide Arrow */}
                {images.length > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      soundManager.playSlide?.();
                      setCinemaIndex((curr) => (curr !== null ? (curr + 1) % images.length : 0));
                    }}
                    className="absolute right-2 sm:right-4 z-20 w-12 h-12 rounded-full bg-black/70 hover:bg-black text-white border border-white/20 flex items-center justify-center backdrop-blur-md transition-all hover:scale-110 cursor-pointer"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                )}
              </div>

              {/* Bottom Footer Caption */}
              <div className="text-center font-mono text-xs text-neutral-400">
                Press <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white">Esc</kbd> to return to Pinterest gallery • Use arrow keys to navigate
              </div>
            </div>
          );
        })()}

        {/* ================= MODAL: ADD VIDEO WITH URL ================= */}
        <AnimatePresence>
          {isVideoModalOpen && (
            <div
              onClick={() => setIsVideoModalOpen(false)}
              className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onClick={(e) => e.stopPropagation()}
                className="max-w-lg w-full bg-[#111116] border border-white/15 rounded-2xl p-6 sm:p-7 shadow-2xl text-white"
              >
                <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#e62b1e]/20 border border-[#e62b1e]/30 flex items-center justify-center text-[#e62b1e]">
                      <Video className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-unbounded font-black text-sm sm:text-base uppercase tracking-tight">
                        Add Video with URL
                      </h3>
                      <p className="font-mono text-[10px] text-neutral-400 mt-0.5">
                        Plays on hover with audio in the Pinterest gallery
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsVideoModalOpen(false)}
                    className="p-1 rounded-full text-neutral-400 hover:text-white transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Video URL Input */}
                  <div>
                    <label className="block font-mono text-[11px] font-bold uppercase tracking-wider text-neutral-300 mb-1.5">
                      Paste Video URL (.mp4, .webm, stream, or direct link)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        value={videoUrlInput}
                        onChange={(e) => setVideoUrlInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleAddVideoUrl();
                        }}
                        placeholder="https://commondatastorage.googleapis.com/.../video.mp4"
                        className="flex-1 px-3 py-2.5 rounded-lg bg-black/60 border border-white/20 text-white text-xs font-mono outline-none focus:border-[#e62b1e] placeholder:text-neutral-600"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => handleAddVideoUrl()}
                        disabled={!videoUrlInput.trim()}
                        className="px-4 py-2.5 bg-[#e62b1e] hover:bg-[#d02418] disabled:opacity-40 text-white font-mono text-xs font-bold uppercase tracking-wider rounded-lg cursor-pointer transition-colors shadow-md shrink-0"
                      >
                        Add Pin
                      </button>
                    </div>
                  </div>

                  {/* Option: Set as Circle Video Thumbnail */}
                  <label className="flex items-center gap-2.5 p-3 rounded-xl bg-white/[0.03] border border-white/10 cursor-pointer hover:bg-white/[0.06] transition-colors">
                    <input
                      type="checkbox"
                      checked={setVideoAsCover}
                      onChange={(e) => setSetVideoAsCover(e.target.checked)}
                      className="w-4 h-4 accent-[#e62b1e] rounded cursor-pointer"
                    />
                    <div className="text-left">
                      <span className="block font-mono text-xs font-bold text-white">
                        Set as Circle Video Cover
                      </span>
                      <span className="block font-mono text-[10px] text-neutral-400">
                        The circular bubble in Recent Work will play this video live with the VIDEO tag
                      </span>
                    </div>
                  </label>

                  {/* Curated Video Presets */}
                  <div className="pt-3 border-t border-white/10">
                    <span className="block font-mono text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-2">
                      Or Pick from Curated Motion Presets:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {CURATED_VIDEO_PRESETS.map((preset, pIdx) => (
                        <button
                          key={pIdx}
                          type="button"
                          onClick={() => handleAddVideoUrl(preset.url)}
                          className="p-2.5 rounded-lg border border-white/10 hover:border-[#e62b1e] bg-white/[0.03] hover:bg-[#e62b1e]/10 text-left transition-all cursor-pointer group"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-[11px] font-bold text-white group-hover:text-[#e62b1e] truncate">
                              {preset.title}
                            </span>
                            <Play className="w-3 h-3 text-neutral-400 group-hover:text-[#e62b1e] shrink-0 ml-1" />
                          </div>
                          <span className="font-mono text-[9px] uppercase text-neutral-500">
                            {preset.category} • MP4
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ================= MODAL: ADD IMAGE URL ================= */}
        <AnimatePresence>
          {isImageUrlModalOpen && (
            <div
              onClick={() => setIsImageUrlModalOpen(false)}
              className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onClick={(e) => e.stopPropagation()}
                className="max-w-md w-full bg-[#121217] border border-white/15 rounded-2xl p-6 shadow-2xl text-white"
              >
                <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-[#e62b1e]" />
                    <h3 className="font-unbounded font-black text-sm uppercase tracking-tight">
                      Add Image URL
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsImageUrlModalOpen(false)}
                    className="p-1 rounded-full text-neutral-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Paste Image URL */}
                  <div>
                    <label className="block font-mono text-[11px] font-bold uppercase tracking-wider text-neutral-300 mb-1.5">
                      Paste Image URL (PNG, JPG, WebP, SVG, Google Drive link)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        value={imageUrlInput}
                        onChange={(e) => setImageUrlInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleAddImageUrl();
                        }}
                        placeholder="https://... or Google Drive sharing link"
                        className="flex-1 px-3 py-2.5 rounded-lg bg-black/60 border border-white/20 text-white text-xs font-mono outline-none focus:border-[#e62b1e] placeholder:text-neutral-600"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={handleAddImageUrl}
                        disabled={!imageUrlInput.trim()}
                        className="px-4 py-2.5 bg-[#e62b1e] hover:bg-[#d02418] disabled:opacity-40 text-white font-mono text-xs font-bold uppercase tracking-wider rounded-lg cursor-pointer transition-colors shadow-md shrink-0"
                      >
                        Add Pin
                      </button>
                    </div>
                  </div>

                  {/* Option: Set as Circle Cover Image */}
                  <label className="flex items-center gap-2.5 p-3 rounded-xl bg-white/[0.03] border border-white/10 cursor-pointer hover:bg-white/[0.06] transition-colors">
                    <input
                      type="checkbox"
                      checked={setImageAsCover}
                      onChange={(e) => setSetImageAsCover(e.target.checked)}
                      className="w-4 h-4 accent-[#e62b1e] rounded cursor-pointer"
                    />
                    <div className="text-left">
                      <span className="block font-mono text-xs font-bold text-white">
                        Set as Circle Cover Image
                      </span>
                      <span className="block font-mono text-[10px] text-neutral-400">
                        Use this image as the main cover thumbnail for this circle
                      </span>
                    </div>
                  </label>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ================= MODAL: CLOUDFLARE R2 STORAGE DETAILS ================= */}
        <AnimatePresence>
          {isR2InfoModalOpen && (
            <div
              onClick={() => setIsR2InfoModalOpen(false)}
              className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onClick={(e) => e.stopPropagation()}
                className="max-w-xl w-full bg-[#111116] border border-white/15 rounded-2xl p-6 sm:p-7 shadow-2xl text-white"
              >
                <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-orange-400">
                      <Cloud className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-unbounded font-black text-sm sm:text-base uppercase tracking-tight">
                        Cloudflare R2 Media Storage
                      </h3>
                      <p className="font-mono text-[10px] text-neutral-400 mt-0.5">
                        Permanent object storage with S3-compatible API & CDN distribution
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsR2InfoModalOpen(false)}
                    className="p-1 rounded-full text-neutral-400 hover:text-white transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-4 font-mono text-xs">
                  {/* Status Card */}
                  <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-between">
                    <div>
                      <span className="text-neutral-400 text-[10px] uppercase block mb-1">Status</span>
                      <div className="flex items-center gap-2">
                        {r2Status?.configured ? (
                          <>
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                            <span className="text-emerald-300 font-bold">Cloudflare R2 Active</span>
                          </>
                        ) : (
                          <>
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                            <span className="text-amber-300 font-bold">Local Storage Fallback Mode</span>
                          </>
                        )}
                      </div>
                    </div>

                    <span className="text-[11px] px-2.5 py-1 rounded-md bg-white/10 text-neutral-300">
                      {r2Status?.mode || 'local-storage'}
                    </span>
                  </div>

                  {r2Status?.configured ? (
                    <div className="space-y-2 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-200">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-emerald-400">Target Bucket:</span>
                        <span className="font-bold text-white">{r2Status.bucketName}</span>
                      </div>
                      <div className="flex justify-between text-[11px]">
                        <span className="text-emerald-400">Public CDN Domain:</span>
                        <span className="font-bold text-white break-all">{r2Status.publicDomain}</span>
                      </div>
                      <p className="text-[10px] text-emerald-300/80 pt-2 border-t border-emerald-500/20">
                        Uploaded videos and images are permanently preserved in your Cloudflare R2 bucket and delivered via high-speed global CDN.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200">
                      <div className="flex items-center gap-2 text-amber-300 font-bold">
                        <Info className="w-4 h-4 shrink-0" />
                        <span>Ready to connect your Cloudflare R2 bucket</span>
                      </div>
                      <p className="text-[11px] text-amber-200/90 leading-relaxed">
                        To enable direct cloud storage, add the following variables into your project's <code className="px-1.5 py-0.5 rounded bg-black/40 text-amber-100 font-bold">.env</code> file:
                      </p>
                      <div className="p-3 rounded-lg bg-black/60 border border-white/10 space-y-1 text-[11px] text-neutral-300 select-all font-mono">
                        <div>R2_ACCOUNT_ID=&lt;your-account-id&gt;</div>
                        <div>R2_ACCESS_KEY_ID=&lt;your-access-key-id&gt;</div>
                        <div>R2_SECRET_ACCESS_KEY=&lt;your-secret-access-key&gt;</div>
                        <div>R2_BUCKET_NAME=&lt;your-bucket-name&gt;</div>
                        <div>R2_PUBLIC_DOMAIN=&lt;https://media.yourdomain.com&gt;</div>
                      </div>
                      <p className="text-[10px] text-neutral-400">
                        Until configured, uploads safely save to persistent local backend storage with identical functionality.
                      </p>
                    </div>
                  )}

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => setIsR2InfoModalOpen(false)}
                      className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white font-mono text-xs font-bold transition-colors cursor-pointer"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Cloudflare R2 Media Library & Bulk Importer Modal */}
        <MediaLibraryModal
          isOpen={isMediaLibraryModalOpen}
          onClose={() => setIsMediaLibraryModalOpen(false)}
          initialTab={mediaLibraryModalTab}
          targetCircleId={circleId}
          onMediaChanged={async () => {
            try {
              const res = await fetch(`/api/circle-customizations`);
              const data = await res.json();
              if (data.success && data.customizations) {
                const plainId = circleId.replace(/^pg-/, '');
                const prefixedId = circleId.startsWith('pg-') ? circleId : `pg-${circleId}`;
                const curr = data.customizations[circleId] || data.customizations[plainId] || data.customizations[prefixedId];
                if (curr?.gallery && Array.isArray(curr.gallery)) {
                  setImages(curr.gallery);
                  onUpdateGallery(curr.gallery);
                  if (curr.imageUrl) {
                    setActiveCoverUrl(curr.imageUrl);
                    onSetThumbnail(curr.imageUrl);
                  }
                }
              }
            } catch (_) {}
          }}
        />
      </motion.div>
    </AnimatePresence>
  );
};
