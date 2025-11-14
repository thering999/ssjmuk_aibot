import React, { useState, useEffect, useRef, memo, useCallback, forwardRef, useImperativeHandle } from 'react';
import { Modality, LiveServerMessage, FunctionDeclaration } from '@google/genai';
import { encode, decode, decodeAudioData } from '../utils/audioUtils';
import { fileToBase64, processFiles, SUPPORTED_GENERATE_CONTENT_MIME_TYPES } from '../utils/fileUtils';
import { useTranslation } from '../hooks/useTranslation';
import { useAuth } from '../hooks/useAuth';
import { ai } from '../services/geminiService';
import { clinicFinderTool } from '../tools/clinicFinder';
import { outputGenerationTools } from '../tools/outputGenerationTools';
import { browserTools } from '../tools/browserTools';
import { getClinicInfo } from '../services/clinicService';
import { LiveTranscript, LiveConversationHandle, UserProfile } from '../types';
import { getUserProfile, updateUserProfile, type User } from '../services/firebase';
import { userProfileTool } from '../tools/healthProfileTool';
import { generateImageViaProxy } from '../services/liveProxyService';
import LoadingIndicator from './LoadingIndicator';
import Waveform from './Waveform';

interface Blob {
    data: string; // base64 encoded string
    mimeType: string;
}

interface LiveConversationProps {
    onShowToast: (message: string) => void;
    user: User | null;
}

const LiveConversation = forwardRef<LiveConversationHandle, LiveConversationProps>(({ onShowToast, user }, ref) => {
    const { t } = useTranslation();
    const [isConnecting, setIsConnecting] = useState(true);
    const [isActive, setIsActive] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [transcripts, setTranscripts] = useState<LiveTranscript[]>([]);
    const [currentInput, setCurrentInput] = useState('');
    const [currentOutput, setCurrentOutput] = useState('');
    const [isCameraOn, setIsCameraOn] = useState(false);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [textInputValue, setTextInputValue] = useState('');

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
    const currentCapturedImage = useRef<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const currentAttachmentName = useRef<string | null>(null);
    const currentGeneratedImage = useRef<string | null>(null);
    const currentGeneratedDocument = useRef<{fileName: string, dataUrl: string} | null>(null);
    const currentToolCalls = useRef<any[]>([]);

    const cleanup = useCallback(() => {
        sessionRef.current?.close();
        sessionRef.current = null;
        
        audioStreamRef.current?.getTracks().forEach(track => track.stop());
        videoStreamRef.current?.getTracks().forEach(track => track.stop());
        
        if (inputAudioContextRef.current?.state !== 'closed') {
            inputAudioContextRef.current?.close().catch(console.error);
        }
        if (outputAudioContextRef.current?.state !== 'closed') {
            outputAudioContextRef.current?.close().catch(console.error);
        }
        audioProcessorRef.current?.disconnect();
        if (frameIntervalRef.current) {
            window.clearInterval(frameIntervalRef.current);
        }
        
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
            } catch (err) {
                console.warn("Could not fetch user health profile:", err);
            }
        }

        const createBlob = (data: Float32Array): Blob => {
          const l = data.length;
          const int16 = new Int16Array(l);
          for (let i = 0; i < l; i++) {
            int16[i] = data[i] * 32768;
          }
          return {
            data: encode(new Uint8Array(int16.buffer)),
            mimeType: 'audio/pcm;rate=16000',
          };
        };

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            audioStreamRef.current = stream;

            inputAudioContextRef.current = new ((window as any).AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            outputAudioContextRef.current = new ((window as any).AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            
            const functionDeclarations = [
                clinicFinderTool, 
                userProfileTool, 
                ...outputGenerationTools,
                ...browserTools,
            ];

            const tools = [{ googleSearch: {} }, { functionDeclarations }];
            
            let systemInstruction = "You are a proactive and intelligent health companion. Your goal is to be as helpful as possible. Use your tools like searching the web, opening websites, creating images, and remembering user health details to provide a comprehensive and personalized experience. When you use a tool, inform the user what you are doing.";
            if (userProfile) {
                systemInstruction += `\n\n[User Profile]\nRemember and use these details about the user:\n${JSON.stringify(userProfile, null, 2)}`;
            }
            
            const sessionPromise = ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                config: {
                    responseModalities: [Modality.AUDIO],
                    inputAudioTranscription: {},
                    outputAudioTranscription: {},
                    tools,
                    systemInstruction: systemInstruction,
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
                            const finalInput = currentInputText.current;
                            const finalOutput = currentOutputText.current;
                            setTranscripts(prev => [...prev, { 
                                user: finalInput, 
                                bot: finalOutput, 
                                userImage: currentCapturedImage.current, 
                                attachmentName: currentAttachmentName.current,
                                generatedImageUrl: currentGeneratedImage.current,
                                generatedDocument: currentGeneratedDocument.current,
                                toolCalls: currentToolCalls.current,
                            }]);
                            currentInputText.current = '';
                            currentOutputText.current = '';
                            currentCapturedImage.current = null;
                            currentAttachmentName.current = null;
                            currentGeneratedImage.current = null;
                            currentGeneratedDocument.current = null;
                            currentToolCalls.current = [];
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
                            source.addEventListener('ended', () => {
                                sourcesRef.current.delete(source);
                            });
                            source.start(nextStartTime.current);
                            nextStartTime.current += audioBuffer.duration;
                            sourcesRef.current.add(source);
                        }
                        
                        const interrupted = message.serverContent?.interrupted;
                        if (interrupted) {
                            for (const source of sourcesRef.current.values()) {
                                source.stop();
                                sourcesRef.current.delete(source);
                            }
                            nextStartTime.current = 0;
                        }
                        
                        if (message.toolCall) {
                            currentToolCalls.current.push(...message.toolCall.functionCalls);
                            for (const fc of message.toolCall.functionCalls) {
                                let result: any = { success: true };
                                let shouldSendResponse = true;

                                if (fc.name === 'getClinicInfo') {
                                    result = await getClinicInfo(fc.args.location);
                                } else if (fc.name === 'rememberUserDetails' && user) {
                                    result = await updateUserProfile(user.uid, fc.args);
                                    setUserProfile(prev => ({...(prev || {}), ...fc.args}));
                                } else if (fc.name === 'openWebsite') {
                                    const url = fc.args.url;
                                    if (url && (String(url).startsWith('http:') || String(url).startsWith('https://'))) {
                                        window.open(url, '_blank');
                                        onShowToast(`Opening ${url}...`);
                                        result = { success: true, message: `Opened ${url}` };
                                    } else {
                                        result = { success: false, message: `Invalid URL: ${url}` };
                                    }
                                } else if (fc.name === 'generateImage') {
                                    shouldSendResponse = false;
                                    try {
                                        const imageUrl = await generateImageViaProxy(fc.args.prompt);
                                        currentGeneratedImage.current = imageUrl;
                                        onShowToast("Image generated successfully!");
                                    } catch(err: unknown) {
                                        console.error(err);
                                        const errorMessage = err instanceof Error ? err.message : String(err);
                                        onShowToast(errorMessage);
                                    }
                                } else if (fc.name === 'createDocument') {
                                    shouldSendResponse = false;
                                    try {
                                        const args = fc.args as any;
                                        const content = args.content;
                                        const fileName = args.fileName ?? 'document.txt';

                                        const blob = new Blob([String(content)], { type: 'text/plain;charset=utf-8' });
                                        const dataUrl = URL.createObjectURL(blob);
                                        
                                        const safeFileName = String(fileName);
                                        currentGeneratedDocument.current = { fileName: safeFileName, dataUrl };
                                        
                                        onShowToast(`Document "${safeFileName}" is ready for download.`);
                                    } catch (err: unknown) {
                                        console.error(err);
                                        const errorMessage = err instanceof Error ? err.message : "Sorry, I couldn't create that document.";
                                        onShowToast(errorMessage);
                                    }
                                }

                                if (shouldSendResponse) {
                                    sessionPromise.then(session => {
                                        session.sendToolResponse({
                                            functionResponses: { id: fc.id, name: fc.name, response: { result } }
                                        });
                                    });
                                }
                            }
                        }
                    },
                    onerror: (e: any) => {
                        console.error('Live session error:', e);
                        const errorMessage = e?.message ? String(e.message) : t('liveErrorConnection');
                        setError(errorMessage);
                        cleanup();
                    },
                    onclose: () => {
                        console.log('Live session closed.');
                        cleanup();
                    },
                }
            });

            sessionPromiseRef.current = sessionPromise;
            const session = await sessionPromise;
            sessionRef.current = session;

        } catch (err: unknown) {
            console.error("Failed to start live session:", err);
            let errorMessage = t('liveErrorConnection');
            if (err instanceof Error) {
                if (err.name === 'NotAllowedError' || err.name === 'NotFoundError') {
                    errorMessage = t('liveErrorMic');
                } else if (err.message.includes("API key not valid")) {
                    errorMessage = t('liveApiKeyErrorInitial');
                } else if (err.message.includes("Invalid API key")) {
                    errorMessage = t('liveApiKeyErrorInvalid');
                } else if (err.message) {
                    errorMessage = err.message;
                }
            } else if (typeof err === 'string') {
                errorMessage = err;
            }
            setError(errorMessage);

            setIsConnecting(false);
            cleanup();
        }
    }, [cleanup, t, user, userProfile, onShowToast]);

    useEffect(() => {
        connect();
        return () => {
            cleanup();
        };
    }, [connect, cleanup]);

    const toggleCamera = async (): Promise<boolean> => {
        if (isCameraOn) {
            videoStreamRef.current?.getTracks().forEach(track => track.stop());
            if (frameIntervalRef.current) {
                window.clearInterval(frameIntervalRef.current);
            }
            setIsCameraOn(false);
            return false;
        } else {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
                videoStreamRef.current = stream;
                if (videoElRef.current) {
                    videoElRef.current.srcObject = stream;
                }
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
        if (frameIntervalRef.current) {
            window.clearInterval(frameIntervalRef.current);
        }
        const FRAME_RATE = 1; // 1 frame per second
        frameIntervalRef.current = window.setInterval(() => {
            const canvas = canvasElRef.current;
            const video = videoElRef.current;
            if (canvas && video && sessionPromiseRef.current) {
                const ctx = canvas.getContext('2d');
                if (!ctx) return;
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                ctx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
                canvas.toBlob(async (blob) => {
                    if (blob) {
                        const base64 = await fileToBase64(new File([blob], "frame.jpeg", { type: 'image/jpeg' }));
                        sessionPromiseRef.current!.then(session => {
                            session.sendRealtimeInput({ media: { data: base64, mimeType: 'image/jpeg' } });
                        });
                    }
                }, 'image/jpeg', 0.8);
            }
        }, 1000 / FRAME_RATE);
    };

    const captureFrame = (): boolean => {
        if (!isCameraOn || !canvasElRef.current || !videoElRef.current) return false;
        
        const canvas = canvasElRef.current;
        const video = videoElRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return false;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        ctx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        currentCapturedImage.current = dataUrl;
        return true;
    };
    
    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !sessionPromiseRef.current) return;

        try {
            const processedFiles = await processFiles(
                [file],
                SUPPORTED_GENERATE_CONTENT_MIME_TYPES,
                (fileName, fileType) => onShowToast(t('toastUnsupportedFile', { fileName, fileType }))
            );
            
            if (processedFiles.length > 0) {
                const attachedFile = processedFiles[0];
                const session = await sessionPromiseRef.current;

                if (attachedFile.textContent) {
                    const textToSend = `A document named "${attachedFile.name}" has been uploaded for context. Please consider its content when responding. Document Content:\n\n${attachedFile.textContent}`;
                    session.sendRealtimeInput({ text: textToSend });
                } else if (attachedFile.base64) {
                    session.sendRealtimeInput({ media: { data: attachedFile.base64, mimeType: attachedFile.mimeType } });
                }
                
                currentAttachmentName.current = attachedFile.name;
                onShowToast(`Sent ${attachedFile.name} to the AI for context.`);
            }
        } catch (err) {
            console.error("Error processing or sending file:", err);
            onShowToast("Failed to process the selected file.");
        }

        e.target.value = '';
    };
    
    const handleSendTextInput = (e: React.FormEvent) => {
        e.preventDefault();
        if (textInputValue.trim() && sessionPromiseRef.current) {
            sessionPromiseRef.current.then(session => {
                session.sendRealtimeInput({ text: textInputValue });
            });
            // Show the user's typed message immediately in the transcript
            setTranscripts(prev => [...prev, { user: textInputValue, bot: '...' }]);
            setTextInputValue('');
        }
    };

    useImperativeHandle(ref, () => ({
        triggerCameraToggle: toggleCamera,
        triggerFrameCapture: captureFrame,
    }));

    if (isConnecting) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-4">
                <LoadingIndicator className="h-8 w-8 text-teal-600 mb-4" />
                <p className="text-gray-600 dark:text-gray-400">{t('liveConnecting')}</p>
            </div>
        );
    }
    
     if (error) {
        return (
             <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
                 <div className="bg-red-50 dark:bg-red-900/20 p-6 rounded-lg max-w-lg">
                    <h3 className="text-lg font-bold text-red-700 dark:text-red-200">{t('liveErrorConnection')}</h3>
                    <p className="mt-2 text-sm text-red-600 dark:text-red-300">{error}</p>
                    <button
                        onClick={connect}
                        className="mt-4 px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-md hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
                    >
                        {t('clickToRetry')}
                    </button>
                 </div>
             </div>
        );
    }

    return (
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 p-4 overflow-hidden">
             <div className="flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg p-4 relative">
                <video ref={videoElRef} autoPlay playsInline muted className={`w-full h-full object-contain rounded-md transition-opacity ${isCameraOn ? 'opacity-100' : 'opacity-0'}`}></video>
                <canvas ref={canvasElRef} className="hidden"></canvas>
                <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept={SUPPORTED_GENERATE_CONTENT_MIME_TYPES.join(',')}/>

                {!isCameraOn && <div className="absolute text-gray-500">{t('liveCameraError')}</div>}
                <div className="absolute bottom-4 flex space-x-2">
                     <button onClick={toggleCamera} aria-label={isCameraOn ? 'Stop camera' : 'Start camera'} className="px-4 py-2 text-sm font-semibold bg-white/80 dark:bg-black/50 backdrop-blur-sm rounded-full hover:bg-white dark:hover:bg-black/70 flex items-center space-x-2">
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                         <span>{isCameraOn ? t('liveStopCamera') : t('liveStartCamera')}</span>
                     </button>
                     {isCameraOn && (
                         <button onClick={captureFrame} aria-label="Capture frame" className="px-4 py-2 text-sm font-semibold bg-white/80 dark:bg-black/50 backdrop-blur-sm rounded-full hover:bg-white dark:hover:bg-black/70 flex items-center space-x-2">
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2-2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                             <span>{t('liveCaptureFrame')}</span>
                         </button>
                     )}
                     <button onClick={() => fileInputRef.current?.click()} aria-label="Attach file" className="px-4 py-2 text-sm font-semibold bg-white/80 dark:bg-black/50 backdrop-blur-sm rounded-full hover:bg-white dark:hover:bg-black/70 flex items-center space-x-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                        <span>Attach File</span>
                     </button>
                </div>
             </div>
            <div className="flex flex-col bg-white dark:bg-gray-800 rounded-lg p-4 overflow-hidden">
                <div className="flex-1 flex flex-col-reverse overflow-y-auto pr-2">
                     {[...transcripts].reverse().map((transcript, i) => (
                        <div key={i} className="mb-3 pb-3 border-b border-gray-200 dark:border-gray-700">
                           {transcript.userImage && <img src={transcript.userImage} alt="User capture" className="w-24 h-auto rounded-md my-2" />}
                           {transcript.attachmentName && (
                                <div className="my-2 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center px-2 py-1 space-x-2 text-sm max-w-full">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 flex-shrink-0 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                                    <span className="text-gray-700 dark:text-gray-300 truncate">Sent file: {transcript.attachmentName}</span>
                                </div>
                           )}
                           <p className="text-sm text-gray-500 dark:text-gray-400"><strong>{t('you')}:</strong> {transcript.user}</p>
                           <p className="text-sm text-teal-600 dark:text-teal-400">
                                <strong>{t('bot')}:</strong> {transcript.bot}
                                {transcript.generatedImageUrl && (
                                    <img src={transcript.generatedImageUrl} alt="Generated by AI" className="mt-2 rounded-lg max-w-xs w-full" />
                                )}
                                {transcript.generatedDocument && (
                                    <a href={transcript.generatedDocument.dataUrl} download={transcript.generatedDocument.fileName} className="mt-2 block w-full text-center px-3 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors">
                                        Download {transcript.generatedDocument.fileName}
                                    </a>
                                )}
                            </p>
                        </div>
                    ))}
                    {/* Current turn */}
                     <div className="border-t border-gray-200 dark:border-gray-700 pt-3 mt-3">
                        <p className="font-bold text-sm text-gray-500 dark:text-gray-400">{t('you')}: <span className="font-normal">{currentInput}</span></p>
                        <p className="font-bold text-sm text-teal-600 dark:text-teal-400">{t('bot')}: <span className="font-normal">{currentOutput}</span></p>
                    </div>
                </div>
                 <form onSubmit={handleSendTextInput} className="mt-4 flex items-center space-x-2">
                    <input 
                        type="text"
                        value={textInputValue}
                        onChange={(e) => setTextInputValue(e.target.value)}
                        placeholder="Type a message..."
                        className="flex-1 w-full bg-gray-100 dark:bg-gray-700 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                    />
                    <button type="submit" className="p-2 rounded-full bg-teal-600 text-white hover:bg-teal-700">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h14M12 5l7 7-7 7" /></svg>
                    </button>
                 </form>
                 <div className="flex flex-col items-center mt-4">
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      {isActive ? t('liveListening') : t('liveSessionEnded')}
                    </p>
                    <Waveform audioContext={inputAudioContextRef.current} mediaStream={audioStreamRef.current} isActive={isActive} />
                 </div>
            </div>
        </div>
    );
});

export default memo(LiveConversation);