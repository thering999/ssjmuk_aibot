import React, { useState, useCallback, useRef } from 'react';
import { useTranslation } from '../hooks/useTranslation';
import SuggestedQuestions from './SuggestedQuestions';

// Base64 encoded logo for Mukdahan Provincial Public Health Office
const logoSrc = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAPAAAADwCAMAAAAJixw1AAABAlBMVEX////9/f38/Pz+/v75+fnx8fHy8vL09PT39/f6+vrz8/P19fX4+Pj7+/v////u7u7q6urm5ubk5OTe3t7Z2dnT09PPz8+7u7vDw8O/v7+pqamfn5+BgYF6enp0dHRsbGxlZWVdXV1SUlJOTk5GRkZCQkI+Pj45OTkxMTElJSV/f395eXlxcXFmZmZVVVVLSkpFRUVDQ0M/Pz83Nzc0NDQsLCwmJiYfHx8aGhoXFxcSEhIMDAwICAgGBgYFBQUCAgIAAADy8vLw8PDm5ubg4ODX19fS0tLLy8vJycnExMS3t7eurq6jo6N+fn5tbW1dXV1SUlJLS0tEREQ8PDwyMjIhISEWFhYODg4KCgoGBgYBAQHuKwVSAAASYklEQVR4nO2d6XuyOhfG5ZqGmoZC9y7t7u7u7u7u7u7u7u7ubr/3S7e7u/v/P3zJgCRtQpI0QZL8fr53IMmQfD5583NeFEVRFCVfQ5p/bfr56dOnS5eS7u5fL7w6uX2+dLl293fL9/f7+/v7e/v7+1p/b//Lq6tXr16+vPr2+eLly6tXr169evXq1atXr169evXq1atXr169evXq1atXr169evXq1atXr169evXq1atXr169evXq1atXr169evXq1atXr169evXq1atXr169evXq1atXr169evXq1atXr169evXq1avvL1/+8+v/8v+7//L/8s9/8Pvv+fL/y1evXr169erVq1evXr169erVq1evXr169erVq1evXr169erVq1evXr169erVq1evXr169erVq1evXr169erVq1evXr169erVq1evXr169erVq1evXr169erVq1f/2vW3z342D0+fPp3+m9OfP39+/vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz-c-o8K1C9L/9k8fP306/WfS8+dPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz58+fPnz9//vz-h5z4D8n74t8///8F0aT8KxXjV7cAAAAAElFTSuQmCC";

interface WelcomeScreenProps {
  onQuestionClick: (question: string) => void;
  onFileForNewChat: (file: File) => void;
}

const CapabilityCard: React.FC<{ icon: React.ReactNode, title: string, description: string }> = ({ icon, title, description }) => (
    <div className="bg-white/50 dark:bg-gray-800/50 p-4 rounded-lg text-center flex flex-col items-center">
        <div className="p-2 bg-teal-100 dark:bg-teal-900/40 rounded-full text-teal-600 dark:text-teal-300 mb-3">
            {icon}
        </div>
        <h3 className="font-semibold text-sm text-gray-800 dark:text-gray-100">{title}</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{description}</p>
    </div>
);


const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onQuestionClick, onFileForNewChat }) => {
    const { t } = useTranslation();
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const capabilities = [
        {
            icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>,
            title: t('capabilityChat'),
            description: t('capabilityChatDesc')
        },
        {
            icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
            title: t('capabilityImage'),
            description: t('capabilityImageDesc')
        },
        {
            icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>,
            title: t('capabilityDoc'),
            description: t('capabilityDocDesc')
        },
        {
            icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 15.546c-.523 0-1.046.151-1.5.454a2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0c-.454-.303-.977-.454-1.5-.454V8.454c.523 0 1.046-.151 1.5-.454a2.704 2.704 0 013 0 2.704 2.704 0 003 0 2.704 2.704 0 013 0 2.704 2.704 0 003 0c.454.303.977.454 1.5.454v7.092zM12 12.454l4-4m-4 4l-4-4" /></svg>,
            title: t('capabilityFood'),
            description: t('capabilityFoodDesc')
        }
    ];

    const handleDrag = useCallback((e: React.DragEvent<HTMLDivElement>, enter: boolean) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(enter);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        handleDrag(e, false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            onFileForNewChat(e.dataTransfer.files[0]);
            e.dataTransfer.clearData();
        }
    }, [handleDrag, onFileForNewChat]);
    
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            onFileForNewChat(e.target.files[0]);
        }
        e.target.value = ''; // Reset for next selection
    };

    return (
        <div className="h-full flex flex-col justify-center items-center text-center px-4">
            <div className="w-16 h-16 mb-4 rounded-full bg-teal-500 flex items-center justify-center overflow-hidden flex-shrink-0">
                <img src={logoSrc} alt="Logo" className="w-full h-full object-cover"/>
            </div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{t('welcomeTitle')}</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1 mb-6">{t('welcomeSubtitle')}</p>
            
             <div
                onDragEnter={(e) => handleDrag(e, true)}
                onDragLeave={(e) => handleDrag(e, false)}
                onDragOver={(e) => handleDrag(e, true)}
                onDrop={handleDrop}
                className={`w-full max-w-2xl mx-auto p-6 border-2 border-dashed rounded-xl transition-colors duration-200 ${isDragging ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20' : 'border-gray-300 dark:border-gray-600'}`}
            >
                 <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    className="hidden"
                    accept="image/*,video/*,.txt,.md,.json,.csv,.html,.xml,.js,.css,.pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                />
                <div className="flex flex-col items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mb-2 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                    <p className="text-gray-600 dark:text-gray-400">
                        Drop a file here to start a new chat, or{' '}
                        <button onClick={() => fileInputRef.current?.click()} className="font-semibold text-teal-600 hover:text-teal-500 dark:text-teal-400 dark:hover:text-teal-300 focus:outline-none">
                            browse files
                        </button>
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">{t('welcomeUploadSupported')}</p>
                </div>
            </div>
            
            <div className="w-full max-w-2xl mx-auto my-4">
                <button
                    onClick={() => onQuestionClick(t('recommendSystemPrompt'))}
                    className="px-5 py-2.5 bg-white dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-semibold text-teal-600 dark:text-teal-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
                >
                    {t('recommendSystem')}
                </button>
            </div>

            <div className="w-full max-w-2xl mx-auto mb-6">
                 <SuggestedQuestions onQuestionClick={onQuestionClick} />
            </div>

            <div className="w-full max-w-md mx-auto">
                <h2 className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-3">{t('capabilityTitle')}</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {capabilities.map(cap => (
                        <CapabilityCard key={cap.title} {...cap} />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default WelcomeScreen;