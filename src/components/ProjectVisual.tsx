import React, { useState } from 'react';
import { Project } from '../types/portfolio';
import { resolveImageUrl } from '../utils/mediaUpload';

interface ProjectVisualProps {
  project: Project;
  isActive?: boolean;
  fitMode?: 'cover' | 'contain';
}

const LOCAL_PROJECT_FALLBACKS: Record<string, string> = {
  'better-candle': '/projects/holiday-sale.png',
  'harmony-brand-design': '/projects/harmony-brand-design.png',
  'rebranding-for-biocule': '/projects/rebranding-for-biocule.png',
  'cha-tea-drops': '/projects/cha-tea-drops.webp',
  'the-trost': '/projects/the-trost.webp',
  'all-about-horology': '/projects/all-about-horology.webp',
  'superdry-campaign': '/projects/superdry-campaign.webp',
  'combine-sports': '/projects/combine-sports.webp',
  'video-projects': '/projects/video-projects.webp',
  'cha-tea-apothecary': '/projects/cha-tea-drops.png',
  'lookbook-themonk': '/projects/lookbook-themonk.webp',
  'masala-synergy': '/projects/masala-synergy.webp',
  'shuchi-beltings': '/projects/shuchi-beltings.webp',
  'cha-brochure': '/projects/cha-brochure.webp',
  'the-world-collection-tokyo': '/projects/the-world-collection-tokyo.webp',
};

export const ProjectVisual: React.FC<ProjectVisualProps> = ({
  project,
  isActive = false,
  fitMode = 'cover',
}) => {
  const { visualType, title, index, imageUrl, category, agency, themeColor } = project;
  const [imgError, setImgError] = useState(false);
  const [triedProxy, setTriedProxy] = useState(false);
  const [triedLocalFallback, setTriedLocalFallback] = useState(false);
  const primarySrc = React.useMemo(() => resolveImageUrl(imageUrl), [imageUrl]);
  const [currentSrc, setCurrentSrc] = useState(primarySrc);

  React.useEffect(() => {
    setCurrentSrc(resolveImageUrl(imageUrl));
    setImgError(false);
    setTriedProxy(false);
    setTriedLocalFallback(false);
  }, [imageUrl]);

  const handleImageError = () => {
    // 1. Try backend proxy if direct CDN failed
    if (!triedProxy && imageUrl && (imageUrl.startsWith('http://') || imageUrl.startsWith('https://'))) {
      setTriedProxy(true);
      setCurrentSrc(`/api/proxy-image?url=${encodeURIComponent(imageUrl)}`);
      return;
    }

    // 2. Try local asset fallback
    if (!triedLocalFallback) {
      setTriedLocalFallback(true);
      const fallback = LOCAL_PROJECT_FALLBACKS[project.id];
      if (fallback && currentSrc !== fallback) {
        setCurrentSrc(fallback);
        return;
      }
    }

    // 3. Fall back to styled dynamic artwork
    setImgError(true);
  };

  if (currentSrc && !imgError) {
    return (
      <div className={`relative w-full h-full rounded-none overflow-hidden select-none flex items-center justify-center border-0 outline-none shadow-none bg-transparent`}>
        <img
          src={currentSrc}
          alt={title}
          referrerPolicy="no-referrer"
          decoding="async"
          loading="eager"
          onError={handleImageError}
          className={`transition-all duration-500 border-0 rounded-none ${
            fitMode === 'contain'
              ? 'w-auto h-auto max-h-[88vh] max-w-full object-contain drop-shadow-[0_30px_70px_rgba(0,0,0,0.85)] rounded-none'
              : 'w-full h-full object-cover object-center rounded-none scale-100'
          }`}
          style={{
            imageRendering: 'auto',
            WebkitBackfaceVisibility: 'visible',
            backfaceVisibility: 'visible',
          }}
          draggable={false}
        />
      </div>
    );
  }

  const renderVisualContent = () => {
    switch (visualType) {
      case 'cyber':
        return (
          <div className="relative w-full h-full bg-[#03060c] overflow-hidden flex flex-col items-center justify-center aspect-[4/5]">
            {/* Horizontal Blue Light Streaks (Cinematic 16:9) */}
            <div className="absolute inset-0 bg-gradient-to-b from-[#030712] via-[#051124] to-[#02050a]" />

            {/* Glowing horizontal laser streak bands across eyes and background */}
            <div className="absolute top-[26%] left-0 right-0 h-14 bg-gradient-to-r from-transparent via-[#0077ff]/30 to-transparent blur-md transform -rotate-1" />
            <div className="absolute top-[30%] left-0 right-0 h-3.5 bg-gradient-to-r from-transparent via-[#0099ff] to-transparent shadow-[0_0_24px_#0099ff] transform -rotate-1" />
            <div className="absolute top-[31.5%] left-0 right-0 h-1 bg-gradient-to-r from-transparent via-white to-transparent shadow-[0_0_15px_#ffffff] transform -rotate-1" />

            <div className="absolute top-[48%] left-0 right-0 h-10 bg-gradient-to-r from-transparent via-[#0044aa]/25 to-transparent blur-sm" />
            <div className="absolute top-[52%] left-0 right-0 h-1.5 bg-gradient-to-r from-transparent via-[#0066ee]/60 to-transparent" />

            {/* Textured Silhouette Bust with Glowing Red Neckband Wearable - 16:9 ViewBox */}
            <svg
              viewBox="0 0 640 360"
              preserveAspectRatio="xMidYMid meet"
              className={`w-full h-full z-10 transition-transform duration-700 ${isActive ? 'scale-105' : 'scale-95'}`}
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <radialGradient id="redGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#ff1133" stopOpacity="1" />
                  <stop offset="60%" stopColor="#cc0022" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#ff0022" stopOpacity="0" />
                </radialGradient>
                <filter id="neonRed" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="5" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Textured torso extending to bottom */}
              <path
                d="M170 360 L170 290 C210 220 260 190 320 190 C380 190 430 220 470 290 L470 360 Z"
                fill="#07090e"
                stroke="#1e293b"
                strokeWidth="1.5"
              />

              {/* Fine spiked/textured fibers on shoulders */}
              <g stroke="#38bdf8" strokeWidth="1" strokeOpacity="0.4">
                {Array.from({ length: 44 }).map((_, i) => {
                  const x = 185 + i * 6.2;
                  const y = 250 - Math.sin((i / 44) * Math.PI) * 45;
                  return (
                    <line
                      key={i}
                      x1={x}
                      y1={y}
                      x2={x + (i < 22 ? -3 : 3)}
                      y2={y - 7}
                      strokeLinecap="round"
                    />
                  );
                })}
              </g>

              {/* Neck */}
              <rect x="303" y="145" width="34" height="60" rx="8" fill="#06080d" />

              {/* Head Silhouette */}
              <ellipse cx="320" cy="115" rx="46" ry="60" fill="#04060a" stroke="#0e1726" strokeWidth="1" />

              {/* Ambient rim light on head edges */}
              <path
                d="M276 115 C276 75 295 56 320 56 C345 56 364 75 364 115"
                stroke="#0088ff"
                strokeWidth="1.5"
                strokeOpacity="0.5"
                fill="none"
              />

              {/* Glowing Red Neckband Wearable Headphones */}
              <path
                d="M305 120 C297 120 292 148 296 172 C300 194 308 206 316 208"
                stroke="#ff2244"
                strokeWidth="3.5"
                strokeLinecap="round"
                filter="url(#neonRed)"
              />
              <path
                d="M335 120 C343 120 348 148 344 172 C340 194 332 206 324 208"
                stroke="#ff2244"
                strokeWidth="3.5"
                strokeLinecap="round"
                filter="url(#neonRed)"
              />

              {/* Earbuds glowing red in ears */}
              <circle cx="302" cy="118" r="5" fill="#ff1133" filter="url(#neonRed)" />
              <circle cx="302" cy="118" r="2.5" fill="#ffffff" />
              <circle cx="338" cy="118" r="5" fill="#ff1133" filter="url(#neonRed)" />
              <circle cx="338" cy="118" r="2.5" fill="#ffffff" />

              {/* Collar module resting around neck */}
              <path
                d="M298 188 C306 210 334 210 342 188"
                stroke="#ff2244"
                strokeWidth="5"
                strokeLinecap="round"
                filter="url(#neonRed)"
              />
              <circle cx="300" cy="192" r="4" fill="#ffffff" />
              <circle cx="340" cy="192" r="4" fill="#ffffff" />
            </svg>
          </div>
        );

      case 'silhouette':
        return (
          <div className="relative w-full h-full bg-[#0a0a0c] overflow-hidden flex flex-col items-center justify-center aspect-[4/5]">
            {/* Vietnamese Conical Hat with D1_2 Stencil Mask - 16:9 ViewBox */}
            <div className="absolute inset-0 bg-radial from-neutral-800/40 via-transparent to-black" />

            <svg
              viewBox="0 0 640 360"
              preserveAspectRatio="xMidYMid meet"
              className={`w-full h-full z-10 transition-transform duration-700 ${isActive ? 'scale-105' : 'scale-95'}`}
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Torso extending to bottom */}
              <path
                d="M180 360 L180 270 C220 220 270 200 320 200 C370 200 420 220 460 270 L460 360 Z"
                fill="#0d0d10"
              />

              {/* Broad Black Conical Hat (Nón Lá) */}
              <path
                d="M320 30 L490 150 C420 170 220 170 150 150 Z"
                fill="#161618"
                stroke="#2f2f35"
                strokeWidth="2"
              />
              {/* Hat rib bamboo rings */}
              <ellipse cx="320" cy="150" rx="160" ry="14" stroke="#2a2a30" strokeWidth="2" />
              <ellipse cx="320" cy="120" rx="115" ry="10" stroke="#222228" strokeWidth="1.5" />
              <ellipse cx="320" cy="90" rx="75" ry="7" stroke="#222228" strokeWidth="1.5" />
              {/* Radiating lines from apex */}
              <line x1="320" y1="30" x2="180" y2="152" stroke="#202025" strokeWidth="1.5" />
              <line x1="320" y1="30" x2="320" y2="164" stroke="#202025" strokeWidth="1.5" />
              <line x1="320" y1="30" x2="460" y2="152" stroke="#202025" strokeWidth="1.5" />

              {/* Face under shadow */}
              <ellipse cx="320" cy="180" rx="48" ry="60" fill="#09090b" />

              {/* Intense Eyes peering out */}
              <g fill="#ffffff">
                <ellipse cx="298" cy="165" rx="10" ry="4.5" fill="#18181b" stroke="#ffffff" strokeWidth="1.5" />
                <circle cx="298" cy="165" r="2.5" fill="#ffffff" />
                <ellipse cx="342" cy="165" rx="10" ry="4.5" fill="#18181b" stroke="#ffffff" strokeWidth="1.5" />
                <circle cx="342" cy="165" r="2.5" fill="#ffffff" />
              </g>

              {/* Black face mask with bold white stencil text "D1_2" */}
              <path
                d="M276 185 C295 175 345 175 364 185 L352 240 C320 255 320 255 288 240 Z"
                fill="#0d0d10"
                stroke="#26262a"
                strokeWidth="2"
              />

              {/* Stencil Lettering D1_2 */}
              <text
                x="294"
                y="222"
                fill="#ffffff"
                fontFamily="monospace"
                fontWeight="900"
                fontSize="24"
                letterSpacing="3"
              >
                D1_2
              </text>
            </svg>
          </div>
        );

      case 'architecture':
        return (
          <div className="relative w-full h-full bg-[#141517] overflow-hidden flex flex-col justify-between aspect-[4/5]">
            {/* Pure full-bleed architectural visual - ZERO white boxes, 16:9 cinematic framing */}
            <div className="relative z-10 w-full flex justify-between items-center text-[10px] font-mono-tabular text-stone-400 px-6 py-4 border-b border-stone-800/80 bg-gradient-to-b from-black/80 to-transparent">
              <span className="tracking-widest uppercase">DAFI TROPICDANE</span>
              <span className="tracking-widest uppercase text-stone-500">HEIRLOOM FURNITURE</span>
            </div>

            {/* High-contrast architectural photograph simulation */}
            <div className="relative flex-1 w-full overflow-hidden flex items-end">
              <div className="absolute inset-0 bg-gradient-to-t from-[#0d0e10] via-[#1a1c20] to-[#0f1012]" />
              <div className="absolute top-[10%] right-[10%] w-[280px] h-[280px] bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

              {/* Brutalist Teak & Cast-Iron Bench (Dark minimal design, zero white boxes) */}
              <div className="relative z-10 w-full px-12 pb-8 flex flex-col items-center">
                <div className="w-full max-w-md h-24 bg-[#1f2126] border border-[#2e323b] shadow-2xl relative flex flex-col justify-between p-2.5">
                  {/* Dark Teak Slats */}
                  <div className="w-full h-3 bg-[#2b241e] border-b border-[#3d332a]" />
                  <div className="w-full h-3 bg-[#322a23] border-b border-[#3d332a]" />
                  <div className="w-full h-3 bg-[#28211b] border-b border-[#3d332a]" />

                  {/* Dark Gunmetal Support Legs */}
                  <div className="absolute -bottom-5 left-8 w-3 h-6 bg-[#111215] border border-[#23262d]" />
                  <div className="absolute -bottom-5 right-8 w-3 h-6 bg-[#111215] border border-[#23262d]" />
                </div>
              </div>
            </div>

            <div className="relative z-10 w-full flex justify-between items-center text-[10px] font-mono-tabular text-stone-500 px-6 py-3 border-t border-stone-800/80 bg-gradient-to-t from-black/80 to-transparent">
              <span>DENMARK // NORDIC DESIGN</span>
              <span>2026 COLLECTION</span>
            </div>
          </div>
        );

      case 'abstract':
      case 'portrait':
      default:
        return (
          <div className="relative w-full h-full bg-[#0a0a0c] overflow-hidden flex flex-col justify-between aspect-[4/5]">
            <div className="relative z-10 w-full flex justify-between items-center text-[10px] font-mono-tabular text-neutral-500 px-6 py-4 border-b border-neutral-800/80 bg-gradient-to-b from-black/80 to-transparent">
              <span className="tracking-widest uppercase">ARCHIVE // {index}</span>
              <span className="tracking-widest uppercase text-neutral-600">DIRECTION</span>
            </div>

            <div className="relative flex-1 w-full flex items-center justify-center p-6">
              <div className="absolute inset-0 bg-radial from-neutral-800/20 via-transparent to-black" />
              <div className="relative z-10 text-center">
                <span className="font-mono-tabular text-xs text-[#e62b1e] tracking-widest uppercase block mb-2">
                  INDEX // {index}
                </span>
                <span className="font-syne text-2xl sm:text-3xl font-black text-white tracking-tight uppercase block leading-none">
                  {title}
                </span>
                <span className="font-mono-tabular text-[11px] text-neutral-400 mt-2.5 block tracking-wider">
                  CASE STUDY AVAILABLE
                </span>
              </div>
            </div>

            <div className="relative z-10 w-full flex justify-between items-center text-[10px] font-mono-tabular text-neutral-500 px-6 py-3 border-t border-neutral-800/80 bg-gradient-to-t from-black/80 to-transparent">
              <span>DIGITAL CRAFT</span>
              <span>CONFIDENTIAL</span>
            </div>
          </div>
        );
    }
  };

  return (
    <div className={`relative w-full h-full rounded-none overflow-hidden select-none bg-[#0a0a0c] border-0 outline-none ring-0 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] ${
      fitMode === 'contain' ? 'flex items-center justify-center' : 'aspect-[4/5]'
    }`}>
      {renderVisualContent()}
    </div>
  );
};
