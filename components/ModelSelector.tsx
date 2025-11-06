import React, { useState, useRef, useEffect, memo } from 'react';
import type { ModelType } from '../types';
import { useTranslation } from '../hooks/useTranslation';

interface ModelSelectorProps {
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
  locationError: string | null;
}

const ModelSelector: React.FC<ModelSelectorProps> = ({
  model, setModel, useSearch, setUseSearch, useMaps, setUseMaps, useClinicFinder, setUseClinicFinder, useKnowledgeBase, setUseKnowledgeBase, locationError
}) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const modelConfig = {
      'flash-lite': { label: t('modelFlashLiteLabel'), description: t('modelFlashLiteDesc') },
      'flash': { label: t('modelFlashLabel'), description: t('modelFlashDesc') },
      'pro': { label: t('modelProLabel'), description: t('modelProDesc') },
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);
  
  const handleMapsToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUseMaps(e.target.checked);
  };
  
  const selectedModelLabel = modelConfig[model].label;

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 p-2 rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        title={t('tooltipModel')}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <span className="text-sm font-semibold hidden md:inline">{selectedModelLabel}</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-gray-800 rounded-lg shadow-xl z-20 border border-gray-200 dark:border-gray-700">
          <div className="p-4">
            <h3 className="font-semibold text-gray-800 dark:text-gray-100 text-sm mb-2">{t('model')}</h3>
            <div className="space-y-1">
              {(Object.keys(modelConfig) as ModelType[]).map(key => (
                 <label key={key} className={`flex items-start p-2 rounded-md cursor-pointer transition-colors ${model === key ? 'bg-teal-50 dark:bg-teal-900/40' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
                    <input type="radio" name="model" value={key} checked={model === key} onChange={() => setModel(key)} className="mt-1 accent-teal-600"/>
                    <div className="ml-2">
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{modelConfig[key].label}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{modelConfig[key].description}</p>
                    </div>
                 </label>
              ))}
            </div>
            
            <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold text-gray-800 dark:text-gray-100 text-sm mb-2">{t('tools')}</h3>
                <div className="space-y-2">
                    <label
                       className="flex items-center p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                       title={t('tooltipKnowledgeBase')}
                     >
                        <input type="checkbox" checked={useKnowledgeBase} onChange={(e) => setUseKnowledgeBase(e.target.checked)} className="accent-teal-600" />
                        <span className="ml-2 text-sm font-medium text-gray-800 dark:text-gray-200">{t('useKnowledgeBase')}</span>
                    </label>
                    <label
                      className="flex items-center p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                      title={t('tooltipSearch')}
                    >
                        <input type="checkbox" checked={useSearch} onChange={(e) => setUseSearch(e.target.checked)} className="accent-teal-600" />
                        <span className="ml-2 text-sm font-medium text-gray-800 dark:text-gray-200">{t('searchWeb')}</span>
                    </label>
                     <label
                       className="flex items-start p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                       title={t('tooltipLocation')}
                     >
                        <input type="checkbox" checked={useMaps} onChange={handleMapsToggle} className="mt-0.5 accent-teal-600" />
                        <div className="ml-2">
                            <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{t('useLocation')}</span>
                             {locationError && <p className="text-xs text-red-500 mt-1">{locationError}</p>}
                        </div>
                    </label>
                    <label
                       className="flex items-center p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                       title={t('tooltipClinic')}
                     >
                        <input type="checkbox" checked={useClinicFinder} onChange={(e) => setUseClinicFinder(e.target.checked)} className="accent-teal-600" />
                        <span className="ml-2 text-sm font-medium text-gray-800 dark:text-gray-200">{t('useClinic')}</span>
                    </label>
                </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default memo(ModelSelector);