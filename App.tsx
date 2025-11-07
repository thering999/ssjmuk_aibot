import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { AttachedFile, ModelType, Geolocation, Conversation, EmergencyResult, LiveConversationHandle } from './types';
import { useTheme } from './hooks/useTheme';
import { useChat } from './hooks/useChat';
import { useTranslation } from './hooks/useTranslation';
import { usePersistentState } from './hooks/usePersistentState';
import { useAuth } from './hooks/useAuth';
import { useVoiceCommands } from './hooks/useVoiceCommands';
import { textToSpeech, isTtsSupported as checkTtsSupport } from './services/ttsService';
import { processFiles, SUPPORTED_GENERATE_CONTENT_MIME_TYPES } from './utils/fileUtils';
import { shareConversation as apiShareConversation } from './services/firebase';
import { ApiKeyNotSelectedError } from './services/videoService';
import { findNearestEmergencyRoom } from './services/emergencyService';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import ChatInterface from './components/ChatInterface';
import LiveConversation from './components/LiveConversation';
import HealthReportAnalyzer from './components/HealthReportAnalyzer';
import HealthHub from './components/HealthHub';
import Dashboard from './components/Dashboard';
import PersonaModal from './components/PersonaModal';
import ApiKeyNoticeModal from './components/ApiKeyNoticeModal';
import ConfirmationModal from './components/ConfirmationModal';
import EmergencyModal from './components/EmergencyModal';
import Toast from './components/Toast';
import ShareModal from './components/ShareModal';
import SharedConversationView from './components/SharedConversationView';
import LoadingIndicator from './components/LoadingIndicator';

export type AppMode = 'chat' | 'live' | 'analyzer' | 'hub' | 'dashboard';

const App: React.FC = () => {
  const { t, language, setLanguage } = useTranslation();
  const { user } = useAuth();
  const [theme, toggleTheme] = useTheme();
  const [sidebarIsOpen, setSidebarIsOpen] = useState(window.innerWidth > 1024);
  
  // Model and tool settings
  const [model, setModel] = usePersistentState<ModelType>('model', 'flash');
  const [useSearch, setUseSearch] = usePersistentState('useSearch', false);
  const [useMaps, setUseMaps] = usePersistentState('useMaps', false);
  const [useClinicFinder, setUseClinicFinder] = usePersistentState('useClinicFinder', true);
  const [useKnowledgeBase, setUseKnowledgeBase] = usePersistentState('useKnowledgeBase', true);
  
  // App state
  const [isTtsEnabled, setIsTtsEnabled] = usePersistentState('isTtsEnabled', false);
  const [location, setLocation] = useState<Geolocation | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [currentMode, setCurrentMode] = useState<AppMode>('chat');
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const liveConversationRef = useRef<LiveConversationHandle>(null);

  // Modals and notifications
  const [isPersonaModalOpen, setIsPersonaModalOpen] = useState(false);
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [isDocConfirmOpen, setIsDocConfirmOpen] = useState(false);
  const [docToConfirm, setDocToConfirm] = useState<AttachedFile | null>(null);
  const [toastMessage, setToastMessage] = useState('');
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [isEmergencyModalOpen, setIsEmergencyModalOpen] = useState(false);
  const [emergencyResult, setEmergencyResult] = useState<EmergencyResult | null>(null);
  const [isEmergencyLoading, setIsEmergencyLoading] = useState(false);
  const [emergencyError, setEmergencyError] = useState<string | null>(null);
  const [currentUserLocationForSos, setCurrentUserLocationForSos] = useState<Geolocation | null>(null);

  const isTtsSupported = checkTtsSupport();

  const {
    conversations,
    activeConversation,
    sendMessage,
    retryMessage,
    stopGeneration,
    createNewChat,
    startChatWithDocument,
    deleteConversation,
    renameConversation,
    selectConversation,
    updateSystemInstruction,
    isFetching,
  } = useChat(model, useSearch, useMaps, location, isTtsEnabled, useClinicFinder, useKnowledgeBase, user, t);

   useEffect(() => {
    if (useMaps && !location && !locationError) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
          setLocationError(null);
        },
        (error) => {
          console.error("Geolocation error:", error);
          setLocationError(t('locationError'));
          setUseMaps(false);
        }
      );
    }
  }, [useMaps, location, locationError, setUseMaps, t]);

  const showToast = useCallback((message: string) => {
    setToastMessage(message);
  }, []);

  const handleSendMessage = useCallback(async (text: string) => {
    if (!activeConversation) return;
    try {
      await sendMessage(text, attachedFiles, aspectRatio);
      setAttachedFiles([]);
    } catch (error) {
       if (error instanceof ApiKeyNotSelectedError) {
          setIsApiKeyModalOpen(true);
       }
       // Other errors are handled within useChat
    }
  }, [sendMessage, attachedFiles, aspectRatio, activeConversation]);

  const handleRetryMessage = useCallback((messageId: string) => {
      const failedBotMessage = activeConversation?.messages.find(m => m.id === messageId);
      if (failedBotMessage) {
        retryMessage(messageId);
      }
  }, [retryMessage, activeConversation]);

  const handleFileForNewChat = (file: File) => {
    if (!SUPPORTED_GENERATE_CONTENT_MIME_TYPES.includes(file.type)) {
      showToast(t('toastUnsupportedFileForNewChat'));
      return;
    }
    processFiles([file], SUPPORTED_GENERATE_CONTENT_MIME_TYPES, () => {}).then(processed => {
      if (processed.length > 0) {
        setDocToConfirm(processed[0]);
        setIsDocConfirmOpen(true);
      }
    });
  };

  const confirmStartChatWithDoc = () => {
    if(docToConfirm) {
        startChatWithDocument(docToConfirm);
    }
    setIsDocConfirmOpen(false);
    setDocToConfirm(null);
  };

  const handlePersonaSave = (instruction: string) => {
    if (activeConversation) {
      updateSystemInstruction(activeConversation.id, instruction);
    }
    setIsPersonaModalOpen(false);
  };
  
  const handleExportConversation = () => {
    if (!activeConversation || activeConversation.messages.length <= 1) {
        showToast(t('toastNoActiveConversation'));
        return;
    }
    showToast(t('toastExporting'));
    const content = activeConversation.messages
      .filter(m => m.id !== 'initial-welcome')
      .map(m => `[${m.sender.toUpperCase()} at ${new Date(m.timestamp).toLocaleString()}]\n${m.text}`)
      .join('\n\n---\n\n');
    
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeConversation.title.replace(/ /g, '_')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleShareConversation = async () => {
    if (!user) {
        showToast("You must be signed in to share conversations.");
        return;
    }
    if (!activeConversation || activeConversation.messages.length <= 1) {
        showToast(t('toastNoActiveConversation'));
        return;
    }
    setIsShareModalOpen(true);
    setIsSharing(true);
    setShareLink(null);
    try {
        const shareId = await apiShareConversation(activeConversation);
        const link = `${window.location.origin}${window.location.pathname}?shareId=${shareId}`;
        setShareLink(link);
    } catch (error) {
        console.error("Failed to share conversation:", error);
        setShareLink(null); // Indicate failure
    } finally {
        setIsSharing(false);
    }
  };

  const handleSosClick = useCallback(() => {
    setIsEmergencyModalOpen(true);
    setIsEmergencyLoading(true);
    setEmergencyError(null);
    setEmergencyResult(null);
    setCurrentUserLocationForSos(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const userCoords = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        setCurrentUserLocationForSos(userCoords);
        try {
          const result = await findNearestEmergencyRoom(userCoords);
          setEmergencyResult(result);
        } catch (error) {
          console.error("Emergency API error:", error);
          setEmergencyError(t('emergencyModalApiError'));
        } finally {
          setIsEmergencyLoading(false);
        }
      },
      (error) => {
        console.error("SOS Geolocation error:", error);
        setEmergencyError(t('emergencyModalLocationError'));
        setIsEmergencyLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, [t]);

  const commands = useMemo(() => ({
      newChat: () => { createNewChat(); showToast(t('toastNewChat')); },
      readLastMessage: () => {
          const lastMessage = activeConversation?.messages.filter(m => m.sender === 'bot').slice(-1)[0];
          if (lastMessage?.text) {
              showToast(t('toastReading'));
              textToSpeech(lastMessage.text);
          } else {
              showToast(t('toastNoMessage'));
          }
      },
      setDarkMode: () => { if (theme !== 'dark') { toggleTheme(); showToast(t('toastDarkMode')); } },
      setLightMode: () => { if (theme !== 'light') { toggleTheme(); showToast(t('toastLightMode')); } },
      switchToLiveMode: () => {
        setCurrentMode('live');
        showToast('Switching to Live Conversation mode.');
      },
      toggleCamera: async () => {
          if (currentMode !== 'live') {
              setCurrentMode('live');
              showToast(t('toastSwitchedToLive'));
              // Give the component a moment to mount before trying to toggle the camera
              setTimeout(() => {
                 liveConversationRef.current?.triggerCameraToggle().then(isOn => {
                    showToast(isOn ? t('toastCameraOn') : t('toastCameraOff'));
                 });
              }, 500);
          } else {
              const cameraIsOn = await liveConversationRef.current?.triggerCameraToggle();
              showToast(cameraIsOn ? t('toastCameraOn') : t('toastCameraOff'));
          }
      },
      analyzeImage: () => {
          if (currentMode !== 'live') {
              showToast(t('toastNotInLiveMode'));
              return;
          }
          const success = liveConversationRef.current?.triggerFrameCapture();
          if (success) {
              showToast(t('toastAnalyzing'));
          } else {
              showToast(t('toastCameraNotOn'));
          }
      }
  }), [createNewChat, activeConversation, showToast, t, theme, toggleTheme, currentMode]);

  const { isListening: isVoiceCommandListening, startListening, stopListening, isCommandSupported } = useVoiceCommands(commands, language, t, showToast);

  const handleToggleVoiceCommand = () => {
    isVoiceCommandListening ? stopListening() : startListening();
  };

  // Check for a shareId in the URL
  const urlParams = new URLSearchParams(window.location.search);
  const shareId = urlParams.get('shareId');

  if (shareId) {
    return <SharedConversationView shareId={shareId} />;
  }
  
  const renderCurrentMode = () => {
    switch (currentMode) {
      case 'chat':
        if (activeConversation) {
           return <ChatInterface
              messages={activeConversation.messages}
              isLoading={activeConversation.messages.some(m => m.isProcessing)}
              sendMessage={handleSendMessage}
              attachedFiles={attachedFiles}
              setAttachedFiles={setAttachedFiles}
              aspectRatio={aspectRatio}
              setAspectRatio={setAspectRatio}
              retryMessage={handleRetryMessage}
              stopGeneration={stopGeneration}
              onFileForNewChat={handleFileForNewChat}
              onShowToast={showToast}
            />
        }
        return <div className="flex-1 flex items-center justify-center"><LoadingIndicator className="h-8 w-8 text-teal-600" /></div>;
      case 'live':
        return <LiveConversation ref={liveConversationRef} />;
      case 'analyzer':
        return <HealthReportAnalyzer onShowToast={showToast} />;
      case 'hub':
        return <HealthHub />;
      case 'dashboard':
        return <Dashboard />;
      default:
        return null;
    }
  }


  return (
    <div className={`flex h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans antialiased overflow-hidden ${theme}`}>
      <Sidebar
        conversations={conversations}
        activeConversationId={activeConversation?.id || null}
        onNewChat={createNewChat}
        onSelectChat={selectConversation}
        onDeleteChat={deleteConversation}
        onRenameChat={renameConversation}
        isOpen={sidebarIsOpen}
        setIsOpen={setSidebarIsOpen}
        isFetching={isFetching}
        onShowToast={showToast}
        currentMode={currentMode}
      />
      <main className="flex-1 flex flex-col h-full">
        <Header
          sidebarIsOpen={sidebarIsOpen}
          setSidebarIsOpen={setSidebarIsOpen}
          toggleTheme={toggleTheme}
          isTtsEnabled={isTtsEnabled}
          setIsTtsEnabled={setIsTtsEnabled}
          isTtsSupported={isTtsSupported}
          onPersonaClick={() => setIsPersonaModalOpen(true)}
          model={model} setModel={setModel}
          useSearch={useSearch} setUseSearch={setUseSearch}
          useMaps={useMaps} setUseMaps={setUseMaps}
          useClinicFinder={useClinicFinder} setUseClinicFinder={setUseClinicFinder}
          useKnowledgeBase={useKnowledgeBase} setUseKnowledgeBase={setUseKnowledgeBase}
          locationError={locationError}
          setMode={setCurrentMode}
          currentMode={currentMode}
          isVoiceCommandListening={isVoiceCommandListening}
          onToggleVoiceCommand={handleToggleVoiceCommand}
          isVoiceCommandSupported={isCommandSupported}
          currentLanguage={language}
          setLanguage={setLanguage}
          onExportConversation={handleExportConversation}
          isExportDisabled={currentMode !== 'chat' || !activeConversation || activeConversation.messages.length <= 1}
          onShareConversation={handleShareConversation}
          isShareDisabled={currentMode !== 'chat' || !user || !activeConversation || activeConversation.messages.length <= 1}
          onSosClick={handleSosClick}
        />

        {renderCurrentMode()}
      </main>
      
      <PersonaModal
        isOpen={isPersonaModalOpen}
        onClose={() => setIsPersonaModalOpen(false)}
        onSave={handlePersonaSave}
        currentInstruction={activeConversation?.systemInstruction || ''}
      />

      <ApiKeyNoticeModal 
        isOpen={isApiKeyModalOpen}
        onClose={() => setIsApiKeyModalOpen(false)}
        onConfirm={async () => {
          if ((window as any).aistudio) {
              await (window as any).aistudio.openSelectKey();
              // Assume success and let the user retry the action.
              setIsApiKeyModalOpen(false);
              showToast("API Key selected. Please try generating the video again.");
          }
        }}
      />

      <ConfirmationModal
        isOpen={isDocConfirmOpen}
        onClose={() => setIsDocConfirmOpen(false)}
        onConfirm={confirmStartChatWithDoc}
        title={t('docConfirmTitle')}
        message={t('docConfirmMessage', { fileName: docToConfirm?.name || 'this document' })}
      />
      
      <EmergencyModal
        isOpen={isEmergencyModalOpen}
        onClose={() => setIsEmergencyModalOpen(false)}
        isLoading={isEmergencyLoading}
        error={emergencyError}
        result={emergencyResult}
        userLocation={currentUserLocationForSos}
      />

      <ShareModal 
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        isLoading={isSharing}
        shareLink={shareLink}
      />
      
      {toastMessage && (
          <Toast message={toastMessage} onClose={() => setToastMessage('')} />
      )}
    </div>
  );
};

export default App;