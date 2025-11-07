import React, { useRef, useEffect, memo, useState, useCallback } from 'react';
import type { ChatMessage, AttachedFile } from '../types';
import Message from './Message';
import ChatInput from './ChatInput';
import WelcomeScreen from './WelcomeScreen';
import { useTranslation } from '../hooks/useTranslation';
import { processFiles, SUPPORTED_GENERATE_CONTENT_MIME_TYPES } from '../utils/fileUtils';

interface ChatInterfaceProps {
  messages: ChatMessage[];
  isLoading: boolean;
  sendMessage: (text: string) => void;
  attachedFiles: AttachedFile[];
  setAttachedFiles: React.Dispatch<React.SetStateAction<AttachedFile[]>>;
  aspectRatio: string;
  setAspectRatio: (ratio: string) => void;
  retryMessage: (messageId: string) => void;
  stopGeneration: () => void;
  onFileForNewChat: (file: File) => void;
  onShowToast: (message: string) => void;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({
  messages,
  isLoading,
  sendMessage,
  attachedFiles,
  setAttachedFiles,
  aspectRatio,
  setAspectRatio,
  retryMessage,
  stopGeneration,
  onFileForNewChat,
  onShowToast,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const { t } = useTranslation();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const isNewChat = messages.length === 1 && messages[0].id === 'initial-welcome';

  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    // Use relatedTarget to prevent flickering when dragging over child elements
    if (e.relatedTarget && !e.currentTarget.contains(e.relatedTarget as Node)) {
        setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      if (isNewChat) {
        // If it's a new chat, use the first file to start a document chat
        onFileForNewChat(e.dataTransfer.files[0]);
      } else {
        // Otherwise, attach files to the current input
        const newFiles = await processFiles(
            Array.from(e.dataTransfer.files),
            SUPPORTED_GENERATE_CONTENT_MIME_TYPES,
            (fileName, fileType) => {
                onShowToast(t('toastUnsupportedFile', { fileName, fileType }));
            }
        );
        setAttachedFiles(prev => [...prev, ...newFiles]);
      }
      e.dataTransfer.clearData();
    }
  }, [isNewChat, onFileForNewChat, setAttachedFiles, onShowToast, t]);

  return (
    <div 
      className="flex-1 flex flex-col overflow-hidden relative"
      onDragEnter={handleDragEnter}
    >
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        {isNewChat ? (
          <WelcomeScreen onQuestionClick={sendMessage} onFileForNewChat={onFileForNewChat}/>
        ) : (
          <div className="space-y-4">
            {messages.map(msg => (
              <Message
                key={msg.id}
                message={msg}
                onRetry={retryMessage}
                onSendFollowUp={sendMessage}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>
      <div className="p-4 md:p-6 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        <ChatInput
          onSendMessage={sendMessage}
          isLoading={isLoading}
          attachedFiles={attachedFiles}
          setAttachedFiles={setAttachedFiles}
          aspectRatio={aspectRatio}
          setAspectRatio={setAspectRatio}
          onStopGeneration={stopGeneration}
          onShowToast={onShowToast}
        />
      </div>

      {isDragging && (
          <div
            className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm z-10 flex flex-col items-center justify-center p-4"
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <div className="w-full h-full border-4 border-dashed border-teal-400 rounded-2xl flex flex-col items-center justify-center text-white">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                <h2 className="text-2xl font-bold">
                    {isNewChat ? "Drop file to start a new chat" : "Drop files to attach"}
                </h2>
            </div>
          </div>
      )}
    </div>
  );
};

export default memo(ChatInterface);