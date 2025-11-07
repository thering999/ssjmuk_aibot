import React, { useState, useRef, useEffect } from 'react';
import type { AttachedFile } from '../types';
import { useSpeech } from '../hooks/useSpeech';
import { useTranslation } from '../hooks/useTranslation';
import { processFiles, SUPPORTED_GENERATE_CONTENT_MIME_TYPES } from '../utils/fileUtils';

interface ChatInputProps {
  onSendMessage: (text: string) => void;
  isLoading: boolean;
  attachedFiles: AttachedFile[];
  setAttachedFiles: React.Dispatch<React.SetStateAction<AttachedFile[]>>;
  aspectRatio: string;
  setAspectRatio: (ratio: string) => void;
  onStopGeneration: () => void;
  onShowToast: (message: string) => void;
}

const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  isLoading,
  attachedFiles,
  setAttachedFiles,
  aspectRatio,
  setAspectRatio,
  onStopGeneration,
  onShowToast,
}) => {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { t, language } = useTranslation();
  const { isListening, toggleListening, transcript, isRecognitionSupported } = useSpeech(language);
  
  useEffect(() => {
    if (transcript) {
      setText(transcript);
    }
  }, [transcript]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const scrollHeight = textarea.scrollHeight;
      if (scrollHeight > 240) {
        textarea.style.height = '240px';
        textarea.style.overflowY = 'auto';
      } else {
        textarea.style.height = `${scrollHeight}px`;
        textarea.style.overflowY = 'hidden';
      }
    }
  }, [text]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim() || attachedFiles.length > 0) {
      onSendMessage(text.trim());
      setText('');
      // Note: attachedFiles are cleared in App.tsx after sending
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
        const newFiles = await processFiles(
            Array.from(files),
            SUPPORTED_GENERATE_CONTENT_MIME_TYPES,
            (fileName, fileType) => {
                onShowToast(t('toastUnsupportedFile', { fileName, fileType }));
            }
        );
        setAttachedFiles(prev => [...prev, ...newFiles]);
    } catch (error) {
        console.error("Error processing files:", error);
    }
    
    // Reset file input to allow selecting the same file again
    if (e.target) {
      e.target.value = '';
    }
  };

  const removeAttachedFile = (indexToRemove: number) => {
    setAttachedFiles(prev => prev.filter((_, index) => index !== indexToRemove));
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          if(!isLoading) handleSubmit(e);
      }
  };

  const showAspectRatio = attachedFiles.length === 1 && attachedFiles[0].mimeType.startsWith('image/') && attachedFiles[0].base64;

  return (
    <div className="w-full max-w-3xl mx-auto">
      {isLoading && (
        <div className="flex justify-center mb-2">
            <button
              onClick={onStopGeneration}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-full hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12H3" /></svg>
              {t('stopGeneration')}
            </button>
        </div>
      )}
      
      {attachedFiles.length > 0 && (
        <div className="mb-2 p-2 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-start justify-between animate-fade-in-fast">
            <div className="flex-1 flex flex-wrap gap-2">
                {attachedFiles.map((file, index) => (
                    <div key={index} className="bg-white dark:bg-gray-600 rounded-full flex items-center pl-2 pr-1 py-1 space-x-2 text-sm max-w-full">
                        {file.mimeType.startsWith('image/') && file.base64 ? (
                             <img src={`data:${file.mimeType};base64,${file.base64}`} alt="preview" className="w-5 h-5 rounded-full object-cover flex-shrink-0" />
                        ) : (
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                        )}
                        <span className="text-gray-700 dark:text-gray-300 truncate flex-shrink min-w-0">{file.name}</span>
                        <button onClick={() => removeAttachedFile(index)} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-500 flex-shrink-0">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                ))}
            </div>
             {showAspectRatio && (
                <div className="flex items-center space-x-2 ml-2">
                    <select value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value)} className="text-xs bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded p-1 focus:ring-2 focus:ring-teal-500 focus:outline-none">
                        <option value="1:1">1:1</option>
                        <option value="16:9">16:9</option>
                        <option value="9:16">9:16</option>
                        <option value="4:3">4:3</option>
                        <option value="3:4">3:4</option>
                    </select>
                </div>
            )}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="flex items-end space-x-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl p-2 shadow-sm focus-within:ring-2 focus-within:ring-teal-500">
        <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept="image/*,video/*,.txt,.md,.json,.csv,.html,.xml,.js,.css,.pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="hidden"
            multiple
        />
        
        <button type="button" onClick={() => fileInputRef.current?.click()} title={t('tooltipAttachOrAnalyze')} className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 flex-shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
        </button>
        
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isListening ? t('speechListening') : t('inputPlaceholder')}
          rows={1}
          className="flex-1 w-full bg-transparent resize-none p-2 focus:outline-none text-gray-800 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
          disabled={isLoading}
        />
        
        {isRecognitionSupported && (
            <button type="button" onClick={toggleListening} title={isListening ? t('stopListening') : t('startListening')} className={`p-2 rounded-full flex-shrink-0 ${isListening ? 'text-red-500 animate-pulse' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
            </button>
        )}
        
        <button
          type="submit"
          disabled={isLoading || (!text.trim() && attachedFiles.length === 0)}
          className="p-2 rounded-full bg-teal-600 text-white disabled:bg-gray-300 dark:disabled:bg-gray-600 hover:bg-teal-700 transition-colors flex-shrink-0"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 transform rotate-[-90deg]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zM12 11v8" /></svg>
        </button>
      </form>
    </div>
  );
};

export default ChatInput;