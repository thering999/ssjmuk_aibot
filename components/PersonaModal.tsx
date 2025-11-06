import React, { useState, useEffect } from 'react';
import { useTranslation } from '../hooks/useTranslation';

interface PersonaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (instruction: string) => void;
  currentInstruction: string;
}

const PersonaModal: React.FC<PersonaModalProps> = ({ isOpen, onClose, onSave, currentInstruction }) => {
  const [instruction, setInstruction] = useState(currentInstruction);
  const { t } = useTranslation();

  useEffect(() => {
    if (isOpen) {
      setInstruction(currentInstruction);
    }
  }, [isOpen, currentInstruction]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(instruction);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-lg w-full flex flex-col">
        <h2 className="text-lg font-bold mb-4 text-gray-800 dark:text-gray-100">{t('personaModalTitle')}</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          {t('personaModalBody')}
        </p>
        <textarea
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          className="w-full h-40 p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md text-sm text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
          placeholder={t('personaModalPlaceholder')}
        />
        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
          >
            {t('cancel')}
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-md hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
          >
            {t('save')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PersonaModal;