import React, { useState } from 'react';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  isLoading: boolean;
  shareLink: string | null;
}

const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose, isLoading, shareLink }) => {
  const [isCopied, setIsCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    if (shareLink) {
      navigator.clipboard.writeText(shareLink);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-md w-full">
        <h2 className="text-lg font-bold mb-4 text-gray-900 dark:text-gray-100">Share Conversation</h2>
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <svg className="animate-spin h-6 w-6 text-teal-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            <span className="ml-3 text-gray-700 dark:text-gray-300">Creating public link...</span>
          </div>
        ) : shareLink ? (
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              Anyone with this link can view a read-only version of this conversation.
            </p>
            <div className="flex items-center space-x-2 bg-gray-100 dark:bg-gray-700 rounded-md p-2">
              <input
                type="text"
                value={shareLink}
                readOnly
                className="w-full bg-transparent outline-none text-sm text-gray-800 dark:text-gray-200"
              />
              <button
                onClick={handleCopy}
                className="px-3 py-1 text-sm font-medium text-white bg-teal-600 rounded-md hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-70"
              >
                {isCopied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
        ) : (
             <p className="text-sm text-red-600 dark:text-red-400">Failed to create share link. Please try again.</p>
        )}
        <div className="flex justify-end mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShareModal;
