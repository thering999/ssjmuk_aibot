import React from 'react';
import { useTranslation } from '../hooks/useTranslation';

interface ApiKeyNoticeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const ApiKeyNoticeModal: React.FC<ApiKeyNoticeModalProps> = ({ isOpen, onClose, onConfirm }) => {
  const { t } = useTranslation();
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-sm w-full">
        <h2 className="text-lg font-bold mb-4 text-gray-900 dark:text-gray-100">{t('apiKeyModalTitle')}</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          {t('apiKeyModalBody1')}
        </p>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          {t('apiKeyModalBody2')}{' '}
          <a
            href="https://ai.google.dev/gemini-api/docs/billing"
            target="_blank"
            rel="noopener noreferrer"
            className="text-teal-600 hover:underline dark:text-teal-400"
          >
            {t('billingDocumentation')}
          </a>.
        </p>
        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
          >
            {t('cancel')}
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-md hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
          >
            {t('selectApiKey')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ApiKeyNoticeModal;