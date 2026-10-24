import React from 'react';
import { ViewMode, ThemeMode } from '../types/portfolio';
import { soundManager } from '../utils/audio';

export interface NavigationMenuProps {
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  onOpenContact: () => void;
  theme: ThemeMode;
  className?: string;
}

export const NavigationMenu: React.FC<NavigationMenuProps> = ({
  currentView,
  onViewChange,
  onOpenContact,
  theme,
  className = '',
}) => {
  return (
    <div className={`w-56 sm:w-64 lg:w-72 2xl:w-80 shrink-0 pointer-events-auto select-none ${className}`}>
      {/* Menu Header Label */}
      <div className="font-gotham font-semibold text-[10px] md:text-xs text-neutral-600 dark:text-neutral-400 mb-2 md:mb-2.5 tracking-wider select-none">
        Menu
      </div>

      {/* Menu Navigation Stack with Signature Unbounded Font */}
      <nav className="flex flex-col font-unbounded text-base md:text-lg lg:text-xl xl:text-2xl font-black tracking-tight uppercase leading-[0.95] space-y-1">
        {/* WORK */}
        <button
          onClick={() => {
            soundManager.playClick();
            onViewChange('work');
          }}
          className={`text-left flex items-center transition-colors cursor-pointer whitespace-nowrap ${
            currentView === 'work'
              ? 'text-[#e62b1e]'
              : theme === 'light'
              ? 'text-[#0c0c0e] hover:text-[#e62b1e]'
              : 'text-white hover:text-[#e62b1e]'
          }`}
        >
          {currentView === 'work' ? (
            <span className="w-4 md:w-5 inline-flex items-center shrink-0 font-black text-sm md:text-base sm:text-lg">
              →
            </span>
          ) : (
            <span className="w-4 md:w-5 inline-flex items-center shrink-0 font-black text-sm md:text-base sm:text-lg" />
          )}
          <span className={currentView === 'work' ? '' : 'group-hover:opacity-80 transition-opacity'}>
            WORK
          </span>
        </button>

        {/* ABOUT */}
        <button
          onClick={() => {
            soundManager.playClick();
            onViewChange('about');
          }}
          className={`text-left flex items-center transition-colors cursor-pointer whitespace-nowrap ${
            currentView === 'about'
              ? 'text-[#e62b1e]'
              : theme === 'light'
              ? 'text-[#0c0c0e] hover:text-[#e62b1e]'
              : 'text-white hover:text-[#e62b1e]'
          }`}
        >
          {currentView === 'about' ? (
            <span className="w-4 md:w-5 inline-flex items-center shrink-0 font-black text-sm md:text-base sm:text-lg">
              →
            </span>
          ) : (
            <span className="w-4 md:w-5 inline-flex items-center shrink-0 font-black text-sm md:text-base sm:text-lg" />
          )}
          <span className={currentView === 'about' ? '' : 'group-hover:opacity-80 transition-opacity'}>
            ABOUT
          </span>
        </button>

        {/* RECENT WORK */}
        <button
          onClick={() => {
            soundManager.playClick();
            onViewChange('playground');
          }}
          className={`text-left flex items-center transition-colors cursor-pointer whitespace-nowrap ${
            currentView === 'playground'
              ? 'text-[#e62b1e]'
              : theme === 'light'
              ? 'text-[#0c0c0e] hover:text-[#e62b1e]'
              : 'text-white hover:text-[#e62b1e]'
          }`}
        >
          {currentView === 'playground' ? (
            <span className="w-4 md:w-5 inline-flex items-center shrink-0 font-black text-sm md:text-base sm:text-lg">
              →
            </span>
          ) : (
            <span className="w-4 md:w-5 inline-flex items-center shrink-0 font-black text-sm md:text-base sm:text-lg" />
          )}
          <span className={currentView === 'playground' ? '' : 'group-hover:opacity-80 transition-opacity'}>
            RECENT WORK
          </span>
        </button>

        {/* CONTACT */}
        <button
          onClick={() => {
            soundManager.playClick();
            onOpenContact();
          }}
          className={`text-left flex items-center transition-colors cursor-pointer whitespace-nowrap ${
            theme === 'light'
              ? 'text-[#0c0c0e] hover:text-[#e62b1e]'
              : 'text-white hover:text-[#e62b1e]'
          }`}
        >
          <span className="w-4 md:w-5 inline-flex items-center shrink-0 font-black text-sm md:text-base sm:text-lg" />
          <span className="group-hover:opacity-80 transition-opacity">
            CONTACT
          </span>
        </button>
      </nav>
    </div>
  );
};
