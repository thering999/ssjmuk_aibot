import React, { useState, useEffect, useRef, memo } from 'react';
import { Modality, Blob, LiveServerMessage } from '@google/genai';
import { encode, decode, decodeAudioData } from '../utils/audioUtils';
import { useTranslation } from '../hooks/useTranslation';
import { ai } from '../services/geminiService';
import { clinicFinderTool } from '../tools/clinicFinder';
import { getClinicInfo } from '../services/clinicService';
import Waveform from './Waveform';

const LiveConversation: React.FC = () => {
    const { t } = useTranslation();
    const [isConnecting, setIsConnecting] = useState(true);
    const [isActive, setIsActive] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [transcripts, setTranscripts] = useState<{ user: string, bot: string }[]>([]);
    const [currentInput, setCurrentInput] = useState('');
    const [currentOutput, setCurrentOutput] = useState('');

    const sessionRef = useRef<any | null>(null);
    const inputAudioContextRef = useRef<AudioContext | null>(null);
    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const processorRef = useRef<ScriptProcessorNode | null>(null);
    const nextStartTime = useRef(0);
    const sourcesRef = useRef(new Set<AudioBufferSourceNode>());
    const currentInputText = useRef('');
    const currentOutputText = useRef('');


    useEffect(() => {
        const setup = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                mediaStreamRef.current = stream;

                inputAudioContextRef.current = new ((window as any).AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
                outputAudioContextRef.current = new ((window as any).AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
                
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
                            processorRef.current = processor;
                            processor.onaudioprocess = (e) => {
                                const inputData = e.inputBuffer.getChannelData(0);
                                const pcmBlob: Blob = createBlob(inputData);
                                sessionPromise.then(session => session.sendRealtimeInput({ media: pcmBlob }));
                            };
                            source.connect(processor);
                            processor.connect(inputAudioContextRef.current!.destination);
                        },
                        onmessage: async (msg: LiveServerMessage) => {
                            if (msg.serverContent?.inputTranscription) {
                                const text = msg.serverContent.inputTranscription.text;
                                currentInputText.current += text;
                                setCurrentInput(currentInputText.current);
                            }
                            if (msg.serverContent?.outputTranscription) {
                                const text = msg.serverContent.outputTranscription.text;
                                currentOutputText.current += text;
                                setCurrentOutput(currentOutputText.current);
                            }
                            
                             if (msg.toolCall) {
                                for (const call of msg.toolCall.functionCalls) {
                                    if (call.name === 'getClinicInfo') {
                                        const toolMessage = `\n*[${t('callingTool', { toolName: call.name })}: ${JSON.stringify(call.args)}]*`;
                                        currentOutputText.current += toolMessage;
                                        setCurrentOutput(currentOutputText.current);

                                        // Fix: Cast `call.args.location` to string to satisfy `getClinicInfo`'s type requirement.
                                        const result = await getClinicInfo(call.args.location as string);
                                        
                                        sessionPromise.then((session) => {
                                            session.sendToolResponse({
                                                functionResponses: {
                                                    id: call.id,
                                                    name: call.name,
                                                    response: { result: result },
                                                }
                                            });
                                        });
                                    }
                                }
                            }

                            if (msg.serverContent?.turnComplete) {
                                if (currentInputText.current || currentOutputText.current) {
                                    setTranscripts(prev => [...prev, { user: currentInputText.current, bot: currentOutputText.current }]);
                                }
                                currentInputText.current = '';
                                currentOutputText.current = '';
                                setCurrentInput('');
                                setCurrentOutput('');
                            }

                            const audioData = msg.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
                            if (audioData && outputAudioContextRef.current) {
                                const outputAudioContext = outputAudioContextRef.current;
                                nextStartTime.current = Math.max(
                                  nextStartTime.current,
                                  outputAudioContext.currentTime,
                                );
                                const audioBuffer = await decodeAudioData(decode(audioData), outputAudioContext, 24000, 1);
                                const source = outputAudioContext.createBufferSource();
                                source.buffer = audioBuffer;
                                source.connect(outputAudioContext.destination);
                                source.addEventListener('ended', () => {
                                    sourcesRef.current.delete(source);
                                });
                                source.start(nextStartTime.current);
                                nextStartTime.current += audioBuffer.duration;
                                sourcesRef.current.add(source);
                            }
                            
                            if (msg.serverContent?.interrupted) {
                                for (const source of sourcesRef.current.values()) {
                                    source.stop();
                                }
                                sourcesRef.current.clear();
                                nextStartTime.current = 0;
                            }
                        },
                        onerror: (e) => { setError(t('liveErrorConnection')); console.error(e); setIsActive(false); },
                        onclose: () => { setIsActive(false); }
                    }
                });
                sessionRef.current = await sessionPromise;
            } catch (err) {
                console.error(err);
                setError(t('liveErrorMic'));
                setIsConnecting(false);
            }
        };

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
        }

        setup();

        return () => {
            sessionRef.current?.close();
            mediaStreamRef.current?.getTracks().forEach(track => track.stop());
            if (inputAudioContextRef.current?.state !== 'closed') {
                inputAudioContextRef.current?.close().catch(console.error);
            }
            if (outputAudioContextRef.current?.state !== 'closed') {
                outputAudioContextRef.current?.close().catch(console.error);
            }
            processorRef.current?.disconnect();
        };
    }, [t]);

    const getStatus = () => {
        if (isConnecting) return t('liveConnecting');
        if (error) return error;
        if (isActive) return t('liveListening');
        return t('liveSessionEnded');
    };

    return (
        <div className="flex-1 flex flex-col pt-12 p-4 overflow-y-auto items-center bg-gray-100 dark:bg-gray-900">
            <div className={`w-24 h-24 rounded-full flex items-center justify-center transition-colors ${isActive ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
            </div>
             <Waveform 
                audioContext={inputAudioContextRef.current} 
                mediaStream={mediaStreamRef.current} 
                isActive={isActive} 
            />
            <p className="mt-4 text-lg font-medium text-gray-700 dark:text-gray-300">{getStatus()}</p>
            <div className="w-full max-w-2xl mt-6 space-y-4 prose prose-sm dark:prose-invert">
                {transcripts.map((transcript, i) => (
                    <div key={i}>
                        <p><strong className="text-teal-700 dark:text-teal-400">{t('you')}:</strong> {transcript.user}</p>
                        <p><strong className="text-blue-700 dark:text-blue-400">{t('bot')}:</strong> {transcript.bot}</p>
                    </div>
                ))}
                {currentInput && <p><strong className="text-teal-700 dark:text-teal-400">{t('you')}:</strong> <span className="text-gray-500 dark:text-gray-400">{currentInput}</span></p>}
                {currentOutput && <p><strong className="text-blue-700 dark:text-blue-400">{t('bot')}:</strong> <span className="text-gray-500 dark:text-gray-400" dangerouslySetInnerHTML={{ __html: currentOutput.replace(/\n/g, '<br />') }}></span></p>}
            </div>
        </div>
    );
};

export default memo(LiveConversation);