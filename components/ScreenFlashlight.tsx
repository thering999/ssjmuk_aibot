import React, { useEffect } from 'react';

interface ScreenFlashlightProps {
  isOpen: boolean;
  onClose: () => void;
}

const ScreenFlashlight: React.FC<ScreenFlashlightProps> = ({ isOpen, onClose }) => {
  useEffect(() => {
    if (isOpen) {
      // Request full screen when opened to maximize brightness area (optional, user might prefer manual)
      // document.documentElement.requestFullscreen().catch(err => console.log(err));
    } else {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(err => console.log(err));
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-white flex flex-col items-center justify-center">
      <button 
        onClick={onClose}
        className="absolute bottom-10 p-4 bg-gray-200/50 rounded-full text-gray-800 hover:bg-gray-300/80 transition-colors backdrop-blur-sm"
        aria-label="Turn off flashlight"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      </button>
      <p className="absolute top-10 text-gray-300 text-sm font-medium">Screen Flashlight On</p>
    </div>
  );
};

export default ScreenFlashlight;