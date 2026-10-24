import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { soundManager } from '../utils/audio';
import { Copy, Check, ArrowUpRight, X } from 'lucide-react';
import { ABOUT_DATA } from '../data/portfolioData';

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ContactModal: React.FC<ContactModalProps> = ({ isOpen, onClose }) => {
  const [copiedEmail, setCopiedEmail] = useState<boolean>(false);
  const [copiedPhone, setCopiedPhone] = useState<boolean>(false);

  const phone = '+91 9870581517';
  const email = 'sahakaushik1999@gmail.com';
  const cleanPhone = phone.replace(/\s+/g, '');

  const handleCopyEmail = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    soundManager.playClick();
    navigator.clipboard.writeText(email);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2200);
  };

  const handleCopyPhone = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    soundManager.playClick();
    navigator.clipboard.writeText(phone);
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), 2200);
  };

  // Close on Escape key
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

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        onClick={onClose}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-8 bg-black/75 backdrop-blur-md overflow-y-auto"
      >
        {/* Container for the Two Overlapping Cards */}
        <div
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-4xl flex flex-col lg:flex-row items-center justify-center gap-6 lg:gap-0 my-auto py-6"
        >
          {/* ================= CARD 1: CREDITS (Light Warm Grey Card) ================= */}
          <motion.div
            initial={{ opacity: 0, x: -30, y: 15, rotate: -6 }}
            animate={{ opacity: 1, x: 0, y: 0, rotate: -4 }}
            exit={{ opacity: 0, x: -30, y: 15, rotate: -6 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-[390px] sm:w-[400px] lg:w-[410px] bg-[#dcdcd9] text-[#111111] p-7 sm:p-8 rounded-2xl shadow-[0_20px_45px_-10px_rgba(0,0,0,0.45)] border border-[#c6c6c3] relative z-10 lg:-mr-10 flex flex-col justify-between select-none"
            style={{ transformOrigin: 'bottom right' }}
          >
            <div>
              {/* Card Title */}
              <h2 className="font-unbounded text-2xl sm:text-3xl font-extrabold tracking-tight text-[#111111] mb-6">
                CREDITS
              </h2>

              {/* 2-Column Info Grid */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-6 text-left">
                {/* Column 1 - Top: Design & Direction */}
                <div>
                  <div className="font-sans text-xs text-[#666666] font-medium mb-1">
                    Design &amp; Direction
                  </div>
                  <div className="font-sans text-sm sm:text-base font-bold text-[#111111]">
                    Kaushik Saha
                  </div>
                  <a
                    href="https://huyml.co"
                    target="_blank"
                    rel="noreferrer"
                    className="font-sans text-xs sm:text-[13px] text-[#444444] hover:text-black transition-colors inline-flex items-center gap-0.5 mt-0.5"
                  >
                    <span>huyml.co</span>
                    <ArrowUpRight className="w-3.5 h-3.5 inline-block text-[#555555]" />
                  </a>
                </div>

                {/* Column 2 - Top: Behance Portfolio */}
                <div>
                  <div className="font-sans text-xs text-[#666666] font-medium mb-1">
                    Behance Portfolio
                  </div>
                  <a
                    href="https://www.behance.net/kaushiksaha1"
                    target="_blank"
                    rel="noreferrer"
                    className="font-sans text-sm sm:text-base font-bold text-[#111111] hover:text-[#e62b1e] transition-colors inline-flex items-center gap-0.5"
                  >
                    <span>@kaushiksaha1</span>
                    <ArrowUpRight className="w-4 h-4 inline-block text-[#444444]" />
                  </a>
                </div>

                {/* Column 1 - Bottom: Typography */}
                <div>
                  <div className="font-sans text-xs text-[#666666] font-medium mb-1">
                    Typography
                  </div>
                  <div className="font-unbounded text-sm sm:text-base font-bold text-[#111111] leading-tight">
                    Unbounded
                  </div>
                  <div className="font-sans text-sm sm:text-base font-bold text-[#111111] leading-tight mt-0.5">
                    Gotham
                  </div>
                </div>

                {/* Column 2 - Bottom: Core Tools */}
                <div>
                  <div className="font-sans text-xs text-[#666666] font-medium mb-1">
                    Core Tools
                  </div>
                  <div className="font-sans text-sm sm:text-base font-bold text-[#111111] leading-snug">
                    Adobe CC Suite
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Character Illustration (Peace Sign Boy in Bucket Hat & Glasses) */}
            <div className="flex justify-end pt-5 pr-4 -mb-2">
              <svg
                width="130"
                height="110"
                viewBox="0 0 140 120"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="select-none pointer-events-none"
              >
                {/* Torso with rounded shoulders */}
                <path
                  d="M36 120 L36 94 C36 82 50 76 74 76 C98 76 112 82 112 94 L112 120 Z"
                  fill="#6c6d72"
                  stroke="#111111"
                  strokeWidth="2.8"
                  strokeLinejoin="round"
                />
                {/* Two white buttons on shirt */}
                <circle cx="74" cy="91" r="3.2" fill="#ffffff" stroke="#111111" strokeWidth="0.8" />
                <circle cx="74" cy="107" r="3.2" fill="#ffffff" stroke="#111111" strokeWidth="0.8" />

                {/* Peace Sign Hand on left */}
                <g stroke="#111111" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" fill="#ffffff">
                  {/* Wrist / hand base */}
                  <path d="M28 88 C24 82 27 72 35 77 C40 80 41 87 36 92 Z" />
                  {/* Two fingers forming V peace sign */}
                  <path d="M33 77 L30 54 C29 50 34 49 36 52 L39 74" />
                  <path d="M39 71 L45 57 C47 53 52 55 51 59 L44 79" />
                  <path d="M30 76 C32 75 37 77 37 81" />
                </g>

                {/* Head */}
                <ellipse cx="74" cy="62" rx="25" ry="24" fill="#ffffff" stroke="#111111" strokeWidth="2.8" />

                {/* Bucket Hat */}
                {/* Hat Dome */}
                <path
                  d="M51 51 C51 32 60 25 74 25 C88 25 97 32 97 51 Z"
                  fill="#ffffff"
                  stroke="#111111"
                  strokeWidth="2.8"
                  strokeLinejoin="round"
                />
                {/* Hat stitch lines */}
                <path d="M55 42 C62 36 86 36 93 42" stroke="#111111" strokeWidth="2.2" strokeLinecap="round" />
                <path d="M53 48 C62 42 86 42 95 48" stroke="#111111" strokeWidth="2.2" strokeLinecap="round" />

                {/* Hat Brim */}
                <path
                  d="M42 56 C42 56 57 48 106 56 L104 59 C104 59 58 52 40 59 Z"
                  fill="#ffffff"
                  stroke="#111111"
                  strokeWidth="2.8"
                  strokeLinejoin="round"
                />

                {/* Round Glasses */}
                <circle cx="65" cy="63" r="7.2" stroke="#111111" strokeWidth="2.5" fill="#ffffff" />
                <circle cx="83" cy="63" r="7.2" stroke="#111111" strokeWidth="2.5" fill="#ffffff" />
                {/* Glasses Bridge */}
                <line x1="72.2" y1="63" x2="75.8" y2="63" stroke="#111111" strokeWidth="2.5" strokeLinecap="round" />
                {/* Pupil Dots */}
                <circle cx="65" cy="63" r="2.2" fill="#111111" />
                <circle cx="83" cy="63" r="2.2" fill="#111111" />

                {/* Smile */}
                <path d="M70 74 C72 77 76 77 78 74" stroke="#111111" strokeWidth="2.4" strokeLinecap="round" />
              </svg>
            </div>
          </motion.div>

          {/* ================= CARD 2: COME SAY HI (Obsidian Dark Card) ================= */}
          <motion.div
            initial={{ opacity: 0, x: 30, y: 15, rotate: 2 }}
            animate={{ opacity: 1, x: 0, y: 0, rotate: 0 }}
            exit={{ opacity: 0, x: 30, y: 15, rotate: 2 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1], delay: 0.05 }}
            className="w-full max-w-[430px] sm:w-[450px] lg:w-[470px] bg-[#161617] text-white p-7 sm:p-9 rounded-2xl shadow-[0_30px_70px_-15px_rgba(0,0,0,0.9)] border border-[#262629] relative z-20 flex flex-col justify-between select-none"
            style={{ transformOrigin: 'top left' }}
          >
            {/* Title */}
            <div className="mb-6">
              <h2 className="font-unbounded text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
                COME SAY HI
              </h2>
            </div>

            {/* Inquiries & Channels */}
            <div className="space-y-4 text-left">
              {/* Section 1: Email */}
              <div className="pb-3 border-b border-white/10">
                <div className="font-sans text-xs text-neutral-400 font-medium mb-1.5">
                  Drop me a line
                </div>
                <div className="flex items-center justify-between gap-3">
                  <a
                    href={`mailto:${email}`}
                    className="font-sans text-base sm:text-lg font-bold text-white hover:text-neutral-300 transition-colors truncate"
                  >
                    {email}
                  </a>
                  <button
                    onClick={handleCopyEmail}
                    className="px-2.5 py-1 rounded border border-white/20 bg-white/[0.04] hover:bg-white/15 text-neutral-300 hover:text-white text-[11px] font-mono tracking-wider transition-colors cursor-pointer flex items-center gap-1.5 shrink-0"
                    title="Copy Email"
                  >
                    {copiedEmail ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>COPIED</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>COPY</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Section 2: Direct Phone / WhatsApp */}
              <div className="pb-4 border-b border-white/10">
                <div className="font-sans text-xs text-neutral-400 font-medium mb-1.5">
                  Direct Phone / WhatsApp
                </div>
                <div className="flex items-center justify-between gap-3">
                  <a
                    href={`tel:${cleanPhone}`}
                    className="font-sans text-base sm:text-lg font-bold text-white hover:text-neutral-300 transition-colors"
                  >
                    {phone}
                  </a>
                  <button
                    onClick={handleCopyPhone}
                    className="px-2.5 py-1 rounded border border-white/20 bg-white/[0.04] hover:bg-white/15 text-neutral-300 hover:text-white text-[11px] font-mono tracking-wider transition-colors cursor-pointer flex items-center gap-1.5 shrink-0"
                    title="Copy Phone"
                  >
                    {copiedPhone ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>COPIED</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>COPY</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Section 3: LinkedIn & Behance 2-Box Grid */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                {/* LinkedIn Card */}
                <a
                  href="https://www.linkedin.com/in/kaushik-s-4403a4135"
                  target="_blank"
                  rel="noreferrer"
                  className="p-3.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/10 hover:border-white/25 transition-all group block text-left"
                >
                  <div className="font-sans text-xs text-neutral-400 font-medium mb-1">
                    LinkedIn
                  </div>
                  <div className="font-sans text-base sm:text-lg font-bold text-white group-hover:text-neutral-200 flex items-center gap-1">
                    <span>Connect</span>
                    <ArrowUpRight className="w-4 h-4 text-[#e62b1e]" />
                  </div>
                  <div className="font-sans text-[11px] text-neutral-500 font-normal mt-0.5 truncate">
                    kaushik-s-4403a4135
                  </div>
                </a>

                {/* Behance Card */}
                <a
                  href="https://www.behance.net/kaushiksaha1"
                  target="_blank"
                  rel="noreferrer"
                  className="p-3.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/10 hover:border-white/25 transition-all group block text-left"
                >
                  <div className="font-sans text-xs text-neutral-400 font-medium mb-1">
                    Behance
                  </div>
                  <div className="font-sans text-base sm:text-lg font-bold text-white group-hover:text-neutral-200 flex items-center gap-1">
                    <span>Portfolio</span>
                    <ArrowUpRight className="w-4 h-4 text-[#e62b1e]" />
                  </div>
                  <div className="font-sans text-[11px] text-neutral-500 font-normal mt-0.5 truncate">
                    @kaushiksaha1
                  </div>
                </a>
              </div>

              {/* Section 4: Close Button on Bottom Right */}
              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => {
                    soundManager.playClick();
                    onClose();
                  }}
                  className="font-sans text-xs sm:text-sm font-bold text-white hover:text-neutral-200 transition-all flex items-center gap-1.5 cursor-pointer py-1.5 px-4 rounded-md border border-white/25 hover:border-white/40 bg-white/[0.04] hover:bg-white/15"
                >
                  <span>Close</span>
                  <X className="w-3.5 h-3.5 stroke-[2.5]" />
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
};
