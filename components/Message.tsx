import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { okaidia } from 'react-syntax-highlighter/dist/esm/styles/prism';
import type { ChatMessage, ChatMessageSource, AttachedFile, ClinicInfo } from '../types';
import { useTranslation } from '../hooks/useTranslation';

interface MessageProps {
  message: ChatMessage;
  onRetry: (messageId: string) => void;
  onSendFollowUp: (question: string) => void;
}

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

const LoadingIndicator: React.FC = () => (
  <div className="flex space-x-1">
    <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
    <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
    <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
  </div>
);

// Component for displaying attached files for user messages
const AttachedFilePill: React.FC<{ file: AttachedFile }> = ({ file }) => {
    return (
        <div className="bg-white/50 dark:bg-black/20 rounded-lg flex items-center px-2 py-1 space-x-2 text-sm max-w-full mt-2">
            {file.mimeType.startsWith('image/') ? (
                <img src={`data:${file.mimeType};base64,${file.base64}`} alt="preview" className="w-5 h-5 rounded object-cover flex-shrink-0" />
            ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
            )}
            <span className="text-gray-700 dark:text-gray-300 truncate flex-shrink min-w-0">{file.name}</span>
        </div>
    );
};


// Component for Sources
const Sources: React.FC<{ sources: ChatMessageSource[] }> = ({ sources }) => {
    const { t } = useTranslation();
    if (!sources || sources.length === 0) return null;
    return (
        <div className="mt-3 border-t border-gray-200 dark:border-gray-600 pt-3">
            <h4 className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">{t('sources')}</h4>
            <div className="flex flex-wrap gap-2">
                {sources.map((source, index) => (
                    <a href={source.uri} target="_blank" rel="noopener noreferrer" key={index}
                       className="text-xs bg-gray-100 dark:bg-gray-700 text-teal-700 dark:text-teal-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full px-2 py-1 truncate max-w-xs">
                        {index + 1}. {source.title}
                    </a>
                ))}
            </div>
        </div>
    );
};

// Component for Follow-up questions
const FollowUpQuestions: React.FC<{ questions: string[], onSend: (q: string) => void }> = ({ questions, onSend }) => {
    const { t } = useTranslation();
    if (!questions || questions.length === 0) return null;
    return (
        <div className="mt-3 border-t border-gray-200 dark:border-gray-600 pt-3">
             <h4 className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">{t('followUpTitle')}</h4>
            <div className="flex flex-col items-start gap-2">
                {questions.map((q, i) => (
                    <button key={i} onClick={() => onSend(q)} className="text-sm text-left px-3 py-1.5 bg-white dark:bg-gray-900/50 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-teal-700 dark:text-teal-300 transition-colors">
                        {q}
                    </button>
                ))}
            </div>
        </div>
    );
};

const ClinicInfoCard: React.FC<{ info: ClinicInfo, onSendFollowUp: (q: string) => void }> = ({ info, onSendFollowUp }) => {
    const handleMapClick = () => {
        window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(info.address)}`, '_blank');
    };
    
    return (
        <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-3 not-prose bg-gray-50 dark:bg-gray-700/50 my-2 text-sm">
            <h4 className="font-semibold text-gray-800 dark:text-gray-100">{info.name}</h4>
            <div className="mt-2 space-y-1 text-xs text-gray-600 dark:text-gray-300">
                <p className="flex items-start">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-2 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    <span>{info.address}</span>
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
            <div className="mt-3 flex flex-wrap gap-2">
                <button onClick={handleMapClick} className="text-xs px-2 py-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors">
                    Show on Map
                </button>
                 <button onClick={() => onSendFollowUp(`What are the services available at ${info.name}?`)} className="text-xs px-2 py-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors">
                    Ask about services
                </button>
            </div>
        </div>
    );
};

// Component for Tool Use
const ToolUseDisplay: React.FC<{ toolUse: ChatMessage['toolUse'], onSendFollowUp: (q: string) => void }> = ({ toolUse, onSendFollowUp }) => {
    const { t } = useTranslation();
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    if (!toolUse) return null;

    // Custom renderer for Clinic Finder tool
    if (toolUse.name === 'getClinicInfo' && toolUse.result && !toolUse.isCalling) {
        try {
            const clinicData = JSON.parse(toolUse.result);
            if (clinicData.error) {
                return <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 italic">{clinicData.error}</div>
            }
            if (Array.isArray(clinicData)) {
                return (
                    <div className="mt-2 space-y-2">
                        {clinicData.map((info, i) => <ClinicInfoCard key={i} info={info} onSendFollowUp={onSendFollowUp} />)}
                    </div>
                );
            }
        } catch (e) {
            // Fallback to raw display if parsing fails
        }
    }
    
    // Default renderer for other tools or loading state
    return (
        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
            {toolUse.isCalling && (
                <div className="flex flex-col">
                    <div className="flex items-center">
                        <svg className="animate-spin h-3 w-3 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        {t('callingTool', { toolName: toolUse.name })}
                    </div>
                    <pre className="mt-2 p-2 bg-white dark:bg-gray-800 rounded text-xs overflow-x-auto">
                        <code>{JSON.stringify(toolUse.args, null, 2)}</code>
                    </pre>
                </div>
            )}
            {!toolUse.isCalling && (
                <div className="flex items-center justify-between">
                     <div className="flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-2 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        <span>{t('usedTool', { toolName: toolUse.name })}</span>
                    </div>
                    <button onClick={() => setIsDetailsOpen(!isDetailsOpen)} className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-xs font-semibold">
                        {isDetailsOpen ? 'Hide' : t('showDetails')}
                    </button>
                </div>
            )}
            {isDetailsOpen && toolUse.result && (
                <pre className="mt-2 p-2 bg-white dark:bg-gray-800 rounded text-xs overflow-x-auto">
                    <code>{toolUse.result}</code>
                </pre>
            )}
        </div>
    );
};


const Message: React.FC<MessageProps> = ({ message, onRetry, onSendFollowUp }) => {
  const { t } = useTranslation();
  const { sender, text, isProcessing, isError, attachedFiles, sources, imageUrl, videoUrl, mediaType, progressText, isThinking, toolUse, followUpQuestions, isGeneratingFollowUps } = message;
  const [isCopied, setIsCopied] = useState(false);

  if (message.id === 'initial-welcome') return null; // WelcomeScreen handles this

  const isUser = sender === 'user';

  const handleCopy = () => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };
  
  const CodeBlock = ({ node, inline, className, children, ...props }: any) => {
      const match = /language-(\w+)/.exec(className || '');
      return !inline && match ? (
        <div className="relative">
          <SyntaxHighlighter
            style={okaidia}
            language={match[1]}
            PreTag="div"
            {...props}
          >
            {String(children).replace(/\n$/, '')}
          </SyntaxHighlighter>
        </div>
      ) : (
        <code className={className} {...props}>
          {children}
        </code>
      );
  };


  const messageClasses = isUser
    ? 'bg-teal-600 text-white rounded-t-xl rounded-bl-xl'
    : 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-t-xl rounded-br-xl shadow-sm';
  
  const containerClasses = `flex ${isUser ? 'justify-end' : 'justify-start'}`;
  const messageContainerClasses = `flex items-start max-w-lg lg:max-w-xl ${isUser ? 'flex-row-reverse' : ''}`;

  return (
    <div className={containerClasses}>
      <div className={messageContainerClasses}>
        {!isUser && <BotAvatar />}
        
        <div className={`p-3 md:p-4 ${messageClasses} group relative`}>
            {!isUser && text && !isProcessing && (
                <button 
                    onClick={handleCopy} 
                    className="absolute top-2 right-2 p-1 rounded-md bg-gray-500/10 dark:bg-gray-900/20 text-gray-500 dark:text-gray-400 hover:bg-gray-500/20 dark:hover:bg-gray-900/30 opacity-0 group-hover:opacity-100 transition-opacity"
                    title={t('copyCode')}
                >
                    {isCopied ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                    )}
                </button>
            )}

            {isError ? (
                <div className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-400 mr-2 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                    <div className="flex-1">
                        <p className="text-sm font-medium">{t('errorOccurred')}</p>
                        <p className="text-xs">{text}</p>
                        <button onClick={() => onRetry(message.id)} className="text-xs font-semibold mt-1 hover:underline">
                            {t('clickToRetry')}
                        </button>
                    </div>
                </div>
            ) : (
                <div>
                    {isThinking && !text && <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 italic"><LoadingIndicator /> <span className="ml-2">{t('thinking')}</span></div>}
                    
                    {text && (
                        <ReactMarkdown
                          children={text}
                          remarkPlugins={[remarkGfm]}
                          components={{ code: CodeBlock }}
                          className="whitespace-pre-wrap prose prose-sm dark:prose-invert max-w-none break-words"
                        />
                    )}
                    
                    {isProcessing && !text && mediaType === 'image' && <div className="text-sm italic">{t('generatingImage')}</div>}
                    {isProcessing && mediaType === 'video' && <div className="text-sm italic">{progressText || t('generatingVideo')}</div>}

                    {imageUrl && <img src={imageUrl} alt="Generated content" className="mt-2 rounded-lg max-w-sm w-full" />}
                    {videoUrl && <video src={videoUrl} controls className="mt-2 rounded-lg max-w-sm w-full" />}
                    
                    {attachedFiles && attachedFiles.map((file, index) => <AttachedFilePill key={index} file={file} />)}
                    
                    <ToolUseDisplay toolUse={toolUse} onSendFollowUp={onSendFollowUp} />
                    <Sources sources={sources} />

                    {isGeneratingFollowUps && (
                         <div className="mt-3 flex items-center text-xs text-gray-500 dark:text-gray-400 italic">
                           <LoadingIndicator /> <span className="ml-2">{t('generatingFollowUps')}</span>
                         </div>
                    )}
                    <FollowUpQuestions questions={followUpQuestions || []} onSend={onSendFollowUp} />
                </div>
            )}
        </div>

        {isUser && <UserAvatar />}
      </div>
    </div>
  );
};

export default Message;
