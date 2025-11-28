
import React from 'react';
import { useTranslation } from '../hooks/useTranslation';

interface ElderlyModeViewProps {
  onExit: () => void;
  onSos: () => void;
  onFlashlight: () => void;
  onCallFamily: () => void;
  onTalkToDoctor: () => void;
}

const ElderlyModeView: React.FC<ElderlyModeViewProps> = ({ onExit, onSos, onFlashlight, onCallFamily, onTalkToDoctor }) => {
  const { t } = useTranslation();

  return (
    <div className="fixed inset-0 bg-gray-50 dark:bg-gray-900 z-50 flex flex-col">
      {/* Header */}
      <div className="bg-teal-700 p-6 flex justify-between items-center shadow-lg">
        <h1 className="text-3xl font-bold text-white">{t('elderlyModeTitle')}</h1>
        <button 
          onClick={onExit}
          className="bg-white text-teal-800 px-4 py-2 rounded-lg font-bold text-lg shadow-md"
        >
          {t('elderlyModeExit')}
        </button>
      </div>

      {/* Main Grid */}
      <div className="flex-1 p-6 grid grid-cols-2 gap-6 items-stretch">
        <button 
          onClick={onTalkToDoctor}
          className="bg-blue-100 dark:bg-blue-900 rounded-3xl flex flex-col items-center justify-center p-8 shadow-md active:scale-95 transition-transform"
        >
          <div className="bg-blue-500 text-white p-6 rounded-full mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-20 w-20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
          </div>
          <span className="text-3xl font-bold text-blue-900 dark:text-blue-100">{t('elderlyTalkToDoctor')}</span>
        </button>

        <button 
          onClick={onCallFamily}
          className="bg-green-100 dark:bg-green-900 rounded-3xl flex flex-col items-center justify-center p-8 shadow-md active:scale-95 transition-transform"
        >
          <div className="bg-green-500 text-white p-6 rounded-full mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-20 w-20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
          </div>
          <span className="text-3xl font-bold text-green-900 dark:text-green-100">{t('elderlyCallFamily')}</span>
        </button>

        <button 
          onClick={onFlashlight}
          className="bg-yellow-100 dark:bg-yellow-900 rounded-3xl flex flex-col items-center justify-center p-8 shadow-md active:scale-95 transition-transform"
        >
          <div className="bg-yellow-500 text-white p-6 rounded-full mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-20 w-20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
          </div>
          <span className="text-3xl font-bold text-yellow-900 dark:text-yellow-100">{t('elderlyFlashlight')}</span>
        </button>

        <button 
          onClick={onSos}
          className="bg-red-100 dark:bg-red-900 rounded-3xl flex flex-col items-center justify-center p-8 shadow-md active:scale-95 transition-transform"
        >
          <div className="bg-red-600 text-white p-6 rounded-full mb-4 animate-pulse">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-20 w-20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          </div>
          <span className="text-4xl font-bold text-red-900 dark:text-red-100">SOS</span>
        </button>
      </div>
    </div>
  );
};

export default ElderlyModeView;
