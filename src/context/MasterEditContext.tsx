import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { soundManager } from '../utils/audio';

const MASTER_PASSWORD = '503649';
const STORAGE_KEY = 'kaushik_master_edit_unlocked';

interface MasterEditContextType {
  isEditMode: boolean;
  isAuthModalOpen: boolean;
  openAuthModal: (onSuccessAction?: () => void) => void;
  closeAuthModal: () => void;
  unlockWithPassword: (passcode: string) => boolean;
  lockEditMode: () => void;
  requireEditAccess: (action: () => void) => void;
  toastNotice: string | null;
  showToast: (msg: string) => void;
}

const MasterEditContext = createContext<MasterEditContextType | undefined>(undefined);

export const MasterEditProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isEditMode, setIsEditMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      try {
        return localStorage.getItem(STORAGE_KEY) === 'true';
      } catch {
        return false;
      }
    }
    return false;
  });

  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [toastNotice, setToastNotice] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastNotice(msg);
    setTimeout(() => {
      setToastNotice((curr) => (curr === msg ? null : curr));
    }, 3200);
  }, []);

  // Sync state across browser tabs/windows
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        setIsEditMode(e.newValue === 'true');
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const openAuthModal = useCallback((onSuccessAction?: () => void) => {
    soundManager.playClick();
    if (onSuccessAction) {
      setPendingAction(() => onSuccessAction);
    } else {
      setPendingAction(null);
    }
    setIsAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setIsAuthModalOpen(false);
    setPendingAction(null);
  }, []);

  const unlockWithPassword = useCallback(
    (passcode: string): boolean => {
      const cleanInput = passcode.trim();
      if (cleanInput === MASTER_PASSWORD) {
        soundManager.playClick();
        setIsEditMode(true);
        try {
          localStorage.setItem(STORAGE_KEY, 'true');
        } catch {}

        setIsAuthModalOpen(false);
        showToast('✓ Master Edit Access Enabled');

        if (pendingAction) {
          const act = pendingAction;
          setPendingAction(null);
          setTimeout(() => act(), 150);
        }
        return true;
      }
      return false;
    },
    [pendingAction, showToast]
  );

  const lockEditMode = useCallback(() => {
    soundManager.playClick();
    setIsEditMode(false);
    try {
      localStorage.setItem(STORAGE_KEY, 'false');
    } catch {}
    showToast('🔒 Edit Options Locked (View-Only Mode)');
  }, [showToast]);

  const requireEditAccess = useCallback(
    (action: () => void) => {
      if (isEditMode) {
        action();
      } else {
        openAuthModal(action);
      }
    },
    [isEditMode, openAuthModal]
  );

  return (
    <MasterEditContext.Provider
      value={{
        isEditMode,
        isAuthModalOpen,
        openAuthModal,
        closeAuthModal,
        unlockWithPassword,
        lockEditMode,
        requireEditAccess,
        toastNotice,
        showToast,
      }}
    >
      {children}
    </MasterEditContext.Provider>
  );
};

export const useMasterEdit = (): MasterEditContextType => {
  const context = useContext(MasterEditContext);
  if (!context) {
    throw new Error('useMasterEdit must be used within a MasterEditProvider');
  }
  return context;
};
