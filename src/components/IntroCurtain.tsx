import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { soundManager } from '../utils/audio';

interface IntroCurtainProps {
  onComplete: () => void;
}

export const IntroCurtain: React.FC<IntroCurtainProps> = ({ onComplete }) => {
  const [splitPos, setSplitPos] = useState<number>(0); // 0 to 100%
  const [isRevealed, setIsRevealed] = useState(false);

  useEffect(() => {
    // Play intro animation sequence: character pushes from 0% to 100%
    const startTime = Date.now();
    const duration = 2600; // 2.6 seconds

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Easing: cubic-bezier-like acceleration
      const eased = progress < 0.5 ? 2 * progress * progress : -1 + (4 - 2 * progress) * progress;
      setSplitPos(eased * 100);

      if (progress >= 1) {
        clearInterval(interval);
        setIsRevealed(true);
        soundManager.playSlide();
        setTimeout(() => {
          onComplete();
        }, 800);
      }
    }, 20);

    return () => clearInterval(interval);
  }, [onComplete]);

  const handleManualEnter = () => {
    soundManager.playClick();
    setIsRevealed(true);
    setTimeout(onComplete, 300);
  };

  return (
    <AnimatePresence>
      {!isRevealed && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } }}
          className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-black select-none"
        >
          {/* Left White Curtain expanding */}
          <div
            className="absolute top-0 bottom-0 left-0 bg-[#f7f7f5] overflow-hidden transition-all duration-75 ease-out"
            style={{ width: `${splitPos}%` }}
          >
            {/* Left side text snippet revealed */}
            <div className="absolute inset-0 flex items-center justify-center w-screen">
              <span className="font-serif-display text-[10vw] font-black text-[#e62b1e] tracking-tight leading-none text-center select-none">
                KAUSHIK<br />SAHA
              </span>
            </div>
          </div>

          {/* Right Black Half */}
          <div
            className="absolute top-0 bottom-0 right-0 bg-[#09090b] overflow-hidden transition-all duration-75 ease-out"
            style={{ width: `${100 - splitPos}%` }}
          >
            {/* Right side background */}
          </div>

          {/* The pushing character on the split line */}
          <motion.div
            className="absolute top-1/2 -translate-y-1/2 z-20 pointer-events-none flex flex-col items-center"
            style={{ left: `${splitPos}%`, transform: 'translate(-50%, -50%)' }}
          >
            {/* Illustrated Character Pushing */}
            <svg
              width="150"
              height="200"
              viewBox="0 0 150 200"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="drop-shadow-lg"
            >
              {/* Head & Cap */}
              <ellipse cx="78" cy="42" rx="18" ry="17" fill="#ffffff" stroke="#111111" strokeWidth="2.5" />
              {/* Cap visor pointing right */}
              <path d="M60 36 C65 24 92 24 96 36 L108 38 C108 38 102 44 95 43 Z" fill="#111111" />
              {/* Eyeglasses & Face profile */}
              <circle cx="86" cy="42" r="5" stroke="#111111" strokeWidth="2" fill="none" />
              <path d="M84 48 C87 50 90 49 92 48" stroke="#111111" strokeWidth="2" strokeLinecap="round" />
              {/* Straining mouth / effort expression */}
              <ellipse cx="89" cy="53" rx="2.5" ry="3" fill="#111111" />
              {/* Torso / patterned shirt */}
              <path
                d="M66 59 C60 70 56 100 55 125 L98 122 C96 100 94 70 88 59 Z"
                fill="#ffffff"
                stroke="#111111"
                strokeWidth="2.5"
              />
              {/* Shirt star patterns */}
              <circle cx="68" cy="80" r="2.5" fill="#111111" />
              <circle cx="80" cy="74" r="2.5" fill="#111111" />
              <circle cx="75" cy="98" r="2.5" fill="#111111" />
              <circle cx="86" cy="94" r="2.5" fill="#111111" />
              {/* Pushing arms leaning forward */}
              <path
                d="M74 65 L96 68 L114 62"
                stroke="#111111"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M76 72 L98 76 L116 70"
                stroke="#111111"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Hands pressed against curtain boundary */}
              <ellipse cx="116" cy="62" rx="4" ry="5" fill="#ffffff" stroke="#111111" strokeWidth="2" />
              <ellipse cx="118" cy="70" rx="4" ry="5" fill="#ffffff" stroke="#111111" strokeWidth="2" />
              {/* Shorts */}
              <path
                d="M55 125 L50 148 L73 148 L76 130 L79 148 L101 148 L98 122 Z"
                fill="#ffffff"
                stroke="#111111"
                strokeWidth="2.5"
              />
              {/* Legs strained backward in pushing stance */}
              <path d="M58 148 L46 178 L38 182" stroke="#111111" strokeWidth="4" strokeLinecap="round" />
              <path d="M90 148 L86 178 L78 182" stroke="#111111" strokeWidth="4" strokeLinecap="round" />
              {/* Sneakers */}
              <path
                d="M34 182 C34 182 46 179 50 186 L32 186 Z"
                fill="#ffffff"
                stroke="#111111"
                strokeWidth="2"
              />
              <path
                d="M74 182 C74 182 86 179 90 186 L72 186 Z"
                fill="#ffffff"
                stroke="#111111"
                strokeWidth="2"
              />
            </svg>
          </motion.div>

          {/* Quick Skip Button */}
          <div className="absolute bottom-8 right-8 z-30">
            <button
              onClick={handleManualEnter}
              className="px-4 py-2 text-xs font-mono-tabular tracking-wider uppercase text-zinc-400 hover:text-white bg-zinc-900/80 border border-zinc-800 rounded-none transition-colors"
            >
              Enter [Space]
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
