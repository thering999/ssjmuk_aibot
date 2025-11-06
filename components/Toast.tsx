import React, { useState, useEffect } from 'react';

export interface ToastProps {
  message: string;
  duration?: number;
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, duration = 3000, onClose }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (message) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        // Allow time for fade out animation before calling onClose
        setTimeout(onClose, 300); 
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [message, duration, onClose]);

  return (
    <div
      className={`fixed bottom-5 right-5 p-4 rounded-md shadow-lg text-white transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'} bg-gray-800 dark:bg-gray-700`}
    >
      {message}
    </div>
  );
};

export default Toast;
