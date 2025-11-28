
import React, { memo, useRef, useState, useEffect } from 'react';
import type { ModelType } from '../types';
import type { AppMode } from '../App';
import ModelSelector from './ModelSelector';
import { useTranslation } from '../hooks/useTranslation';

// Custom SVG Logo Component
const AppLogo = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" className="h-10 w-10 rounded-full shadow-sm bg-white p-1">
    <circle cx="50" cy="50" r="48" fill="#0D9488" />
    <path d="M50 20 V80 M20 50 H80" stroke="white" strokeWidth="12" strokeLinecap="round" />
    <path d="M50 35 L50 65 M35 50 L65 50" stroke="#0D9488" strokeWidth="4" strokeLinecap="round" />
    <circle cx="50" cy="50" r="8" fill="white" />
  </svg>
);

interface HeaderProps {
  sidebarIsOpen: boolean;
  setSidebarIsOpen: (isOpen: boolean) => void;
  toggleTheme: () => void;
  isTtsEnabled: boolean;
  setIsTtsEnabled: (enabled: boolean) => void;
  isTtsSupported: boolean;
  onPersonaClick: () => void;
  model: ModelType;
  setModel: (model: ModelType) => void;
  useSearch: boolean;
  setUseSearch: (enabled: boolean) => void;
  useMaps: boolean;
  setUseMaps: (enabled: boolean) => void;
  useClinicFinder: boolean;
  setUseClinicFinder: (enabled: boolean) => void;
  useKnowledgeBase: boolean;
  setUseKnowledgeBase: (enabled: boolean) => void;
  useSymptomChecker: boolean;
  setUseSymptomChecker: (enabled: boolean) => void;
  useMedicationReminder: boolean;
  setUseMedicationReminder: (enabled: boolean) => void;
  useMedicationScheduler: boolean;
  setUseMedicationScheduler: (enabled: boolean) => void;
  useUserProfile: boolean;
  setUseUserProfile: (enabled: boolean) => void;
  useAppointmentBooking: boolean;
  setUseAppointmentBooking: (enabled: boolean) => void;
  useIsanDialect: boolean;
  setUseIsanDialect: (enabled: boolean) => void;
  locationError: string | null;
  setMode: (mode: AppMode) => void;
  currentMode: AppMode;
  isVoiceCommandListening: boolean;
  onToggleVoiceCommand: () => void;
  isVoiceCommandSupported: boolean;
  currentLanguage: 'en' | 'th' | 'lo';
  setLanguage: (lang: 'en' | 'th' | 'lo') => void;
  onExportConversation: () => void;
  isExportDisabled: boolean;
  onShareConversation: () => void;
  isShareDisabled: boolean;
  onSosClick: () => void;
  toggleFlashlight: () => void;
  toggleElderlyMode: () => void;
}

const Header: React.FC<HeaderProps> = ({
  sidebarIsOpen,
  setSidebarIsOpen,
  toggleTheme,
  isTtsEnabled,
  setIsTtsEnabled,
  isTtsSupported,
  onPersonaClick,
  model, setModel,
  useSearch, setUseSearch,
  useMaps, setUseMaps,
  useClinicFinder, setUseClinicFinder,
  useKnowledgeBase, setUseKnowledgeBase,
  useSymptomChecker, setUseSymptomChecker,
  useMedicationReminder, setUseMedicationReminder,
  useMedicationScheduler, setUseMedicationScheduler,
  useUserProfile, setUseUserProfile,
  useAppointmentBooking, setUseAppointmentBooking,
  useIsanDialect, setUseIsanDialect,
  locationError,
  setMode,
  currentMode,
  isVoiceCommandListening,
  onToggleVoiceCommand,
  isVoiceCommandSupported,
  currentLanguage,
  setLanguage,
  onExportConversation,
  isExportDisabled,
  onShareConversation,
  isShareDisabled,
  onSosClick,
  toggleFlashlight,
  toggleElderlyMode,
}) => {
  const { t } = useTranslation();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Reordered according to user request, added 'planner'
  const allModes: AppMode[] = [
    'chat',
    'live',
    'analyzer',
    'planner',
    'pharmacy',
    'nutrition',
    'wellness',
    'map',
    'dashboard',
    'skin',
    'family',
    'profile',
    'hub'
  ];

  return (
    <header className="flex flex-col bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex-shrink-0 z-10 shadow-sm">
      {/* Top Level Header */}
      <div className="flex items-center justify-between p-2 md:p-3">
        <div className="flex items-center">
          <button
            onClick={() => setSidebarIsOpen(!sidebarIsOpen)}
            className="p-2 rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 mr-1"
            aria-label="Toggle sidebar"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex items-center space-x-2">
             <AppLogo />
             <h2 className="text-lg font-bold text-teal-700 dark:text-teal-400 tracking-tight hidden sm:block leading-tight">
               {t('appTitle')}
             </h2>
          </div>
        </div>

        <div className="flex items-center space-x-1 md:space-x-2">
          <button
            onClick={onSosClick}
            title={t('tooltipSos')}
            aria-label={t('tooltipSos')}
            className="mr-1 md:mr-2 p-2 md:px-4 md:py-1.5 rounded-full bg-red-600 hover:bg-red-700 text-white font-bold text-sm transition-all shadow-md flex items-center justify-center animate-pulse ring-2 ring-red-400 ring-opacity-50"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 md:mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            <span className="hidden md:inline">SOS</span>
          </button>

          <button
            onClick={toggleFlashlight}
            title={t('tooltipFlashlight')}
            className="p-2 rounded-full text-gray-600 dark:text-gray-300 hover:bg-yellow-100 hover:text-yellow-600 dark:hover:bg-gray-700 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </button>

          <button
            onClick={toggleElderlyMode}
            title={t('tooltipElderlyMode')}
            className="p-2 rounded-full text-gray-600 dark:text-gray-300 hover:bg-teal-100 hover:text-teal-600 dark:hover:bg-gray-700 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </button>

          <ModelSelector
            model={model} setModel={setModel}
            useSearch={useSearch} setUseSearch={setUseSearch}
            useMaps={useMaps} setUseMaps={setUseMaps}
            useClinicFinder={useClinicFinder} setUseClinicFinder={setUseClinicFinder}
            useKnowledgeBase={useKnowledgeBase} setUseKnowledgeBase={setUseKnowledgeBase}
            useSymptomChecker={useSymptomChecker} setUseSymptomChecker={setUseSymptomChecker}
            useMedicationReminder={useMedicationReminder} setUseMedicationReminder={setUseMedicationReminder}
            useMedicationScheduler={useMedicationScheduler} setUseMedicationScheduler={setUseMedicationScheduler}
            useUserProfile={useUserProfile} setUseUserProfile={setUseUserProfile}
            useAppointmentBooking={useAppointmentBooking} setUseAppointmentBooking={setUseAppointmentBooking}
            useIsanDialect={useIsanDialect} setUseIsanDialect={setUseIsanDialect}
            locationError={locationError}
          />
          
          {/* Language Toggle */}
          <button
            onClick={() => {
                const langs: ('en' | 'th' | 'lo')[] = ['th', 'en', 'lo'];
                const nextIndex = (langs.indexOf(currentLanguage) + 1) % langs.length;
                setLanguage(langs[nextIndex]);
            }}
            className="p-2 rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 font-bold text-sm w-10 h-10 flex items-center justify-center border border-gray-200 dark:border-gray-600"
            title={t('tooltipLanguage')}
          >
            {currentLanguage.toUpperCase()}
          </button>

          <button
            onClick={toggleTheme}
            title={t('tooltipTheme')}
            className="p-2 rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors hidden sm:block"
          >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
          </button>
        </div>
      </div>

      {/* Navigation Bar - Scrollable with all options */}
      <div className="bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 shadow-inner">
         <div 
            ref={scrollContainerRef}
            className="flex items-center space-x-1 px-2 py-2 overflow-x-auto no-scrollbar scroll-smooth"
         >
            {allModes.map(mode => (
               <button
                  key={mode}
                  onClick={() => setMode(mode)}
                  className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap border ${
                     currentMode === mode
                     ? 'bg-teal-600 text-white border-teal-600 shadow-md ring-1 ring-teal-400 ring-opacity-50'
                     : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 hover:border-gray-300'
                  }`}
               >
                  {t(mode)}
               </button>
            ))}
         </div>
      </div>
    </header>
  );
};

export default memo(Header);
