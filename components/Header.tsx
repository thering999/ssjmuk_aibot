import React, { memo } from 'react';
import type { ModelType } from '../types';
import type { AppMode } from '../App';
import ModelSelector from './ModelSelector';
import { useTranslation } from '../hooks/useTranslation';

// Base64 encoded logo for Mukdahan Provincial Public Health Office
const logoSrc = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAPAAAADwCAMAAAAJixw1AAABAlBMVEX////9/f38/Pz+/v75+fnx8fHy8vL09PT39/f6+vrz8/P19fX4+Pj7+/v////u7u7q6urm5ubk5OTe3t7Z2dnT09PPz8+7u7vDw8O/v7+pqamfn5+BgYF6enp0dHRsbGxlZWVdXV1SUlJOTk5GRkZCQkI+Pj45OTkxMTElJSV/f395eXlxcXFmZmZVVVVLSkpFRUVDQ0M/Pz83Nzc0NDQsLCwmJiYfHx8aGhoXFxcSEhIMDAwICAgGBgYFBQUCAgIAAADy8vLw8PDm5ubg4ODX19fS0tLLy8vJycnExMS3t7eurq6jo6N+fn5tbW1dXV1SUlJLS0tEREQ8PDwyMjIhISEWFhYODg4KCgoGBgYBAQHuKwVSAAASYklEQVR4nO2d6XuyOhfG5ZqGmoZC9y7t7u7u7u7u7u7u7u7ubr/3S7e7u/v/P3zJgCRtQpI0QZL8fr53IMmQfD5583NeFEVRFCVfQ5p/bfr56dOnS5eS7u5fL7w6uX2+dLl293fL9/f7+/v7e/v7+1p/b//Lq6tXr16+vPr2+eLly6tXr169evXq1atXr169evXq1atXr169evXq1atXr169evXq1atXr169evXq1atXr169evXq1atXr169evXq1atXr169evXq1atXr169evXq1atXr169evXq1atXr169evXq1avvL1/+8+v/8v+7//L/8s9/8Pvv+fL/y1evXr169erVq1evXr169erVq1evXr169erVq1evXr169erVq1evXr169erVq1evXr169erVq1evXr169erVq1evXr169erVq1evXr169erVq1evXr169erVq1f/2vW3z342D0+fPp3+m9OfP39+/vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz-c-o8K1C9L/9k8fP306/WfS8+dPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz-h5z4D8n74t8///8F0aT8KxXjV7cAAAAAElFTSuQmCC";

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
  locationError: string | null;
  setMode: (mode: AppMode) => void;
  currentMode: AppMode;
  isVoiceCommandListening: boolean;
  onToggleVoiceCommand: () => void;
  isVoiceCommandSupported: boolean;
  currentLanguage: 'en' | 'th';
  setLanguage: (lang: 'en' | 'th') => void;
  onExportConversation: () => void;
  isExportDisabled: boolean;
  onShareConversation: () => void;
  isShareDisabled: boolean;
  onSosClick: () => void;
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
}) => {
  const { t } = useTranslation();

  const toggleLanguage = () => {
    setLanguage(currentLanguage === 'en' ? 'th' : 'en');
  };

  return (
    <header className="flex items-center justify-between p-2 md:p-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex-shrink-0 z-10">
      <div className="flex items-center">
        <button
          onClick={() => setSidebarIsOpen(!sidebarIsOpen)}
          className="p-2 rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 lg:hidden"
          aria-label="Toggle sidebar"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <img src={logoSrc} alt="Logo" className="h-8 w-8 ml-2 rounded-full" />
        <h2 className="text-lg font-semibold ml-2 text-gray-800 dark:text-gray-100">{t('appTitle')}</h2>
      </div>

      <div className="flex items-center space-x-2">
        <button
          onClick={onSosClick}
          title={t('tooltipSos')}
          aria-label={t('tooltipSos')}
          className="px-4 py-2 rounded-full bg-red-600 text-white font-bold text-sm hover:bg-red-700 transition-colors shadow-md flex items-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          SOS
        </button>

        <div className="flex items-center rounded-full bg-gray-200 dark:bg-gray-700 p-1">
            <button
              onClick={() => setMode('chat')}
              className={`px-3 py-1 text-sm font-semibold rounded-full transition-colors ${currentMode === 'chat' ? 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 shadow' : 'text-gray-600 dark:text-gray-300'}`}
            >
              {t('chat')}
            </button>
            <button
              onClick={() => setMode('map')}
              className={`px-3 py-1 text-sm font-semibold rounded-full transition-colors ${currentMode === 'map' ? 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 shadow' : 'text-gray-600 dark:text-gray-300'}`}
            >
              {t('map')}
            </button>
            <button
              onClick={() => setMode('hub')}
              className={`px-3 py-1 text-sm font-semibold rounded-full transition-colors ${currentMode === 'hub' ? 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 shadow' : 'text-gray-600 dark:text-gray-300'}`}
            >
              {t('hub')}
            </button>
            <button
              onClick={() => setMode('profile')}
              className={`px-3 py-1 text-sm font-semibold rounded-full transition-colors ${currentMode === 'profile' ? 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 shadow' : 'text-gray-600 dark:text-gray-300'}`}
            >
              {t('profile')}
            </button>
             <button
              onClick={() => setMode('dashboard')}
              className={`px-3 py-1 text-sm font-semibold rounded-full transition-colors ${currentMode === 'dashboard' ? 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 shadow' : 'text-gray-600 dark:text-gray-300'}`}
            >
              {t('dashboard')}
            </button>
            <button
              onClick={() => setMode('live')}
              className={`px-3 py-1 text-sm font-semibold rounded-full transition-colors ${currentMode === 'live' ? 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 shadow' : 'text-gray-600 dark:text-gray-300'}`}
            >
              {t('live')}
            </button>
             <button
              onClick={() => setMode('analyzer')}
              className={`px-3 py-1 text-sm font-semibold rounded-full transition-colors ${currentMode === 'analyzer' ? 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 shadow' : 'text-gray-600 dark:text-gray-300'}`}
            >
              {t('analyzer')}
            </button>
        </div>
      
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
          locationError={locationError}
        />
        
        <button
          onClick={onPersonaClick}
          title={t('tooltipPersona')}
          aria-label={t('tooltipPersona')}
          className="p-2 rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </button>

        <button
          onClick={onShareConversation}
          title="Share Conversation"
          aria-label="Share Conversation"
          disabled={isShareDisabled}
          className="p-2 rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12s-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6.002l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.367a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
          </svg>
        </button>

        <button
          onClick={onExportConversation}
          title={t('tooltipExport')}
          aria-label={t('tooltipExport')}
          disabled={isExportDisabled}
          className="p-2 rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
        </button>
        
        {isTtsSupported && (
          <button
            onClick={() => setIsTtsEnabled(!isTtsEnabled)}
            title={isTtsEnabled ? t('tooltipTtsOn') : t('tooltipTtsOff')}
            aria-label={isTtsEnabled ? t('tooltipTtsOn') : t('tooltipTtsOff')}
            className={`p-2 rounded-full transition-colors ${isTtsEnabled ? 'bg-teal-100 dark:bg-teal-900/40 text-teal-600 dark:text-teal-300' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
          >
            {isTtsEnabled ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
            ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /><path strokeLinecap="round" strokeLinejoin="round" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" /></svg>
            )}
          </button>
        )}
        
        {isVoiceCommandSupported && (
            <button
              onClick={onToggleVoiceCommand}
              title={isVoiceCommandListening ? t('tooltipVoiceOn') : t('tooltipVoiceOff')}
              aria-label={isVoiceCommandListening ? t('tooltipVoiceOn') : t('tooltipVoiceOff')}
              className={`p-2 rounded-full transition-colors ${isVoiceCommandListening ? 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-300 animate-pulse' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
            </button>
        )}

        <button
          onClick={toggleLanguage}
          title={t('tooltipLanguage')}
          aria-label={t('tooltipLanguage')}
          className="p-2 rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2h10a2 2 0 002-2v-1a2 2 0 012-2h1.945M7.707 4.5l.286-.42a.5.5 0 01.854 0l.286.42a.5.5 0 00.387.218l.447.039a.5.5 0 01.47.69l-.16.425a.5.5 0 00.16.533l.362.302a.5.5 0 010 .854l-.362.302a.5.5 0 00-.16.533l.16.425a.5.5 0 01-.47.69l-.447.039a.5.5 0 00-.387.218l-.286.42a.5.5 0 01-.854 0l-.286-.42a.5.5 0 00-.387-.218l-.447-.039a.5.5 0 01-.47-.69l.16-.425a.5.5 0 00-.16-.533L5.43 12.5a.5.5 0 010-.854l.362-.302a.5.5 0 00.16-.533l-.16-.425a.5.5 0 01.47-.69l.447.039a.5.5 0 00.387-.218zM12 21a9 9 0 100-18 9 9 0 000 18z" />
            </svg>
        </button>

        <button
          onClick={toggleTheme}
          title={t('tooltipTheme')}
          aria-label={t('tooltipTheme')}
          className="p-2 rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
        </button>
      </div>
    </header>
  );
};

export default memo(Header);
