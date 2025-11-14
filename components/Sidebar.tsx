import React, { useState, useMemo } from 'react';
import { Conversation } from '../types';
import { AppMode } from '../App';
import Auth from './Auth';
import { useAuth } from '../hooks/useAuth';
import { useKnowledgeBase } from '../hooks/useKnowledgeBase';
import { useTranslation } from '../hooks/useTranslation';

interface SidebarProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  onNewChat: () => void;
  onSelectChat: (id: string) => void;
  onDeleteChat: (id: string) => void;
  onRenameChat: (id: string, newTitle: string) => void;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  isFetching: boolean;
  onShowToast: (message: string) => void;
  currentMode: AppMode;
}

const formatBytes = (bytes: number, decimals = 2) => {
  if (!+bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

const Sidebar: React.FC<SidebarProps> = ({
  conversations, activeConversationId, onNewChat, onSelectChat, onDeleteChat, onRenameChat, isOpen, setIsOpen, isFetching, onShowToast, currentMode
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const { t } = useTranslation();

  const { user } = useAuth();
  const { documents, uploadDocument, deleteDocument, isLoading: isKbLoading } = useKnowledgeBase(user);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleRename = (id: string, currentTitle: string) => {
    setEditingId(id);
    setRenameValue(currentTitle);
  };

  const handleSaveRename = (id: string) => {
    if (renameValue.trim()) {
      onRenameChat(id, renameValue.trim());
    }
    setEditingId(null);
  };
  
  const handleDelete = (id: string) => {
     onDeleteChat(id);
     setDeletingId(null);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && user) {
        try {
            onShowToast(`Uploading ${file.name}...`);
            await uploadDocument(file);
            onShowToast(`${file.name} uploaded successfully!`);
        } catch (error) {
            onShowToast(`Error uploading ${file.name}.`);
        }
    }
    // Reset file input
    if (e.target) e.target.value = '';
  };
  
  const filteredConversations = useMemo(() => 
    conversations.filter(conv => 
      conv.title.toLowerCase().includes(searchQuery.toLowerCase())
    ), [conversations, searchQuery]);

  const sidebarClasses = isOpen ? "translate-x-0" : "-translate-x-full";

  return (
    <>
      <div className={`fixed inset-0 z-20 bg-black/30 lg:hidden ${isOpen ? 'block' : 'hidden'}`} onClick={() => setIsOpen(false)}></div>
      <aside className={`absolute lg:relative z-30 flex flex-col w-64 bg-gray-100 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 h-full transition-transform duration-300 ease-in-out ${sidebarClasses}`}>
        <div className="p-2 border-b border-gray-200 dark:border-gray-700 space-y-2">
            <button
                onClick={onNewChat}
                className="w-full flex items-center justify-center p-2 rounded-lg text-sm font-semibold bg-teal-600 text-white hover:bg-teal-700 transition-colors"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                New Chat
            </button>
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-4 w-4 text-gray-400 dark:text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                </div>
                <input
                    type="text"
                    placeholder={t('searchChatsPlaceholder')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-8 py-2 text-sm text-gray-800 dark:text-gray-100 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                {searchQuery && (
                    <div className="absolute inset-y-0 right-0 pr-2 flex items-center">
                        <button onClick={() => setSearchQuery('')} className="p-1 rounded-full text-gray-500 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-600">
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                )}
            </div>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {isFetching && <div className="p-4 text-center text-sm text-gray-500">Loading chats...</div>}
          {!isFetching && filteredConversations.length === 0 && (
            <div className="p-4 text-center text-sm text-gray-500">{t('noChatsFound')}</div>
          )}
          <nav className="p-2 space-y-1">
            {filteredConversations.map(conv => {
              const isActive = conv.id === activeConversationId;
              return (
                <div key={conv.id} className={`group flex items-center rounded-md ${isActive ? 'bg-teal-100 dark:bg-teal-900/40' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
                    {editingId === conv.id ? (
                        <input
                            type="text"
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onBlur={() => handleSaveRename(conv.id)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSaveRename(conv.id)}
                            className="flex-1 w-0 p-2 bg-transparent text-sm text-gray-800 dark:text-gray-100 focus:outline-none"
                            autoFocus
                        />
                    ) : (
                        <button onClick={() => onSelectChat(conv.id)} className="flex-1 w-0 p-2 text-left truncate text-sm text-gray-700 dark:text-gray-200">
                            {conv.title}
                        </button>
                    )}
                  
                  <div className={`flex-shrink-0 flex items-center ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                    <button onClick={() => handleRename(conv.id, conv.title)} className="p-1 rounded text-gray-500 hover:bg-gray-300 dark:hover:bg-gray-600"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z" /></svg></button>
                    <button onClick={() => setDeletingId(conv.id)} className="p-1 rounded text-gray-500 hover:bg-gray-300 dark:hover:bg-gray-600"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                  </div>
                </div>
              );
            })}
          </nav>
        </div>
        {user && (
            <div className="p-2 border-t border-gray-200 dark:border-gray-700">
                <h3 className="px-2 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Knowledge Base</h3>
                <div className="max-h-32 overflow-y-auto space-y-1 mb-2">
                    {isKbLoading && <div className="px-2 text-sm text-gray-500">Loading...</div>}
                    {documents.map(doc => (
                        <div key={doc.id} className="group flex items-center justify-between text-sm p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700">
                            <div className="flex-1 min-w-0">
                                <span className="truncate text-gray-700 dark:text-gray-300 font-medium block">{doc.name}</span>
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                    {formatBytes(doc.size)} - {new Date(doc.createdAt).toLocaleDateString()}
                                </span>
                            </div>
                            <button onClick={() => deleteDocument(doc)} className="flex-shrink-0 ml-2 opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                        </div>
                    ))}
                    {!isKbLoading && documents.length === 0 && <p className="px-2 text-xs text-gray-400">No documents uploaded.</p>}
                </div>
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
                <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full text-center p-2 text-sm rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500 transition-colors"
                    disabled={isKbLoading}
                >
                    {isKbLoading ? 'Processing...' : 'Upload Document'}
                </button>
            </div>
        )}
        
        <div className="p-2 border-t border-gray-200 dark:border-gray-700">
            <Auth />
        </div>

        {deletingId && (
            <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl">
                    <h3 className="font-bold text-lg">Delete Chat?</h3>
                    <p className="py-4 text-sm">This action cannot be undone.</p>
                    <div className="flex justify-end space-x-2">
                        <button onClick={() => setDeletingId(null)} className="px-3 py-1 text-sm rounded bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500">Cancel</button>
                        <button onClick={() => handleDelete(deletingId)} className="px-3 py-1 text-sm rounded bg-red-600 text-white hover:bg-red-700">Delete</button>
                    </div>
                </div>
            </div>
        )}

      </aside>
    </>
  );
};

export default Sidebar;
