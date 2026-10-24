import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Pause, Volume2, VolumeX, Maximize2, X, RotateCcw } from 'lucide-react';
import { soundManager } from '../utils/audio';

interface ShowreelModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShowreelModal: React.FC<ShowreelModalProps> = ({ isOpen, onClose }) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [progress, setProgress] = useState<number>(18); // percentage 0 to 100
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [currentScene, setCurrentScene] = useState<number>(0);
  const progressTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Scenes to cycle through simulating high-energy video showreel
  const scenes = [
    {
      title: 'SOLEDITION 2024 // FESTIVAL CAMPAIGN & AFTERMOVIE',
      category: 'Festival Key Visuals & Motion Editing',
      visual: 'bg-[#e62b1e]',
      text: 'SOLEDITION',
      subtitle: 'NEW DELHI // DHYAN CHAND STADIUM',
      accent: '#ffffff',
    },
    {
      title: 'SUPERDRY // STREETWEAR REELS & CAMPAIGN',
      category: 'Streetwear Video & Motion Cuts',
      visual: 'bg-[#121214]',
      text: 'SUPERDRY',
      subtitle: 'ADOBE PREMIERE PRO & AFTER EFFECTS',
      accent: '#00ff66',
    },
    {
      title: 'ALL ABOUT HOROLOGY // LUXURY BRAND IDENTITY',
      category: 'Logofolio & Chronometer Insignia',
      visual: 'bg-[#0a0a0f]',
      text: 'HOROLOGY',
      subtitle: 'SWISS PRECISION VECTOR SYSTEMS',
      accent: '#38bdf8',
    },
    {
      title: 'KAUSHIK SAHA // GRAPHIC DESIGN & VIDEO EDITING',
      category: '6+ Years Experience // New Delhi, India',
      visual: 'bg-[#18181b]',
      text: 'K. SAHA',
      subtitle: 'BEHANCE.NET/GALLERY/207168461/PORTFOLIO',
      accent: '#e62b1e',
    },
  ];

  useEffect(() => {
    if (!isOpen) return;

    if (isPlaying) {
      progressTimerRef.current = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            return 0;
          }
          const next = prev + 0.5;
          const sceneIndex = Math.floor((next / 100) * scenes.length);
          setCurrentScene(sceneIndex % scenes.length);
          return next;
        });
      }, 50);
    } else if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
    }

    return () => {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    };
  }, [isOpen, isPlaying, scenes.length]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === ' ') {
        e.preventDefault();
        setIsPlaying((p) => !p);
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKey);
    }
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const activeScene = scenes[currentScene] || scenes[0];
  const totalSeconds = 88; // 1m 28s
  const currentSeconds = Math.floor((progress / 100) * totalSeconds);
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `0${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8 bg-black/90 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-5xl bg-neutral-950 border border-neutral-800 shadow-2xl overflow-hidden flex flex-col"
        >
          {/* Top Bar */}
          <div className="flex items-center justify-between px-6 py-3.5 border-b border-neutral-800 text-neutral-300">
            <div className="flex items-center gap-3">
              <span className="font-syne text-sm font-bold tracking-tight text-white">
                KAUSHIK SAHA // 2026 SHOWREEL
              </span>
              <span className="text-neutral-500">/</span>
              <span className="font-mono-tabular text-xs text-[#e62b1e]">
                {activeScene.category}
              </span>
            </div>

            <button
              onClick={() => {
                soundManager.playClick();
                onClose();
              }}
              className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
              title="Close (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Video Simulation Canvas (Matching 00:39 - 00:47 in video) */}
          <div className="relative aspect-video w-full overflow-hidden flex items-center justify-center bg-black">
            {/* Dynamic Animated Scene */}
            <div
              className={`absolute inset-0 transition-colors duration-500 flex flex-col items-center justify-center p-8 ${activeScene.visual}`}
            >
              <motion.div
                key={currentScene}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="text-center"
              >
                <div
                  className="font-syne text-5xl sm:text-7xl lg:text-8xl font-black tracking-tight"
                  style={{ color: activeScene.accent }}
                >
                  {activeScene.text}
                </div>
                <div className="font-mono-tabular text-sm sm:text-lg tracking-widest text-white mt-4 font-bold uppercase">
                  {activeScene.subtitle}
                </div>
              </motion.div>

              {/* Broadcast timecode watermark */}
              <div className="absolute top-4 left-6 font-mono-tabular text-xs text-white/60 tracking-wider">
                REC ● 4K UHD 60FPS
              </div>
              <div className="absolute bottom-4 left-6 font-mono-tabular text-xs text-white/60">
                SCENE {currentScene + 1} OF {scenes.length}
              </div>
            </div>

            {/* Play/Pause Large Center Overlay if Paused */}
            {!isPlaying && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <button
                  onClick={() => setIsPlaying(true)}
                  className="w-16 h-16 rounded-full bg-white/90 text-black flex items-center justify-center shadow-xl hover:scale-105 transition-transform"
                >
                  <Play className="w-8 h-8 fill-current ml-1" />
                </button>
              </div>
            )}
          </div>

          {/* Video Player Scrubber & Controls */}
          <div className="px-6 py-4 bg-neutral-900 border-t border-neutral-800 flex flex-col gap-3">
            {/* Timeline Bar */}
            <div
              className="relative w-full h-2 bg-neutral-800 hover:h-3 transition-all cursor-pointer rounded-none overflow-hidden"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const clickX = e.clientX - rect.left;
                const newProgress = Math.max(0, Math.min(100, (clickX / rect.width) * 100));
                setProgress(newProgress);
              }}
            >
              <div
                className="h-full bg-[#e62b1e] transition-all duration-75"
                style={{ width: `${progress}%` }}
              />
            </div>

            {/* Controls Bar */}
            <div className="flex items-center justify-between text-xs font-mono-tabular text-neutral-300">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="p-1 hover:text-white transition-colors"
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
                </button>

                <button
                  onClick={() => setProgress(0)}
                  className="p-1 hover:text-white transition-colors"
                  title="Replay from start"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>

                <span>
                  {formatTime(currentSeconds)} / {formatTime(totalSeconds)}
                </span>
              </div>

              <div className="flex items-center gap-4">
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className="p-1 hover:text-white transition-colors"
                >
                  {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>

                <span className="px-1.5 py-0.5 bg-neutral-800 text-[10px] text-neutral-300 font-semibold">
                  1080p HD
                </span>

                <button className="p-1 hover:text-white transition-colors">
                  <Maximize2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
