// This is a new file: components/SharedConversationView.tsx
import React, { useState, useEffect } from 'react';
import type { Conversation, ChatMessage, ClinicInfo } from '../types';
import { getSharedConversation } from '../services/firebase';
import { useTranslation } from '../hooks/useTranslation';

// --- COPIED COMPONENTS FOR SELF-CONTAINMENT ---
// These are simplified, non-interactive versions of components from Message.tsx

const BotAvatar: React.FC = () => (
    <div className="w-8 h-8 rounded-full bg-teal-500 flex items-center justify-center overflow-hidden flex-shrink-0 mr-3">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
    </div>
);

const UserAvatar: React.FC = () => (
    <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center overflow-hidden flex-shrink-0 ml-3">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
    </div>
);

const ClinicInfoCard: React.FC<{ info: ClinicInfo }> = ({ info }) => (
    <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-3 not-prose bg-gray-50 dark:bg-gray-700/50 my-2 text-sm">
        <h4 className="font-semibold text-gray-800 dark:text-gray-100">{info.name}</h4>
        <div className="mt-2 space-y-1 text-xs text-gray-600 dark:text-gray-300">
            <p className="flex items-start">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-2 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                 <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(info.address)}`} target="_blank" rel="noopener noreferrer" className="hover:underline">{info.address}</a>
            </p>
            <p className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                {info.hours}
            </p>
            <p className="flex items-center">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                 <a href={`tel:${info.phone}`} className="hover:underline">{info.phone}</a>
            </p>
        </div>
         <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
            <div className="flex flex-wrap gap-1">
                {info.services.map((service, i) => (
                    <span key={i} className="text-xs bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300 px-1.5 py-0.5 rounded-full">{service}</span>
                ))}
            </div>
        </div>
    </div>
);


const SharedToolResult: React.FC<{ toolUse: ChatMessage['toolUse'] }> = ({ toolUse }) => {
    if (!toolUse || !toolUse.result) return null;
    let result = toolUse.result;
    
    // Attempt to parse and render clinic info nicely
    if (toolUse.name === 'getClinicInfo') {
        try {
            const clinicData = JSON.parse(result);
            if (Array.isArray(clinicData) && clinicData.length > 0) {
                return (
                    <div className="mt-2 space-y-2">
                        {clinicData.map((info, i) => <ClinicInfoCard key={i} info={info} />)}
                    </div>
                );
            }
            if (clinicData.error) {
                 return <div className="text-xs italic text-gray-500 dark:text-gray-400 mt-1">{clinicData.error}</div>;
            }
        } catch (e) { /* Fallback to raw text */ }
    }
    
    return <pre className="mt-2 p-2 bg-white dark:bg-gray-800 rounded text-xs overflow-x-auto"><code>{result}</code></pre>;
};


const SharedMessage: React.FC<{ message: ChatMessage }> = ({ message }) => {
  const { sender, text, attachedFiles, sources, imageUrl, videoUrl, toolUse } = message;
  const isUser = sender === 'user';
  const messageClasses = isUser
    ? 'bg-teal-600 text-white rounded-t-xl rounded-bl-xl'
    : 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-t-xl rounded-br-xl shadow-sm';
  const containerClasses = `flex ${isUser ? 'justify-end' : 'justify-start'}`;
  const messageContainerClasses = `flex items-start max-w-lg lg:max-w-xl ${isUser ? 'flex-row-reverse' : ''}`;

  return (
    <div className={`${containerClasses} fade-in`}>
      <div className={messageContainerClasses}>
        {!isUser && <BotAvatar />}
        <div className={`p-3 md:p-4 ${messageClasses}`}>
            {text && <div className="whitespace-pre-wrap prose prose-sm dark:prose-invert max-w-none break-words">{text}</div>}
            {imageUrl && <img src={imageUrl} alt="Generated content" className="mt-2 rounded-lg max-w-sm w-full" />}
            {videoUrl && <video src={videoUrl} controls className="mt-2 rounded-lg max-w-sm w-full" />}
            {toolUse?.result && <SharedToolResult toolUse={toolUse} />}
            {sources && sources.length > 0 && (
                <div className="mt-3 border-t border-gray-200 dark:border-gray-600 pt-3">
                    <div className="flex flex-wrap gap-2">
                        {sources.map((source, index) => (
                            <a href={source.uri} target="_blank" rel="noopener noreferrer" key={index}
                               className="text-xs bg-gray-100 dark:bg-gray-700 text-teal-700 dark:text-teal-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full px-2 py-1 truncate max-w-xs">
                                {index + 1}. {source.title}
                            </a>
                        ))}
                    </div>
                </div>
            )}
        </div>
        {isUser && <UserAvatar />}
      </div>
    </div>
  );
};


// --- MAIN COMPONENT ---

interface SharedConversationViewProps {
    shareId: string;
}

const SharedConversationView: React.FC<SharedConversationViewProps> = ({ shareId }) => {
    const [conversation, setConversation] = useState<Conversation | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { t } = useTranslation();

    useEffect(() => {
        const fetchConversation = async () => {
            try {
                const fetchedConversation = await getSharedConversation(shareId);
                if (fetchedConversation) {
                    setConversation(fetchedConversation);
                } else {
                    setError("Conversation not found or has been deleted.");
                }
            } catch (err) {
                console.error("Error fetching shared conversation:", err);
                setError("An error occurred while loading the conversation.");
            } finally {
                setIsLoading(false);
            }
        };
        fetchConversation();
    }, [shareId]);

    const returnToApp = () => {
        // Clear the query parameter and reload
        window.location.href = window.location.pathname;
    };

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
                <svg className="animate-spin h-8 w-8 text-teal-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            </div>
        );
    }
    
    if (error) {
        return (
            <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-900 p-4 text-center">
                 <div>
                    <h2 className="text-xl font-bold text-red-600 dark:text-red-400">Could not load conversation</h2>
                    <p className="text-gray-600 dark:text-gray-400 mt-2">{error}</p>
                    <button onClick={returnToApp} className="mt-6 px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700">Return to App</button>
                 </div>
            </div>
        );
    }

    if (!conversation) return null;

    return (
        <div className="bg-gray-50 dark:bg-gray-900 min-h-screen flex flex-col">
            <header className="p-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 sticky top-0 z-10">
                <div className="max-w-3xl mx-auto flex justify-between items-center">
                    <div>
                        <h1 className="font-semibold text-lg text-gray-800 dark:text-gray-100">{conversation.title}</h1>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Shared via {t('appTitle')}</p>
                    </div>
                    <button onClick={returnToApp} className="px-3 py-1.5 text-sm bg-teal-600 text-white rounded-md hover:bg-teal-700">
                        &larr; Back to App
                    </button>
                </div>
            </header>
            <main className="max-w-3xl mx-auto p-4 md:p-6 w-full flex-1">
                <div className="space-y-4">
                    {conversation.messages.map(msg => (
                        <SharedMessage key={msg.id} message={msg} />
                    ))}
                </div>
            </main>
            <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 mt-8">
                <div className="max-w-3xl mx-auto text-center py-8 px-4">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">{t('sharedFooterTitle')}</h2>
                    <p className="mt-2 text-gray-600 dark:text-gray-400">{t('sharedFooterBody')}</p>
                    <button 
                        onClick={returnToApp}
                        className="mt-6 px-6 py-3 bg-teal-600 text-white font-semibold rounded-lg hover:bg-teal-700 transition-colors shadow-md"
                    >
                        {t('sharedFooterButton')}
                    </button>
                </div>
            </footer>
        </div>
    );
};

export default SharedConversationView;