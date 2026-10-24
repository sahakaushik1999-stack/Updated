import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, ShieldAlert, ShieldCheck, Lock, Unlock, X, KeyRound, Eye, EyeOff, CloudUpload } from 'lucide-react';
import { useMasterEdit } from '../context/MasterEditContext';
import { soundManager } from '../utils/audio';

export const MasterAuthModal: React.FC = () => {
  const { isAuthModalOpen, closeAuthModal, unlockWithPassword, isEditMode, lockEditMode } = useMasterEdit();
  const [passcode, setPasscode] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isShaking, setIsShaking] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isAuthModalOpen) {
      setPasscode('');
      setErrorMsg(null);
      setIsShaking(false);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isAuthModalOpen]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!passcode) {
      setErrorMsg('Please enter the 6-digit master passcode.');
      return;
    }

    const success = unlockWithPassword(passcode);
    if (!success) {
      soundManager.playClick?.();
      setErrorMsg('Incorrect passcode. Access denied.');
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
      setPasscode('');
      inputRef.current?.focus();
    }
  };

  if (!isAuthModalOpen) return null;

  return (
    <AnimatePresence>
      <div
        onClick={closeAuthModal}
        className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 select-none"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          onClick={(e) => e.stopPropagation()}
          className={`relative max-w-md w-full rounded-2xl border shadow-2xl p-6 sm:p-7 overflow-hidden ${
            isShaking ? 'animate-[shake_0.4s_ease-in-out]' : ''
          } bg-[#111116] border-white/15 text-white`}
        >
          {/* Subtle Ambient Glow */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#e62b1e]/15 rounded-full blur-3xl pointer-events-none" />

          {/* Close button */}
          <button
            onClick={() => {
              soundManager.playClick();
              closeAuthModal();
            }}
            className="absolute top-4 right-4 p-1.5 rounded-full text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-11 h-11 rounded-xl bg-[#e62b1e]/15 border border-[#e62b1e]/30 flex items-center justify-center text-[#e62b1e] shrink-0">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#e62b1e]">
                  SECURITY GATE
                </span>
                <span className="px-1.5 py-0.5 rounded bg-white/10 text-[9px] font-mono text-neutral-300">
                  MASTER PASSCODE
                </span>
              </div>
              <h3 className="font-unbounded font-black text-base sm:text-lg uppercase tracking-tight text-white leading-tight">
                Unlock Edit Access
              </h3>
            </div>
          </div>

          <p className="text-xs text-neutral-400 font-sans mb-5 leading-relaxed">
            Enter the 6-digit master passcode to enable editing, uploading videos, changing artwork, and managing project cards across the website.
          </p>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-neutral-400 mb-2">
                Master Passcode:
              </label>
              <div className="relative">
                <input
                  ref={inputRef}
                  type={showPassword ? 'text' : 'password'}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={12}
                  value={passcode}
                  onChange={(e) => {
                    setPasscode(e.target.value);
                    if (errorMsg) setErrorMsg(null);
                  }}
                  placeholder="Enter passcode"
                  className="w-full px-4 py-3 rounded-xl bg-black/60 border border-white/20 focus:border-[#e62b1e] text-white text-base font-mono tracking-widest text-center outline-none transition-all placeholder:text-neutral-600 placeholder:tracking-normal placeholder:font-sans placeholder:text-xs"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-neutral-400 hover:text-white cursor-pointer"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {errorMsg && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/25 text-red-400 text-xs font-mono flex items-center gap-2"
              >
                <ShieldAlert className="w-4 h-4 shrink-0 text-red-500" />
                <span>{errorMsg}</span>
              </motion.div>
            )}

            <div className="flex items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={closeAuthModal}
                className="flex-1 py-2.5 px-4 rounded-xl border border-white/15 text-xs font-mono font-bold uppercase tracking-wider hover:bg-white/5 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 px-4 rounded-xl bg-[#e62b1e] hover:bg-[#d02418] text-white text-xs font-mono font-bold uppercase tracking-wider shadow-lg shadow-[#e62b1e]/25 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
              >
                <Unlock className="w-3.5 h-3.5" />
                <span>Unlock Now</span>
              </button>
            </div>
          </form>

          {/* Quick status if already unlocked */}
          {isEditMode && (
            <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between">
              <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" />
                <span>Currently Unlocked</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  lockEditMode();
                  closeAuthModal();
                }}
                className="text-[11px] font-mono font-bold text-red-400 hover:text-red-300 underline uppercase cursor-pointer"
              >
                Lock Now
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

/**
 * Master Edit Button component placed in header navigation across all views
 */
export const MasterEditButton: React.FC<{
  theme: 'light' | 'dark';
  className?: string;
  variant?: 'compact' | 'full';
}> = ({ theme, className = '', variant = 'full' }) => {
  const { isEditMode, openAuthModal, lockEditMode, showToast } = useMasterEdit();
  const [isPublishing, setIsPublishing] = useState<boolean>(false);

  const handlePublishAll = async () => {
    try {
      setIsPublishing(true);
      soundManager.playClick?.();
      showToast('Publishing changes to cloud and all devices...');
      const res = await fetch('/api/publish-changes', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast('✓ All changes permanently published across all devices & PCs!');
      } else {
        showToast('Failed to publish changes.');
      }
    } catch (e) {
      showToast('Error syncing changes.');
    } finally {
      setIsPublishing(false);
    }
  };

  if (isEditMode) {
    return (
      <div className={`relative flex items-center gap-1.5 ${className}`}>
        <button
          onClick={handlePublishAll}
          disabled={isPublishing}
          className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full font-mono text-[11px] sm:text-xs font-bold transition-all cursor-pointer border shadow-sm ${
            theme === 'light'
              ? 'bg-blue-50 text-blue-800 border-blue-300 hover:bg-blue-100 hover:border-blue-400'
              : 'bg-blue-950/70 text-blue-300 border-blue-700 hover:bg-blue-900/80'
          }`}
          title="Publish all changes permanently to Cloudflare R2 and source code so all other PCs immediately see them."
        >
          <CloudUpload size={12} className={isPublishing ? 'animate-bounce text-blue-500 shrink-0' : 'text-blue-500 shrink-0'} />
          <span className="uppercase tracking-wider">
            {isPublishing ? 'Publishing...' : 'Sync All PCs'}
          </span>
        </button>

        <button
          onClick={lockEditMode}
          className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full font-mono text-[11px] sm:text-xs font-bold transition-all cursor-pointer border shadow-sm ${
            theme === 'light'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100 hover:border-emerald-400'
              : 'bg-emerald-950/70 text-emerald-300 border-emerald-700 hover:bg-emerald-900/80'
          }`}
          title="Master Edit Mode is Active. Click to Lock and disable edit options across the website."
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <Unlock size={12} className="text-emerald-500 shrink-0" />
          <span className="uppercase tracking-wider">
            {variant === 'compact' ? 'Edit On' : 'Edit Mode: Active'}
          </span>
          <span className="hidden sm:inline font-mono text-[10px] text-neutral-400 dark:text-neutral-500 ml-0.5">
            (Lock)
          </span>
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => openAuthModal()}
      className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full font-mono text-[11px] sm:text-xs font-bold transition-all cursor-pointer border shadow-sm group ${
        theme === 'light'
          ? 'bg-neutral-100 text-neutral-700 border-neutral-300 hover:border-[#e62b1e] hover:text-[#e62b1e]'
          : 'bg-neutral-900/80 text-neutral-300 border-neutral-800 hover:border-[#e62b1e] hover:text-white'
      } ${className}`}
      title="Master Edit Access: Enter passcode to enable editing options across the website"
    >
      <Lock size={12} className="text-neutral-400 group-hover:text-[#e62b1e] transition-colors shrink-0" />
      <span className="uppercase tracking-wider">
        {variant === 'compact' ? 'Edit' : 'Master Edit'}
      </span>
    </button>
  );
};
