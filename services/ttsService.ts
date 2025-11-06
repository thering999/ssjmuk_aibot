import { Modality } from "@google/genai";
import { decode, decodeAudioData } from '../utils/audioUtils';
import { ai } from './geminiService';

let audioContext: AudioContext | null = null;
let currentSource: AudioBufferSourceNode | null = null;

const getAudioContext = (): AudioContext => {
  if (!audioContext || audioContext.state === 'closed') {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
  }
  return audioContext;
};

export const stopTts = () => {
  if (currentSource) {
    currentSource.stop();
    currentSource = null;
  }
};

export const textToSpeech = async (text: string): Promise<void> => {
  stopTts(); // Stop any currently playing audio

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Say: ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      const outputAudioContext = getAudioContext();
      const outputNode = outputAudioContext.createGain();
      outputNode.connect(outputAudioContext.destination);

      const audioBuffer = await decodeAudioData(
        decode(base64Audio),
        outputAudioContext,
        24000,
        1,
      );
      
      const source = outputAudioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(outputNode);
      source.start();
      currentSource = source;
      source.onended = () => {
        if (currentSource === source) {
            currentSource = null;
        }
      };
    } else {
      throw new Error("TTS failed: No audio data in response.");
    }
  } catch (error) {
    console.error("Error in text-to-speech service:", error);
    throw error;
  }
};

export const isTtsSupported = () => {
    return typeof window !== 'undefined' && (!!window.AudioContext || !!(window as any).webkitAudioContext);
};
