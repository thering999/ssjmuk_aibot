import { useState, useEffect, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Conversation, ChatMessage, ModelType, Geolocation, AttachedFile } from '../types';
import { generateText, generateFollowUpQuestions } from '../services/chatService';
import { generateImage, editImage } from '../services/imageService';
import { generateVideo, ApiKeyNotSelectedError } from '../services/videoService';
import { textToSpeech, stopTts } from '../services/ttsService';
import { fetchConversations, createConversation, updateConversation, removeConversation, User } from '../services/firebase';
import { searchKnowledgeBase } from '../services/knowledgeService';

const createNewConversation = (t: (key: string) => string, title?: string): Conversation => ({
    id: uuidv4(),
    title: title || t('newChatTitle'),
    messages: [{
        id: 'initial-welcome',
        sender: 'bot',
        text: t('welcomeMessage'),
        timestamp: Date.now(),
    }],
    createdAt: Date.now(),
    systemInstruction: '',
});

export const useChat = (
    model: ModelType,
    useSearch: boolean,
    useMaps: boolean,
    location: Geolocation | null,
    isTtsEnabled: boolean,
    useClinicFinder: boolean,
    useKnowledgeBase: boolean,
    user: User | null,
    t: (key: string, options?: any) => any,
) => {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
    const [isFetching, setIsFetching] = useState(true);

    const abortControllerRef = useRef<AbortController | null>(null);

    // Fetch conversations from Firebase on user change
    useEffect(() => {
        if (user) {
            setIsFetching(true);
            fetchConversations(user.uid)
                .then(fetchedConversations => {
                    if (fetchedConversations.length > 0) {
                        setConversations(fetchedConversations);
                        setActiveConversationId(fetchedConversations[0].id);
                    } else {
                        const newConv = createNewConversation(t);
                        setConversations([newConv]);
                        setActiveConversationId(newConv.id);
                        createConversation(user.uid, { ...newConv, messages: [] }); // Store empty conv
                    }
                })
                .catch(console.error)
                .finally(() => setIsFetching(false));
        } else {
            // Local mode for non-signed-in users
            const newConv = createNewConversation(t);
            setConversations([newConv]);
            setActiveConversationId(newConv.id);
            setIsFetching(false);
        }
    }, [user, t]);

    const activeConversation = conversations.find(c => c.id === activeConversationId);
    
    // --- Message Management ---
    const addMessage = useCallback((conversationId: string, message: ChatMessage) => {
        setConversations(prev =>
            prev.map(c =>
                c.id === conversationId ? { ...c, messages: [...c.messages, message] } : c
            )
        );
    }, []);

    const updateMessage = useCallback((conversationId: string, messageId: string, updates: Partial<ChatMessage>) => {
        setConversations(prev =>
            prev.map(c => {
                if (c.id !== conversationId) return c;
                const newMessages = c.messages.map(m => m.id === messageId ? { ...m, ...updates } : m);
                return { ...c, messages: newMessages };
            })
        );
    }, []);

    const updateActiveConversation = useCallback((updates: Partial<Conversation>) => {
        if (!activeConversationId) return;
        setConversations(prev =>
            prev.map(c =>
                c.id === activeConversationId ? { ...c, ...updates } : c
            )
        );
        if (user) {
            updateConversation(user.uid, activeConversationId, updates).catch(console.error);
        }
    }, [activeConversationId, user]);


    // --- Core Send Message Logic ---
    const sendMessage = useCallback(async (
        text: string,
        attachedFiles: AttachedFile[],
        aspectRatio: string,
        options?: { conversationId?: string; conversation?: Conversation }
    ) => {
        const convId = options?.conversationId || activeConversationId;
        let conv = options?.conversation;
        if (!conv) {
            conv = conversations.find(c => c.id === convId);
        }

        if (!convId || !conv) {
            console.error("sendMessage aborted: could not find conversation.");
            return;
        }

        stopTts();
        abortControllerRef.current = new AbortController();

        const userMessageId = uuidv4();
        const userMessage: ChatMessage = {
            id: userMessageId,
            sender: 'user',
            text,
            timestamp: Date.now(),
            attachedFiles
        };
        addMessage(convId, userMessage);
        
        const botMessageId = uuidv4();
        const botMessage: ChatMessage = {
            id: botMessageId,
            sender: 'bot',
            text: '',
            timestamp: Date.now(),
            isProcessing: true,
            responseTo: userMessageId,
        };
        addMessage(convId, botMessage);
        
        try {
            const singleFile = attachedFiles.length === 1 ? attachedFiles[0] : null;

            const imageGenTriggers = t('imageGenerationTriggers', { returnObjects: true }) as string[];
            const imageEditTriggers = t('imageEditingTriggers', { returnObjects: true }) as string[];
            const videoGenTriggers = t('videoGenerationTriggers', { returnObjects: true }) as string[];
            const lowerCaseText = text.toLowerCase();

            const isImageGeneration = imageGenTriggers.some(trigger => lowerCaseText.startsWith(trigger.toLowerCase()));
            const isVideoGeneration = videoGenTriggers.some(trigger => lowerCaseText.startsWith(trigger.toLowerCase()));
            
            let isImageEditing = false;
            let editPrompt = '';
            let imageEditTrigger = '';

            if (singleFile?.mimeType.startsWith("image/") && text) {
                const foundTrigger = imageEditTriggers.find(t => lowerCaseText.startsWith(t.toLowerCase()));
                if (foundTrigger) {
                    isImageEditing = true;
                    imageEditTrigger = foundTrigger;
                    editPrompt = text.substring(foundTrigger.length).trim();
                }
            }
            
            if (isImageGeneration) {
                updateMessage(convId, botMessageId, { mediaType: 'image' });
                const imageUrl = await generateImage(text, aspectRatio);
                updateMessage(convId, botMessageId, { isProcessing: false, imageUrl });
            } else if (isImageEditing) {
                updateMessage(convId, botMessageId, { mediaType: 'image' });
                const imageUrl = await editImage(editPrompt, singleFile!);
                updateMessage(convId, botMessageId, { isProcessing: false, imageUrl });
            } else if (isVideoGeneration) {
                updateMessage(convId, botMessageId, { mediaType: 'video' });
                const videoUrl = await generateVideo(text, singleFile, aspectRatio as any, (progressText) => {
                    updateMessage(convId, botMessageId, { progressText });
                });
                updateMessage(convId, botMessageId, { isProcessing: false, videoUrl });
            } else {
                const history = conv.messages
                    .filter(m => m.id !== 'initial-welcome' && m.id !== userMessageId && m.id !== botMessageId && !m.isError)
                    .slice(-10)
                    .map(m => ({
                        role: m.sender === 'user' ? 'user' : 'model',
                        parts: [{ text: m.text }]
                    }));
                
                let knowledgeContext: string | null = null;
                if (useKnowledgeBase) {
                    knowledgeContext = await searchKnowledgeBase(text, user);
                }

                updateMessage(convId, botMessageId, { isThinking: true });
                let fullResponseText = '';
                
                for await (const chunk of generateText(
                    text,
                    attachedFiles,
                    history,
                    model,
                    useSearch,
                    useMaps,
                    location,
                    useClinicFinder,
                    conv.systemInstruction,
                    knowledgeContext,
                    abortControllerRef.current.signal
                )) {
                    if (chunk.textChunk) {
                        fullResponseText += chunk.textChunk;
                        updateMessage(convId, botMessageId, { text: fullResponseText, isThinking: false });
                    }
                    if (chunk.sources) {
                        updateMessage(convId, botMessageId, { sources: chunk.sources });
                    }
                    if (chunk.toolUse) {
                        updateMessage(convId, botMessageId, { toolUse: chunk.toolUse, isThinking: false });
                    }
                }
                
                updateMessage(convId, botMessageId, { isProcessing: false });

                if (isTtsEnabled) {
                    textToSpeech(fullResponseText).catch(err => {
                        console.warn("TTS playback failed:", err);
                    });
                }

                 updateMessage(convId, botMessageId, { isGeneratingFollowUps: true });
                 generateFollowUpQuestions(text, fullResponseText)
                    .then(questions => {
                        updateMessage(convId, botMessageId, { followUpQuestions: questions, isGeneratingFollowUps: false });
                    })
                    .catch(err => {
                        let errorJson;
                        try { errorJson = JSON.parse(err.message); } catch (e) { errorJson = err; }

                        if (errorJson?.error?.status === 'RESOURCE_EXHAUSTED') {
                            console.warn("Could not generate follow-up questions due to API quota limit.");
                        } else {
                            // The raw error is already logged by the service, no need to log it again.
                        }
                        updateMessage(convId, botMessageId, { isGeneratingFollowUps: false });
                    });
            }
        } catch (error: any) {
            if (error.name !== 'AbortError') {
                 console.error("Error sending message:", error);

                 let errorMessage = t('errorOccurred'); // Default error message
                 let errorJson;
                 
                 try {
                     // The google-genai SDK might throw an error with a JSON string in the message
                     errorJson = JSON.parse(error.message);
                 } catch (e) {
                     // Or the error object itself might contain the structured details
                     errorJson = error;
                 }

                 if (errorJson?.error?.status === 'RESOURCE_EXHAUSTED') {
                     errorMessage = t('errorQuotaExceeded');
                 } else if (errorJson?.error?.message?.includes("violated Google's Responsible AI practices")) {
                    errorMessage = t('errorImageSafety');
                 } else if (errorJson?.error?.message) {
                     errorMessage = errorJson.error.message;
                 } else if (error.message) {
                     errorMessage = error.message;
                 }

                 updateMessage(convId, botMessageId, { isProcessing: false, isError: true, text: errorMessage });
                 if (error instanceof ApiKeyNotSelectedError) {
                    throw error;
                 }
            } else {
                 updateMessage(convId, botMessageId, { isProcessing: false, text: "Generation stopped." });
            }
        } finally {
            if (user) {
                setConversations(currentConversations => {
                    const finalConversation = currentConversations.find(c => c.id === convId);
                    if(finalConversation) {
                        let finalTitle = finalConversation.title;
                        const userMessages = finalConversation.messages.filter(m => m.sender === 'user');
                        if (finalConversation.title === t('newChatTitle') && userMessages.length > 0) {
                             finalTitle = userMessages[0].text.substring(0, 40) || t('untitledChat');
                        }
                        
                        const convToSave = { ...finalConversation, title: finalTitle };
                        updateConversation(user.uid, convId, convToSave).catch(console.error);
                        return currentConversations.map(c => c.id === convId ? convToSave : c);
                    }
                    return currentConversations;
                });
            }
        }
    }, [
        activeConversationId, conversations, addMessage, updateMessage, model,
        useSearch, useMaps, location, isTtsEnabled, useClinicFinder, useKnowledgeBase, user, t
    ]);

    const retryMessage = (failedBotMessageId: string) => {
        const messageToRetry = activeConversation?.messages.find(m => m.id === failedBotMessageId);
        const originalUserMessage = activeConversation?.messages.find(m => m.id === messageToRetry?.responseTo);
        if (messageToRetry && originalUserMessage) {
            setConversations(prev =>
                prev.map(c =>
                    c.id === activeConversationId
                        ? { ...c, messages: c.messages.filter(m => m.id !== failedBotMessageId) }
                        : c
                )
            );
            sendMessage(originalUserMessage.text, originalUserMessage.attachedFiles || [], '1:1');
        }
    };

    const stopGeneration = () => {
        abortControllerRef.current?.abort();
    };
    
    // --- Conversation Management ---
    const createNewChat = useCallback(() => {
        const newConv = createNewConversation(t);
        setConversations(prev => [newConv, ...prev]);
        setActiveConversationId(newConv.id);
        if (user) {
            createConversation(user.uid, { ...newConv, messages: [] }).catch(console.error);
        }
    }, [user, t]);
    
    const startChatWithDocument = useCallback(async (file: AttachedFile) => {
        const newConv = createNewConversation(t, file.name);
        setConversations(prev => [newConv, ...prev]);
        setActiveConversationId(newConv.id);
        
        if (user) {
            // Ensure the conversation document exists in Firestore before proceeding.
            await createConversation(user.uid, { ...newConv, messages: [] });
        }

        await sendMessage(
            "Summarize this document, identify the key topics, and provide 3-5 important takeaways.",
            [file],
            '1:1', // Default aspect ratio, not used for doc analysis
            // Pass the new conversation object to bypass stale state in sendMessage
            { conversationId: newConv.id, conversation: newConv }
        );
    }, [t, sendMessage, user]);

    const deleteConversation = useCallback((id: string) => {
        const remainingConvs = conversations.filter(c => c.id !== id);
        setConversations(remainingConvs);
        
        if (id === activeConversationId) {
            if (remainingConvs.length > 0) {
                setActiveConversationId(remainingConvs[0].id);
            } else {
                createNewChat();
            }
        }
        if (user) {
            removeConversation(user.uid, id).catch(console.error);
        }
    }, [activeConversationId, conversations, createNewChat, user]);

    const renameConversation = useCallback((id: string, newTitle: string) => {
        updateActiveConversation({ title: newTitle });
    }, [updateActiveConversation]);

    const selectConversation = useCallback((id: string) => {
        setActiveConversationId(id);
    }, []);

    const updateSystemInstruction = useCallback((id: string, instruction: string) => {
        updateActiveConversation({ systemInstruction: instruction });
    }, [updateActiveConversation]);

    return {
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
    };
};