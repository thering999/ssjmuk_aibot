import React, { useState, useEffect, useRef, memo, useCallback, forwardRef, useImperativeHandle } from 'react';
import { Modality, Blob, LiveServerMessage } from '@google/genai';
import { encode, decode, decodeAudioData } from '../utils/audioUtils';
import { fileToBase64 } from '../utils/fileUtils';
import { useTranslation } from '../hooks/useTranslation';
import { getAiClient } from '../services/geminiService';
import { clinicFinderTool } from '../tools/clinicFinder';
import { getClinicInfo } from '../services/clinicService';
import { LiveTranscript, LiveConversationHandle } from '../types';
import LoadingIndicator from './LoadingIndicator';
import Waveform from './Waveform';

const LiveConversation = forwardRef<LiveConversationHandle>((props, ref) => {
    const { t } = useTranslation();
    const [isConnecting, setIsConnecting] = useState(true);
    const [isActive, setIsActive] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [transcripts, setTranscripts] = useState<LiveTranscript[]>([]);
    const [currentInput, setCurrentInput] = useState('');
    const [currentOutput, setCurrentOutput] = useState('');
    const [isCameraOn, setIsCameraOn] = useState(false);

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
            
            const ai = getAiClient();
            const sessionPromise = ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                config: {
                    responseModalities: [Modality.AUDIO],
                    inputAudioTranscription: {},
                    outputAudioTranscription: {},
                    tools: [{ functionDeclarations: [clinicFinderTool] }],
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
                            setTranscripts(prev => [...prev, { user: finalInput, bot: finalOutput, userImage: currentCapturedImage.current }]);
                            currentInputText.current = '';
                            currentOutputText.current = '';
                            currentCapturedImage.current = null;
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
                            for (const fc of message.toolCall.functionCalls) {
                                if (fc.name === 'getClinicInfo') {
                                    const result = await getClinicInfo(fc.args.location);
                                    sessionPromise.then(session => {
                                        session.sendToolResponse({
                                            functionResponses: { id: fc.id, name: fc.name, response: { result } }
                                        });
                                    });
                                }
                            }
                        }
                    },
                    // FIX: Robustly handle different error shapes from the `onerror` callback to prevent type errors when setting state.
                    onerror: (e: unknown) => {
                        console.error('Live session error:', e);
                        let errorMessage = t('liveErrorConnection');
                        
                        if (e instanceof Error) {
                            errorMessage = e.message;
                        } else if (typeof e === 'string') {
                            errorMessage = e;
                        } else if (e && typeof e === 'object' && 'message' in e) {
                            errorMessage = String((e as { message: unknown }).message);
                        }
                        
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
            // FIX: Improve error handling to provide more specific feedback instead of a generic message.
            let errorMessage = t('liveErrorConnection');
            if (err instanceof Error) {
                if (err.name === 'NotAllowedError' || err.name === 'NotFoundError') {
                    errorMessage = t('liveErrorMic');
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
    }, [cleanup, t]);

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
        if (!isCameraOn || !canvasElRef.current) return false;
        const dataUrl = canvasElRef.current.toDataURL('image/jpeg', 0.9);
        currentCapturedImage.current = dataUrl;
        return true;
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
                {!isCameraOn && <div className="absolute text-gray-500">{t('liveCameraError')}</div>}
                <div className="absolute bottom-4 flex space-x-2">
                     <button onClick={toggleCamera} className="px-4 py-2 text-sm font-semibold bg-white/80 dark:bg-black/50 backdrop-blur-sm rounded-full hover:bg-white dark:hover:bg-black/70">
                         {isCameraOn ? t('liveStopCamera') : t('liveStartCamera')}
                     </button>
                     {isCameraOn && (
                         <button onClick={captureFrame} className="px-4 py-2 text-sm font-semibold bg-white/80 dark:bg-black/50 backdrop-blur-sm rounded-full hover:bg-white dark:hover:bg-black/70">
                             {t('liveCaptureFrame')}
                         </button>
                     )}
                </div>
             </div>
            <div className="flex flex-col bg-white dark:bg-gray-800 rounded-lg p-4 overflow-hidden">
                <div className="flex-1 flex flex-col-reverse overflow-y-auto pr-2">
                    {/* Current turn */}
                     <div className="border-t border-gray-200 dark:border-gray-700 pt-3 mt-3">
                        <p className="font-bold text-sm text-gray-500 dark:text-gray-400">{t('you')}: <span className="font-normal">{currentInput}</span></p>
                        <p className="font-bold text-sm text-teal-600 dark:text-teal-400">{t('bot')}: <span className="font-normal">{currentOutput}</span></p>
                    </div>
                     {[...transcripts].reverse().map((transcript, i) => (
                        <div key={i} className="mb-3 pb-3 border-b border-gray-200 dark:border-gray-700">
                           {transcript.userImage && <img src={transcript.userImage} alt="User capture" className="w-24 h-auto rounded-md my-2" />}
                           <p className="text-sm text-gray-500 dark:text-gray-400"><strong>{t('you')}:</strong> {transcript.user}</p>
                           <p className="text-sm text-teal-600 dark:text-teal-400"><strong>{t('bot')}:</strong> {transcript.bot}</p>
                        </div>
                    ))}
                </div>
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