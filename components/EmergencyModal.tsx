import React, { useState } from 'react';
import type { EmergencyResult, Geolocation, UserProfile } from '../types';
import { useTranslation } from '../hooks/useTranslation';
import LoadingIndicator from './LoadingIndicator';

interface EmergencyModalProps {
  isOpen: boolean;
  onClose: () => void;
  isLoading: boolean;
  error: string | null;
  result: EmergencyResult | null;
  userLocation: Geolocation | null;
  emergencyContact?: UserProfile['emergencyContact'];
  onShowToast: (message: string) => void;
}

const EmergencyModal: React.FC<EmergencyModalProps> = ({ isOpen, onClose, isLoading, error, result, userLocation, emergencyContact, onShowToast }) => {
  const { t } = useTranslation();
  const [isNotifying, setIsNotifying] = useState(false);
  const [notified, setNotified] = useState(false);

  if (!isOpen) return null;

  const directionsUrl = result && userLocation
    ? `https://www.google.com/maps/dir/?api=1&origin=${userLocation.latitude},${userLocation.longitude}&destination=${encodeURIComponent(result.address)}`
    : '#';
    
  const handleNotify = () => {
    if (!emergencyContact) return;
    setIsNotifying(true);
    // Simulate API call to send SMS/notification
    setTimeout(() => {
        setIsNotifying(false);
        setNotified(true);
        onShowToast(t('emergencyContactNotified'));
    }, 1500);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-md w-full relative">
        <button onClick={onClose} className="absolute top-3 right-3 p-1 rounded-full text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        <div className="flex items-center mb-4">
          <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center mr-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-600 dark:text-red-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{t('emergencyModalTitle')}</h2>
        </div>

        <div className="min-h-[120px]">
          {isLoading && (
            <div className="flex flex-col items-center justify-center text-center">
              <LoadingIndicator className="h-8 w-8 text-teal-600 mb-3" />
              <p className="text-gray-600 dark:text-gray-400">{t('emergencyModalLoading')}</p>
            </div>
          )}
          {error && <p className="text-red-600 dark:text-red-400 text-center">{error}</p>}
          {result && (
            <div className="space-y-3">
              <div>
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400">{t('foundLocationTitle')}</h3>
                <p className="text-lg font-bold text-gray-800 dark:text-gray-100">{result.name}</p>
                <p className="text-sm text-gray-600 dark:text-gray-300">{result.address}</p>
              </div>
              <a 
                href={directionsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
              >
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                {t('getDirections')}
              </a>
              {emergencyContact?.name && (
                <button 
                  onClick={handleNotify}
                  disabled={isNotifying || notified}
                  className="w-full flex items-center justify-center px-4 py-2 bg-orange-500 text-white font-semibold rounded-lg hover:bg-orange-600 transition-colors disabled:bg-gray-400"
                >
                  {isNotifying && <LoadingIndicator className="h-5 w-5 mr-2 text-white" />}
                  {notified ? t('emergencyNotified') : (isNotifying ? t('emergencyNotifying') : t('emergencyNotifyContact', { name: emergencyContact.name }))}
                </button>
              )}
            </div>
          )}
        </div>

        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-2">{t('emergencyNumbersTitle')}</h3>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-300">{t('emergencyNumberNarenthorn')}</span>
              <a href="tel:1669" className="text-lg font-bold text-red-600 dark:text-red-400 hover:underline">1669</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmergencyModal;
