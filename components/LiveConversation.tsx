import React, { useState, useEffect, useRef, memo, useCallback, forwardRef, useImperativeHandle } from 'react';
import { Modality, LiveServerMessage } from '@google/genai';
import { v4 as uuidv4 } from 'uuid';
import { encode, decode, decodeAudioData } from '../utils/audioUtils';
import { fileToBase64, processFiles, SUPPORTED_GENERATE_CONTENT_MIME_TYPES } from '../utils/fileUtils';
import { useTranslation } from '../hooks/useTranslation';
import { useAuth } from '../hooks/useAuth';
import { ai } from '../services/geminiService';
import { clinicFinderTool } from '../tools/clinicFinder';
import { outputGenerationTools } from '../tools/outputGenerationTools';
import { browserTools } from '../tools/browserTools';
import { getClinicInfo } from '../services/clinicService';
import { LiveTimelineEvent, LiveConversationHandle, UserProfile, AiVoice, LiveMode, UserSpeechEvent, UserActionEvent, BotSpeechEvent, ToolCallEvent, SystemMessageEvent } from '../types';
import { getUserProfile, updateUserProfile, type User } from '../services/firebase';
import { userProfileTool } from '../tools/healthProfileTool';
import { generateImageViaProxy } from '../services/liveProxyService';
import LoadingIndicator from './LoadingIndicator';
import Waveform from './Waveform';
import { LiveEventCard } from './LiveEventCard';


interface Blob {
    data: string; // base64 encoded string
    mimeType: string;
}

interface LiveConversationProps {
    onShowToast: (message: string) => void;
    user: User | null;
}

const liveModeSystemInstructions: Record<LiveMode, string> = {
    'General': "You are a proactive and intelligent health companion. Your goal is to be as helpful as possible. Use your tools like searching the web, opening websites, creating images, and remembering user health details to provide a comprehensive and personalized experience. When you use a tool, inform the user what you are doing.",
    'First Aid Assistant': "You are an AI First Aid Assistant. Your primary goal is to provide clear, calm, and step-by-step first aid instructions. Speak slowly and concisely. Prioritize safety. Start by advising the user to call emergency services if the situation is serious. Do not use tools unless absolutely necessary to identify something in an image for the user.",
    'Fitness Coach': "You are a friendly and encouraging AI Fitness Coach. Guide the user through simple exercises, stretches, or mindfulness activities. Keep your instructions positive and motivational. You can use a conversational tone."
};

// @google/genai-fix: Define a specific payload type for addEvent to help TypeScript's discriminated union inference.
type AddEventPayload =
    | Omit<UserSpeechEvent, 'id' | 'timestamp'>
    | Omit<UserActionEvent, 'id' | 'timestamp'>
    | Omit<BotSpeechEvent, 'id' | 'timestamp'>
    | Omit<ToolCallEvent, 'id' | 'timestamp'>
    | Omit<SystemMessageEvent, 'id' | 'timestamp'>;


const LiveConversation = forwardRef<LiveConversationHandle, LiveConversationProps>(({ onShowToast, user }, ref) => {
    const { t } = useTranslation();
    const [isConnecting, setIsConnecting] = useState(true);
    const [isActive, setIsActive] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [timelineEvents, setTimelineEvents] = useState<LiveTimelineEvent[]>([]);
    const [currentInput, setCurrentInput] = useState('');
    const [currentOutput, setCurrentOutput] = useState('');
    const [isCameraOn, setIsCameraOn] = useState(false);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [textInputValue, setTextInputValue] = useState('');
    const [selectedVoice, setSelectedVoice] = useState<AiVoice>('Zephyr');
    const [selectedMode, setSelectedMode] = useState<LiveMode>('General');

    const sessionRef = useRef<any | null>(null);
    const sessionPromiseRef = useRef<Promise<any> | null>(null);
    const inputAudioContextRef = useRef<AudioContext | null>(null);
    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const audioStreamRef = useRef<MediaStream | null>(null);
    const videoStreamRef = useRef<MediaStream | null>(null);
    const videoElRef = useRef<HTMLVideoElement>(null);
    const canvasElRef = useRef<HTMLCanvasElement>(null);
    const audioProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const frameIntervalRef = useRef<number | null>(null);
    const nextStartTime = useRef(0);
    const sourcesRef = useRef(new Set<AudioBufferSourceNode>());
    const currentInputText = useRef('');
    const currentOutputText = useRef('');
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const isInitialMount = useRef(true);

    // @google/genai-fix: Correctly type the event payload for the addEvent function.
    const addEvent = (event: AddEventPayload) => {
        setTimelineEvents(prev => [...prev, { ...event, id: uuidv4(), timestamp: Date.now() } as LiveTimelineEvent]);
    };
    
    const updateToolEvent = (callId: string, status: 'success' | 'error', result: any) => {
        setTimelineEvents(prev => prev.map(e => 
            (e.type === 'tool_call' && e.call.id === callId) ? { ...e, status, result } : e
        ));
    };

    const cleanup = useCallback((isReconnecting = false) => {
        if (!isReconnecting) {
            // @google/genai-fix: Fix for discriminated union type error.
            addEvent({ type: 'system_message', message: 'Session ended.' });
        }
        sessionRef.current?.close();
        sessionRef.current = null;
        
        audioStreamRef.current?.getTracks().forEach(track => track.stop());
        videoStreamRef.current?.getTracks().forEach(track => track.stop());
        
        if (inputAudioContextRef.current?.state !== 'closed') inputAudioContextRef.current?.close().catch(console.error);
        if (outputAudioContextRef.current?.state !== 'closed') outputAudioContextRef.current?.close().catch(console.error);
        
        audioProcessorRef.current?.disconnect();
        if (frameIntervalRef.current) window.clearInterval(frameIntervalRef.current);
        
        setIsActive(false);
        setIsCameraOn(false);
    }, []);

    const connect = useCallback(async () => {
        setIsConnecting(true);
        setError(null);
        
        if (user) {
            try {
                const profile = await getUserProfile(user.uid);
                setUserProfile(profile);
            } catch (err: unknown) {
                console.warn("Could not fetch user health profile:", err);
            }
        }

        const createBlob = (data: Float32Array): Blob => {
          const l = data.length;
          const int16 = new Int16Array(l);
          for (let i = 0; i < l; i++) int16[i] = data[i] * 32768;
          return { data: encode(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' };
        };

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            audioStreamRef.current = stream;

            inputAudioContextRef.current = new ((window as any).AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            outputAudioContextRef.current = new ((window as any).AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            
            // Temporarily remove tools and system instruction to debug "Internal error".
            // const functionDeclarations = [clinicFinderTool, userProfileTool];
            // const tools = [{ functionDeclarations }];
            
            // let systemInstruction = liveModeSystemInstructions[selectedMode];
            // if (userProfile) {
            //     systemInstruction += `\n\n[User Profile]\nRemember and use these details about the user:\n${JSON.stringify(userProfile, null, 2)}`;
            // }
            
            const sessionPromise = ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                config: {
                    responseModalities: [Modality.AUDIO],
                    inputAudioTranscription: {},
                    outputAudioTranscription: {},
                    // tools,
                    // systemInstruction,
                    speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: selectedVoice } } },
                },
                callbacks: {
                    onopen: () => {
                        setIsConnecting(false);
                        setIsActive(true);
                        const source = inputAudioContextRef.current!.createMediaStreamSource(stream);
                        const processor = inputAudioContextRef.current!.createScriptProcessor(4096, 1, 1);
                        audioProcessorRef.current = processor;
                        processor.onaudioprocess = (e) => {
                            const inputData = e.inputBuffer.getChannelData(0);
                            const pcmBlob: Blob = createBlob(inputData);
                            sessionPromise.then(session => session.sendRealtimeInput({ media: pcmBlob }));
                        };
                        source.connect(processor);
                        processor.connect(inputAudioContextRef.current!.destination);
                    },
                    onmessage: async (message: LiveServerMessage) => {
                        if (message.serverContent?.outputTranscription) {
                            currentOutputText.current += message.serverContent.outputTranscription.text;
                            setCurrentOutput(currentOutputText.current);
                        }
                        if (message.serverContent?.inputTranscription) {
                            currentInputText.current += message.serverContent.inputTranscription.text;
                            setCurrentInput(currentInputText.current);
                        }
                        if (message.serverContent?.turnComplete) {
                            // @google/genai-fix: Fix for discriminated union type error.
                            if (currentInputText.current.trim()) addEvent({ type: 'user_speech', text: currentInputText.current.trim() });
                            // @google/genai-fix: Fix for discriminated union type error.
                            if (currentOutputText.current.trim()) addEvent({ type: 'bot_speech', text: currentOutputText.current.trim() });
                            
                            currentInputText.current = '';
                            currentOutputText.current = '';
                            setCurrentInput('');
                            setCurrentOutput('');
                        }

                        const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
                        if (base64Audio) {
                            const outputCtx = outputAudioContextRef.current!;
                            nextStartTime.current = Math.max(nextStartTime.current, outputCtx.currentTime);
                            const audioBuffer = await decodeAudioData(decode(base64Audio), outputCtx, 24000, 1);
                            const source = outputCtx.createBufferSource();
                            source.buffer = audioBuffer;
                            source.connect(outputCtx.destination);
                            source.addEventListener('ended', () => sourcesRef.current.delete(source));
                            source.start(nextStartTime.current);
                            nextStartTime.current += audioBuffer.duration;
                            sourcesRef.current.add(source);
                        }
                        
                        if (message.serverContent?.interrupted) {
                            for (const source of sourcesRef.current.values()) source.stop();
                            sourcesRef.current.clear();
                            nextStartTime.current = 0;
                            // @google/genai-fix: Fix for discriminated union type error.
                            addEvent({ type: 'system_message', message: 'Interrupted by user' });
                        }
                        
                        if (message.toolCall) {
                            for (const fc of message.toolCall.functionCalls) {
                                // @google/genai-fix: The `id` is optional on the incoming `FunctionCall` but required by our internal types to track tool calls. We must check for its existence before proceeding.
                                if (!fc.id) {
                                    console.warn("Tool call received without an ID, skipping.", fc);
                                    continue;
                                }
                                // @google/genai-fix: Fix for discriminated union type error. Construct the `call` object explicitly to satisfy the stricter `ToolCallEvent` type which requires an `id`.
                                addEvent({ type: 'tool_call', call: {id: fc.id, name: fc.name, args: fc.args}, status: 'pending' });
                                let result: any = { success: true };
                                let error: Error | null = null;

                                try {
                                    // @google/genai-fix: Ensure argument is a string as expected by the function.
                                    if (fc.name === 'getClinicInfo') result = await getClinicInfo(String(fc.args.location));
                                    else if (fc.name === 'rememberUserDetails' && user) {
                                        // @google/genai-fix: Cast arguments to the expected type for safety.
                                        result = await updateUserProfile(user.uid, fc.args as Partial<UserProfile>);
                                        setUserProfile(prev => ({...(prev || {}), ...(fc.args as Partial<UserProfile>)}));
                                    } else if (fc.name === 'openWebsite') {
                                        const url = fc.args.url;
                                        // @google/genai-fix: Ensure argument is a string as expected by the function.
                                        if (url && (String(url).startsWith('http:') || String(url).startsWith('https://'))) {
                                            window.open(String(url), '_blank');
                                            result = { success: true, message: `Opened ${url}` };
                                        } else result = { success: false, message: `Invalid URL: ${url}` };
                                    } else if (fc.name === 'generateImage') {
                                        // @google/genai-fix: Ensure argument is a string as expected by the function.
                                        const imageUrl = await generateImageViaProxy(String(fc.args.prompt));
                                        // @google/genai-fix: Fix for discriminated union type error.
                                        addEvent({ type: 'bot_speech', text: `Generated an image:`, imageUrl });
                                        result = { success: true, message: "Image generated and displayed to user." };
                                    } else if (fc.name === 'createDocument') {
                                        const args = fc.args as any;
                                        const blob = new Blob([String(args.content)], { type: 'text/plain;charset=utf-8' });
                                        const dataUrl = URL.createObjectURL(blob);
                                        // @google/genai-fix: Fix for discriminated union type error.
                                        addEvent({ type: 'bot_speech', text: `Created a document for you:`, document: { fileName: String(args.fileName ?? 'document.txt'), dataUrl } });
                                        result = { success: true, message: "Document created and displayed to user." };
                                    }
                                } catch(e: unknown) {
                                    error = e instanceof Error ? e : new Error(String(e));
                                    result = error.message;
                                }
                                
                                updateToolEvent(fc.id, error ? 'error' : 'success', result);
                                sessionPromise.then(session => session.sendToolResponse({ functionResponses: { id: fc.id, name: fc.name, response: { result } } }));
                            }
                        }
                    },
                    onerror: (e: any) => {
                        console.error('Live session error:', e);
                        let msg = e?.message ? String(e.message) : t('liveErrorConnection');
                        if (msg.includes('Deadline expired')) msg = "Connection timed out. Please try again.";
                        setError(msg);
                        cleanup();
                    },
                    onclose: () => {
                        console.log('Live session closed.');
                        cleanup();
                    },
                }
            });
            sessionPromiseRef.current = sessionPromise;
            sessionRef.current = await sessionPromise;
        } catch (err: unknown) {
            console.error("Failed to start live session:", err);
            let msg = t('liveErrorConnection');
            if (err instanceof Error) {
                if (err.name === 'NotAllowedError' || err.name === 'NotFoundError') msg = t('liveErrorMic');
                else if (err.message.includes("API key not valid")) msg = t('liveApiKeyErrorInitial');
                else if (err.message.includes("Invalid API key")) msg = t('liveApiKeyErrorInvalid');
                else if (err.message) msg = err.message;
            } else if (typeof err === 'string') msg = err;
            setError(msg);
            setIsConnecting(false);
            cleanup();
        }
    }, [cleanup, t, user, userProfile, selectedVoice, selectedMode]);
    
    // Effect to handle reconnecting when settings change
    useEffect(() => {
        if (isInitialMount.current) {
            isInitialMount.current = false;
            connect(); // Initial connection
        } else {
            cleanup(true); // Cleanup previous session before reconnecting
            connect();
        }
        return () => {
             // Only run full cleanup on component unmount
            if (!isInitialMount.current) {
                cleanup();
            }
        };
    }, [connect, cleanup, selectedVoice, selectedMode]);


    const toggleCamera = async (): Promise<boolean> => {
        if (isCameraOn) {
            videoStreamRef.current?.getTracks().forEach(track => track.stop());
            if (frameIntervalRef.current) window.clearInterval(frameIntervalRef.current);
            setIsCameraOn(false);
            return false;
        } else {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
                videoStreamRef.current = stream;
                if (videoElRef.current) videoElRef.current.srcObject = stream;
                setIsCameraOn(true);
                startFrameStreaming();
                return true;
            } catch (err) {
                console.error("Camera error:", err);
                setError(t('liveCameraError'));
                return false;
            }
        }
    };

    const startFrameStreaming = () => {
        if (frameIntervalRef.current) window.clearInterval(frameIntervalRef.current);
        const FRAME_RATE = 1;
        frameIntervalRef.current = window.setInterval(() => {
            const canvas = canvasElRef.current, video = videoElRef.current;
            if (canvas && video && sessionPromiseRef.current) {
                const ctx = canvas.getContext('2d');
                if (!ctx) return;
                canvas.width = video.videoWidth; canvas.height = video.videoHeight;
                ctx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
                canvas.toBlob(async (blob) => {
                    if (blob) {
                        const base64 = await fileToBase64(new File([blob], "frame.jpeg", { type: 'image/jpeg' }));
                        sessionPromiseRef.current!.then(session => session.sendRealtimeInput({ media: { data: base64, mimeType: 'image/jpeg' } }));
                    }
                }, 'image/jpeg', 0.8);
            }
        }, 1000 / FRAME_RATE);
    };

    const captureFrame = (): boolean => {
        if (!isCameraOn || !canvasElRef.current || !videoElRef.current) return false;
        const canvas = canvasElRef.current, video = videoElRef.current, ctx = canvas.getContext('2d');
        if (!ctx) return false;
        canvas.width = video.videoWidth; canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        // @google/genai-fix: Fix for discriminated union type error.
        addEvent({ type: 'user_action', description: 'Captured an image for analysis.', imageUrl: dataUrl });
        return true;
    };
    
    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !sessionPromiseRef.current) return;
        try {
            const processedFiles = await processFiles([file], SUPPORTED_GENERATE_CONTENT_MIME_TYPES, (fileName, fileType) => onShowToast(t('toastUnsupportedFile', { fileName, fileType })));
            if (processedFiles.length > 0) {
                const attachedFile = processedFiles[0];
                const session = await sessionPromiseRef.current;
                if (attachedFile.textContent) {
                    session.sendRealtimeInput({ text: `Context from ${attachedFile.name}:\n${attachedFile.textContent}` });
                } else if (attachedFile.base64) {
                    session.sendRealtimeInput({ media: { data: attachedFile.base64, mimeType: attachedFile.mimeType } });
                }
                // @google/genai-fix: Fix for discriminated union type error.
                addEvent({ type: 'user_action', description: `Attached a file: ${attachedFile.name}`, fileName: attachedFile.name });
            }
        } catch (err) {
            console.error("Error processing/sending file:", err);
            onShowToast("Failed to process the selected file.");
        }
        e.target.value = '';
    };
    
    const handleSendTextInput = (e: React.FormEvent) => {
        e.preventDefault();
        if (textInputValue.trim() && sessionPromiseRef.current) {
            sessionPromiseRef.current.then(session => session.sendRealtimeInput({ text: textInputValue }));
            // @google/genai-fix: Fix for discriminated union type error.
            addEvent({ type: 'user_speech', text: textInputValue.trim() });
            setTextInputValue('');
        }
    };

    useImperativeHandle(ref, () => ({
        triggerCameraToggle: toggleCamera,
        triggerFrameCapture: captureFrame,
    }));

    if (isConnecting) return <div className="flex-1 flex flex-col items-center justify-center p-4"><LoadingIndicator className="h-8 w-8 text-teal-600 mb-4" /><p className="text-gray-600 dark:text-gray-400">{t('liveConnecting')}</p></div>;
    
    if (error) return <div className="flex-1 flex flex-col items-center justify-center p-4 text-center"><div className="bg-red-50 dark:bg-red-900/20 p-6 rounded-lg max-w-lg"><h3 className="text-lg font-bold text-red-700 dark:text-red-200">{t('liveErrorConnection')}</h3><p className="mt-2 text-sm text-red-600 dark:text-red-300">{error}</p><button onClick={connect} className="mt-4 px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-md hover:bg-teal-700">{t('clickToRetry')}</button></div></div>;

    return (
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 p-4 overflow-hidden">
             <div className="flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg p-4 relative">
                <video ref={videoElRef} autoPlay playsInline muted className={`w-full h-full object-contain rounded-md transition-opacity ${isCameraOn ? 'opacity-100' : 'opacity-0'}`}></video>
                <canvas ref={canvasElRef} className="hidden"></canvas>
                <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept={SUPPORTED_GENERATE_CONTENT_MIME_TYPES.join(',')}/>
                {!isCameraOn && <div className="absolute text-gray-500">{t('liveCameraError')}</div>}
                <div className="absolute bottom-4 flex space-x-2">
                     <button onClick={toggleCamera} aria-label={isCameraOn ? 'Stop camera' : 'Start camera'} className="px-4 py-2 text-sm font-semibold bg-white/80 dark:bg-black/50 backdrop-blur-sm rounded-full hover:bg-white dark:hover:bg-black/70 flex items-center space-x-2"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg><span>{isCameraOn ? t('liveStopCamera') : t('liveStartCamera')}</span></button>
                     {isCameraOn && <button onClick={captureFrame} aria-label="Capture frame" className="px-4 py-2 text-sm font-semibold bg-white/80 dark:bg-black/50 backdrop-blur-sm rounded-full hover:bg-white dark:hover:bg-black/70 flex items-center space-x-2"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2-2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg><span>{t('liveCaptureFrame')}</span></button>}
                     <button onClick={() => fileInputRef.current?.click()} aria-label="Attach file" className="px-4 py-2 text-sm font-semibold bg-white/80 dark:bg-black/50 backdrop-blur-sm rounded-full hover:bg-white dark:hover:bg-black/70 flex items-center space-x-2"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg><span>Attach File</span></button>
                </div>
             </div>
            <div className="flex flex-col bg-white dark:bg-gray-800 rounded-lg p-4 overflow-hidden">
                <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                        <label htmlFor="voice-select" className="block text-xs font-medium text-gray-500 dark:text-gray-400">AI Voice</label>
                        <select id="voice-select" value={selectedVoice} onChange={e => setSelectedVoice(e.target.value as AiVoice)} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm rounded-md bg-white dark:bg-gray-700 dark:border-gray-600">
                            {(['Zephyr', 'Puck', 'Charon', 'Kore', 'Fenrir'] as AiVoice[]).map(v => <option key={v} value={v}>{v}</option>)}
                        </select>
                    </div>
                     <div>
                        <label htmlFor="mode-select" className="block text-xs font-medium text-gray-500 dark:text-gray-400">Conversation Mode</label>
                        <select id="mode-select" value={selectedMode} onChange={e => setSelectedMode(e.target.value as LiveMode)} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm rounded-md bg-white dark:bg-gray-700 dark:border-gray-600">
                           {(['General', 'First Aid Assistant', 'Fitness Coach'] as LiveMode[]).map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                    </div>
                </div>

                <div className="flex-1 flex flex-col-reverse overflow-y-auto pr-2 space-y-4 space-y-reverse">
                     {/* Current turn */}
                     <div className="border-t border-gray-200 dark:border-gray-700 pt-3 mt-3">
                        {currentInput && <p className="font-bold text-sm text-gray-500 dark:text-gray-400">{t('you')}: <span className="font-normal">{currentInput}</span></p>}
                        {currentOutput && <p className="font-bold text-sm text-teal-600 dark:text-teal-400">{t('bot')}: <span className="font-normal">{currentOutput}</span></p>}
                    </div>
                    {[...timelineEvents].reverse().map((event) => <LiveEventCard key={event.id} event={event} />)}
                </div>
                 <form onSubmit={handleSendTextInput} className="mt-4 flex items-center space-x-2">
                    <input type="text" value={textInputValue} onChange={(e) => setTextInputValue(e.target.value)} placeholder="Type a message..." className="flex-1 w-full bg-gray-100 dark:bg-gray-700 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm" />
                    <button type="submit" className="p-2 rounded-full bg-teal-600 text-white hover:bg-teal-700"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h14M12 5l7 7-7 7" /></svg></button>
                 </form>
                 <div className="flex flex-col items-center mt-4"><p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{isActive ? t('liveListening') : t('liveSessionEnded')}</p><Waveform audioContext={inputAudioContextRef.current} mediaStream={audioStreamRef.current} isActive={isActive} /></div>
            </div>
        </div>
    );
});

export default memo(LiveConversation);